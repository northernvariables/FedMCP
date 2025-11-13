"""Hansard statements and documents ingestion from OpenParliament PostgreSQL."""

from typing import Optional, Dict, Any
from pathlib import Path
from datetime import datetime
import re

from ..utils.neo4j_client import Neo4jClient
from ..utils.postgres_client import PostgresClient
from ..utils.progress import logger, ProgressTracker
from ..utils.keyword_extraction import extract_document_keywords


# Data Quality Utilities
# ----------------------

def is_valid_date(date_value) -> bool:
    """
    Check if a date is valid (not corrupted).

    Filters out dates with year > 3000 (likely data entry errors).

    Args:
        date_value: Date object or string

    Returns:
        True if date is valid, False otherwise
    """
    if date_value is None:
        return False

    try:
        if isinstance(date_value, str):
            date_obj = datetime.fromisoformat(date_value)
        else:
            date_obj = date_value

        # Filter out corrupted dates (year 4043, etc.)
        return 1900 <= date_obj.year <= 3000
    except (ValueError, AttributeError):
        return False


def strip_html_tags(text: Optional[str]) -> Optional[str]:
    """
    Remove HTML tags from text content.

    Preserves line breaks by converting <p> and <br> to newlines.

    Args:
        text: HTML text content

    Returns:
        Clean text without HTML tags
    """
    if not text:
        return text

    # Convert paragraphs and breaks to newlines
    text = re.sub(r'<p[^>]*>', '\n\n', text)
    text = re.sub(r'</p>', '', text)
    text = re.sub(r'<br\s*/?\s*>', '\n', text, flags=re.IGNORECASE)

    # Remove all other HTML tags
    text = re.sub(r'<[^>]+>', '', text)

    # Decode common HTML entities
    text = text.replace('&amp;', '&')
    text = text.replace('&lt;', '<')
    text = text.replace('&gt;', '>')
    text = text.replace('&quot;', '"')
    text = text.replace('&#39;', "'")
    text = text.replace('&nbsp;', ' ')

    # Clean up excessive whitespace
    text = re.sub(r'\n\s*\n\s*\n+', '\n\n', text)  # Max 2 consecutive newlines
    text = re.sub(r' +', ' ', text)  # Multiple spaces to single space

    return text.strip()


def sanitize_statement_content(statement_data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Sanitize statement data for display.

    Removes HTML tags, validates dates, and cleans up content.

    Args:
        statement_data: Raw statement data dictionary

    Returns:
        Sanitized statement data dictionary
    """
    # Strip HTML from content fields
    if 'content_en' in statement_data:
        statement_data['content_en'] = strip_html_tags(statement_data['content_en'])

    if 'content_fr' in statement_data:
        statement_data['content_fr'] = strip_html_tags(statement_data['content_fr'])

    # Strip HTML from header fields
    for field in ['h1_en', 'h2_en', 'h3_en', 'h1_fr', 'h2_fr', 'h3_fr']:
        if field in statement_data and statement_data[field]:
            statement_data[field] = strip_html_tags(statement_data[field])

    # Validate and filter date
    if 'time' in statement_data:
        if not is_valid_date(statement_data['time']):
            logger.warning(f"Invalid date for statement {statement_data.get('id')}: {statement_data['time']}")
            statement_data['time'] = None

    return statement_data


def ingest_hansard_documents(
    neo4j_client: Neo4jClient,
    postgres_client: PostgresClient,
    batch_size: int = 1000,
    limit: Optional[int] = None,
) -> int:
    """
    Ingest Hansard documents from PostgreSQL to Neo4j.

    Documents group statements into debate sessions or committee evidence sessions.

    Args:
        neo4j_client: Neo4j client instance
        postgres_client: PostgreSQL client instance
        batch_size: Batch size for Neo4j operations
        limit: Optional limit for sample imports (None = all documents)

    Returns:
        Number of documents created
    """
    logger.info("Ingesting Hansard documents from PostgreSQL...")

    # Build query
    query = """
        SELECT
            id,
            date,
            number,
            session_id,
            document_type,
            source_id,
            downloaded,
            public,
            xml_source_url
        FROM hansards_document
        ORDER BY date DESC
    """

    if limit:
        query += f" LIMIT {limit}"

    # Fetch documents
    documents = postgres_client.execute_query(query)
    logger.info(f"Fetched {len(documents):,} Hansard documents from PostgreSQL")

    if not documents:
        logger.warning("No Hansard documents found")
        return 0

    # Prepare data for batch insert
    documents_data = []
    for doc in documents:
        documents_data.append({
            "id": doc["id"],
            "date": doc["date"].isoformat() if doc["date"] else None,
            "number": doc["number"],
            "session_id": doc["session_id"],
            "document_type": doc["document_type"],  # D=debates, E=evidence
            "source_id": doc["source_id"],
            "downloaded": doc["downloaded"],
            "public": doc["public"],
            "xml_source_url": doc["xml_source_url"],
        })

    # Create nodes in Neo4j
    tracker = ProgressTracker(total=len(documents_data), desc="Creating Document nodes")

    # Use UNWIND for efficient batch insert
    cypher = """
        UNWIND $documents AS doc
        MERGE (d:Document {id: doc.id})
        SET d.date = doc.date,
            d.number = doc.number,
            d.session_id = doc.session_id,
            d.document_type = doc.document_type,
            d.source_id = doc.source_id,
            d.downloaded = doc.downloaded,
            d.public = doc.public,
            d.xml_source_url = doc.xml_source_url,
            d.updated_at = datetime()
        RETURN count(d) as created
    """

    # Process in batches
    created_total = 0
    for i in range(0, len(documents_data), batch_size):
        batch = documents_data[i:i + batch_size]
        result = neo4j_client.run_query(cypher, {"documents": batch})
        created = result[0]["created"] if result else 0
        created_total += created
        tracker.update(len(batch))

    tracker.close()
    logger.info(f"Created {created_total:,} Document nodes in Neo4j")

    return created_total


def ingest_hansard_statements(
    neo4j_client: Neo4jClient,
    postgres_client: PostgresClient,
    batch_size: int = 5000,
    limit: Optional[int] = None,
) -> int:
    """
    Ingest Hansard statements from PostgreSQL to Neo4j.

    Statements are individual speeches/interventions by MPs in debates or committees.

    Args:
        neo4j_client: Neo4j client instance
        postgres_client: PostgreSQL client instance
        batch_size: Batch size for Neo4j operations (larger for statements)
        limit: Optional limit for sample imports (None = all statements)

    Returns:
        Number of statements created
    """
    logger.info("Ingesting Hansard statements from PostgreSQL...")

    # Build query - get most recent statements first
    query = """
        SELECT
            id,
            document_id,
            time,
            politician_id,
            member_id,
            who_en,
            who_fr,
            content_en,
            content_fr,
            h1_en,
            h1_fr,
            h2_en,
            h2_fr,
            h3_en,
            h3_fr,
            statement_type,
            wordcount,
            procedural,
            bill_debated_id,
            bill_debate_stage,
            slug
        FROM hansards_statement
        ORDER BY time DESC
    """

    if limit:
        query += f" LIMIT {limit}"

    # Fetch statements
    logger.info("Fetching statements from PostgreSQL...")
    statements = postgres_client.execute_query(query)
    logger.info(f"Fetched {len(statements):,} Hansard statements from PostgreSQL")

    if not statements:
        logger.warning("No Hansard statements found")
        return 0

    # Prepare data for batch insert
    statements_data = []
    for stmt in statements:
        # Build raw statement data
        statement_data = {
            "id": stmt["id"],
            "document_id": stmt["document_id"],
            "time": stmt["time"],  # Don't convert yet, sanitize_statement_content handles it
            "politician_id": stmt["politician_id"],
            "member_id": stmt["member_id"],
            "who_en": stmt["who_en"],
            "who_fr": stmt["who_fr"],
            "content_en": stmt["content_en"] or "",
            "content_fr": stmt["content_fr"] or "",
            "h1_en": stmt["h1_en"],
            "h1_fr": stmt["h1_fr"],
            "h2_en": stmt["h2_en"],
            "h2_fr": stmt["h2_fr"],
            "h3_en": stmt["h3_en"],
            "h3_fr": stmt["h3_fr"],
            "statement_type": stmt["statement_type"],
            "wordcount": stmt["wordcount"],
            "procedural": stmt["procedural"],
            "bill_debated_id": stmt["bill_debated_id"],
            "bill_debate_stage": stmt["bill_debate_stage"],
            "slug": stmt["slug"],
        }

        # Sanitize content (strip HTML, validate dates)
        statement_data = sanitize_statement_content(statement_data)

        # Convert time to ISO format after sanitization
        if statement_data["time"]:
            statement_data["time"] = statement_data["time"].isoformat()

        statements_data.append(statement_data)

    # Create nodes in Neo4j
    tracker = ProgressTracker(total=len(statements_data), desc="Creating Statement nodes")

    # Use UNWIND for efficient batch insert
    cypher = """
        UNWIND $statements AS stmt
        MERGE (s:Statement {id: stmt.id})
        SET s.document_id = stmt.document_id,
            s.time = stmt.time,
            s.politician_id = stmt.politician_id,
            s.member_id = stmt.member_id,
            s.who_en = stmt.who_en,
            s.who_fr = stmt.who_fr,
            s.content_en = stmt.content_en,
            s.content_fr = stmt.content_fr,
            s.h1_en = stmt.h1_en,
            s.h1_fr = stmt.h1_fr,
            s.h2_en = stmt.h2_en,
            s.h2_fr = stmt.h2_fr,
            s.h3_en = stmt.h3_en,
            s.h3_fr = stmt.h3_fr,
            s.statement_type = stmt.statement_type,
            s.wordcount = stmt.wordcount,
            s.procedural = stmt.procedural,
            s.bill_debated_id = stmt.bill_debated_id,
            s.bill_debate_stage = stmt.bill_debate_stage,
            s.slug = stmt.slug,
            s.updated_at = datetime()
        RETURN count(s) as created
    """

    # Process in batches
    created_total = 0
    for i in range(0, len(statements_data), batch_size):
        batch = statements_data[i:i + batch_size]
        result = neo4j_client.run_query(cypher, {"statements": batch})
        created = result[0]["created"] if result else 0
        created_total += created
        tracker.update(len(batch))

    tracker.close()
    logger.info(f"Created {created_total:,} Statement nodes in Neo4j")

    return created_total


def link_statements_to_mps(
    neo4j_client: Neo4jClient,
    batch_size: int = 10000,
) -> int:
    """
    Create MADE_BY relationships between Statements and MPs.

    Links statements to the MPs who made them using politician_id.
    Matches Statement.politician_id (OpenParliament ID) to MP.openparliament_politician_id.

    Args:
        neo4j_client: Neo4j client instance
        batch_size: Batch size for relationship creation

    Returns:
        Number of relationships created
    """
    logger.info("Linking statements to MPs...")

    cypher = """
        MATCH (s:Statement)
        WHERE s.politician_id IS NOT NULL
          AND NOT exists((s)-[:MADE_BY]->())
        WITH s LIMIT $batch_size

        MATCH (mp:MP)
        WHERE mp.openparliament_politician_id = s.politician_id

        MERGE (s)-[:MADE_BY]->(mp)
        RETURN count(*) as created
    """

    total_created = 0
    while True:
        result = neo4j_client.run_query(cypher, {"batch_size": batch_size})
        created = result[0]["created"] if result else 0

        if created == 0:
            break

        total_created += created
        logger.info(f"Progress: {total_created:,} MADE_BY relationships created")

    logger.info(f"Created {total_created:,} MADE_BY relationships")
    return total_created


def link_statements_to_documents(
    neo4j_client: Neo4jClient,
    batch_size: int = 10000,
) -> int:
    """
    Create PART_OF relationships between Statements and Documents.

    Args:
        neo4j_client: Neo4j client instance
        batch_size: Batch size for relationship creation

    Returns:
        Number of relationships created
    """
    logger.info("Linking statements to documents...")

    cypher = """
        MATCH (s:Statement)
        WHERE s.document_id IS NOT NULL
          AND NOT exists((s)-[:PART_OF]->())
        WITH s LIMIT $batch_size

        MATCH (d:Document {id: s.document_id})

        MERGE (s)-[:PART_OF]->(d)
        RETURN count(*) as created
    """

    total_created = 0
    while True:
        result = neo4j_client.run_query(cypher, {"batch_size": batch_size})
        created = result[0]["created"] if result else 0

        if created == 0:
            break

        total_created += created
        logger.info(f"Progress: {total_created:,} PART_OF relationships created")

    logger.info(f"Created {total_created:,} PART_OF relationships")
    return total_created


def link_statements_to_bills(
    neo4j_client: Neo4jClient,
    batch_size: int = 10000,
) -> int:
    """
    Create MENTIONS relationships between Statements and Bills.

    Links statements to bills they debated or mentioned.
    Matches Statement.bill_debated_id (OpenParliament ID) to Bill.openparliament_bill_id.

    Args:
        neo4j_client: Neo4j client instance
        batch_size: Batch size for relationship creation

    Returns:
        Number of relationships created
    """
    logger.info("Linking statements to bills...")

    cypher = """
        MATCH (s:Statement)
        WHERE s.bill_debated_id IS NOT NULL
          AND NOT exists((s)-[:MENTIONS]->())
        WITH s LIMIT $batch_size

        MATCH (b:Bill)
        WHERE b.openparliament_bill_id = s.bill_debated_id

        MERGE (s)-[r:MENTIONS]->(b)
        SET r.debate_stage = s.bill_debate_stage
        RETURN count(*) as created
    """

    total_created = 0
    while True:
        result = neo4j_client.run_query(cypher, {"batch_size": batch_size})
        created = result[0]["created"] if result else 0

        if created == 0:
            break

        total_created += created
        logger.info(f"Progress: {total_created:,} MENTIONS relationships created")

    logger.info(f"Created {total_created:,} MENTIONS relationships")
    return total_created


def create_hansard_indexes(neo4j_client: Neo4jClient) -> None:
    """
    Create indexes for efficient Hansard queries.

    Creates:
    - Full-text indexes on Statement.content_en and Statement.content_fr
    - Regular indexes on Statement(document_id, time)
    - Index on Document.date

    Args:
        neo4j_client: Neo4j client instance
    """
    logger.info("Creating Hansard indexes...")

    # Full-text index on English content
    try:
        neo4j_client.run_query("""
            CREATE FULLTEXT INDEX statement_content_en IF NOT EXISTS
            FOR (s:Statement)
            ON EACH [s.content_en]
        """)
        logger.info("Created full-text index on Statement.content_en")
    except Exception as e:
        logger.warning(f"Could not create statement_content_en index: {e}")

    # Full-text index on French content
    try:
        neo4j_client.run_query("""
            CREATE FULLTEXT INDEX statement_content_fr IF NOT EXISTS
            FOR (s:Statement)
            ON EACH [s.content_fr]
        """)
        logger.info("Created full-text index on Statement.content_fr")
    except Exception as e:
        logger.warning(f"Could not create statement_content_fr index: {e}")

    # Composite index for statement lookups by document and time
    try:
        neo4j_client.run_query("""
            CREATE INDEX statement_document_time IF NOT EXISTS
            FOR (s:Statement)
            ON (s.document_id, s.time)
        """)
        logger.info("Created composite index on Statement(document_id, time)")
    except Exception as e:
        logger.warning(f"Could not create statement_document_time index: {e}")

    # Index on document date
    try:
        neo4j_client.run_query("""
            CREATE INDEX document_date IF NOT EXISTS
            FOR (d:Document)
            ON (d.date)
        """)
        logger.info("Created index on Document.date")
    except Exception as e:
        logger.warning(f"Could not create document_date index: {e}")

    logger.info("Hansard indexes created successfully")


def extract_hansard_keywords(
    neo4j_client: Neo4jClient,
    session_id: Optional[str] = None,
    limit: Optional[int] = None,
    top_n: int = 20
) -> int:
    """
    Extract and populate keywords for Hansard documents using TF-IDF.

    Processes documents by session to build proper corpus for keyword weighting.

    Args:
        neo4j_client: Neo4j client instance
        session_id: Optional specific session to process (e.g., "45-1")
        limit: Optional limit for number of documents to process
        top_n: Number of keywords to extract per document

    Returns:
        Number of documents updated with keywords
    """
    logger.info("Extracting keywords for Hansard documents...")

    # Get sessions to process
    if session_id:
        sessions_query = """
            MATCH (d:Document {session_id: $session_id})
            WHERE d.public = true
            RETURN DISTINCT d.session_id as session_id
        """
        sessions = neo4j_client.run_query(sessions_query, {"session_id": session_id})
    else:
        sessions_query = """
            MATCH (d:Document)
            WHERE d.public = true AND d.session_id IS NOT NULL
            RETURN DISTINCT d.session_id as session_id
            ORDER BY session_id DESC
        """
        sessions = neo4j_client.run_query(sessions_query)

    total_updated = 0

    for session_row in sessions:
        session = session_row['session_id']
        logger.info(f"Processing session {session}...")

        # Get all documents in session
        docs_query = """
            MATCH (d:Document {session_id: $session_id})
            WHERE d.public = true
            RETURN d.id as doc_id
            ORDER BY d.date DESC
        """
        if limit and not session_id:
            docs_query += f" LIMIT {limit}"

        documents = neo4j_client.run_query(docs_query, {"session_id": session})

        if not documents:
            continue

        doc_ids = [doc['doc_id'] for doc in documents]
        logger.info(f"  Processing {len(doc_ids)} documents in session {session}")

        # Get all statement text for corpus
        corpus_query = """
            MATCH (d:Document)<-[:PART_OF]-(s:Statement)
            WHERE d.id IN $doc_ids
              AND s.procedural = false
            RETURN d.id as doc_id,
                   collect(COALESCE(s.content_en, '')) as contents_en,
                   collect(COALESCE(s.content_fr, '')) as contents_fr
        """
        result = neo4j_client.run_query(corpus_query, {"doc_ids": doc_ids})

        # Build document texts and corpus
        doc_texts = {}
        corpus_en = []
        corpus_fr = []

        for row in result:
            text_en = ' '.join([c for c in row['contents_en'] if c])
            text_fr = ' '.join([c for c in row['contents_fr'] if c])

            doc_texts[row['doc_id']] = {
                'text_en': text_en,
                'text_fr': text_fr
            }

            if text_en:
                corpus_en.append({'text': text_en})
            if text_fr:
                corpus_fr.append({'text': text_fr})

        logger.info(f"  Corpus: {len(corpus_en)} EN docs, {len(corpus_fr)} FR docs")

        # Extract keywords for each document
        tracker = ProgressTracker(
            total=len(doc_texts),
            desc=f"Extracting keywords ({session})"
        )

        for doc_id, texts in doc_texts.items():
            # Extract keywords
            keywords_en, keywords_fr = extract_document_keywords(
                texts['text_en'],
                texts['text_fr'],
                corpus_en,
                corpus_fr,
                top_n=top_n
            )

            # Update document
            neo4j_client.run_query("""
                MATCH (d:Document {id: $doc_id})
                SET d.keywords_en = $keywords_en,
                    d.keywords_fr = $keywords_fr,
                    d.updated_at = datetime()
            """, {
                "doc_id": doc_id,
                "keywords_en": keywords_en,
                "keywords_fr": keywords_fr
            })

            total_updated += 1
            tracker.update(1)

        tracker.close()

    logger.success(f"✅ Extracted keywords for {total_updated} documents")
    return total_updated


def ingest_hansard_sample(
    neo4j_client: Neo4jClient,
    postgres_client: PostgresClient,
    statement_limit: int = 1000,
) -> Dict[str, int]:
    """
    Import a sample of Hansard data for testing.

    Args:
        neo4j_client: Neo4j client instance
        postgres_client: PostgreSQL client instance
        statement_limit: Number of recent statements to import

    Returns:
        Dictionary with counts of created nodes and relationships
    """
    logger.info(f"=" * 80)
    logger.info(f"HANSARD SAMPLE IMPORT ({statement_limit:,} statements)")
    logger.info(f"=" * 80)

    results = {}

    # Get unique document IDs from sample statements
    # First get the most recent statements, then extract unique document IDs
    query = f"""
        SELECT document_id, time
        FROM hansards_statement
        ORDER BY time DESC
        LIMIT {statement_limit}
    """
    statements = postgres_client.execute_query(query)
    # Extract unique document IDs
    document_ids = list(set(row["document_id"] for row in statements))

    logger.info(f"Sample covers {len(document_ids)} documents")

    # Import documents for these statements
    doc_query = f"""
        SELECT
            id, date, number, session_id, document_type,
            source_id, downloaded, public, xml_source_url
        FROM hansards_document
        WHERE id IN ({','.join(map(str, document_ids))})
    """
    documents = postgres_client.execute_query(doc_query)

    # Create documents
    results["documents"] = ingest_hansard_documents(
        neo4j_client,
        postgres_client,
        limit=None,  # We've already filtered
    )

    # Import statements
    results["statements"] = ingest_hansard_statements(
        neo4j_client,
        postgres_client,
        limit=statement_limit,
    )

    # Create relationships
    results["made_by_links"] = link_statements_to_mps(neo4j_client)
    results["part_of_links"] = link_statements_to_documents(neo4j_client)
    results["mentions_links"] = link_statements_to_bills(neo4j_client)

    # Create indexes
    create_hansard_indexes(neo4j_client)

    logger.info(f"=" * 80)
    logger.info(f"HANSARD SAMPLE IMPORT COMPLETE")
    logger.info(f"Documents: {results['documents']:,}")
    logger.info(f"Statements: {results['statements']:,}")
    logger.info(f"MP links: {results['made_by_links']:,}")
    logger.info(f"Document links: {results['part_of_links']:,}")
    logger.info(f"Bill mentions: {results['mentions_links']:,}")
    logger.info(f"=" * 80)

    return results


def ingest_hansard_full(
    neo4j_client: Neo4jClient,
    postgres_client: PostgresClient,
) -> Dict[str, int]:
    """
    Import ALL Hansard data from PostgreSQL to Neo4j.

    This is a long-running operation (2-3 hours for 3.67M statements).

    Args:
        neo4j_client: Neo4j client instance
        postgres_client: PostgreSQL client instance

    Returns:
        Dictionary with counts of created nodes and relationships
    """
    logger.info(f"=" * 80)
    logger.info(f"HANSARD FULL IMPORT (ALL DATA)")
    logger.info(f"WARNING: This will take 2-3 hours for 3.67M statements")
    logger.info(f"=" * 80)

    results = {}

    # Import all documents
    results["documents"] = ingest_hansard_documents(
        neo4j_client,
        postgres_client,
        limit=None,
    )

    # Import all statements
    results["statements"] = ingest_hansard_statements(
        neo4j_client,
        postgres_client,
        limit=None,
    )

    # Create relationships
    results["made_by_links"] = link_statements_to_mps(neo4j_client)
    results["part_of_links"] = link_statements_to_documents(neo4j_client)
    results["mentions_links"] = link_statements_to_bills(neo4j_client)

    # Create indexes (will take 30-60 minutes for full-text indexes)
    create_hansard_indexes(neo4j_client)

    logger.info(f"=" * 80)
    logger.info(f"HANSARD FULL IMPORT COMPLETE")
    logger.info(f"Documents: {results['documents']:,}")
    logger.info(f"Statements: {results['statements']:,}")
    logger.info(f"MP links: {results['made_by_links']:,}")
    logger.info(f"Document links: {results['part_of_links']:,}")
    logger.info(f"Bill mentions: {results['mentions_links']:,}")
    logger.info(f"=" * 80)

    return results
