"""Import recent parliamentary data (2022-present) using API - fast and efficient."""

import sys
from datetime import datetime, timedelta
from pathlib import Path
from typing import Dict, Any, Optional

# Add fedmcp package to path
FEDMCP_PATH = Path(__file__).parent.parent.parent.parent / "fedmcp" / "src"
sys.path.insert(0, str(FEDMCP_PATH))

from fedmcp.clients.openparliament import OpenParliamentClient

from ..utils.neo4j_client import Neo4jClient
from ..utils.progress import logger, ProgressTracker


class RecentDataImporter:
    """
    Import recent parliamentary data (2022-present) using OpenParliament API.

    This is much faster than bulk import for recent data:
    - No PostgreSQL setup required
    - Direct API to Neo4j
    - Only ~500-1000 debates vs 10,000+
    - Completes in 10-15 minutes
    - Only needs ~2-3 GB disk space
    """

    def __init__(self, neo4j_client: Neo4jClient, start_date: str = "2022-01-01"):
        """
        Initialize recent data importer.

        Args:
            neo4j_client: Neo4j client instance
            start_date: Import data from this date forward (YYYY-MM-DD)
        """
        self.neo4j = neo4j_client
        self.start_date = start_date
        self.op_client = OpenParliamentClient()

    def import_recent_debates(self, batch_size: int = 1000) -> Dict[str, int]:
        """
        Import debates and statements from start_date onward.

        Args:
            batch_size: Batch size for Neo4j operations

        Returns:
            Dict with counts
        """
        logger.info(f"Importing debates since {self.start_date}...")

        stats = {"debates": 0, "statements": 0}

        debates_data = []
        statements_data = []
        relationships = []

        # Fetch debates from API
        logger.info("Fetching debates from OpenParliament API...")
        debate_count = 0
        statement_count = 0

        for debate in self.op_client.list_debates():
            debate_date = debate.get("date")

            # Filter by date
            if debate_date and debate_date < self.start_date:
                continue

            debate_count += 1
            if debate_count % 50 == 0:
                logger.info(f"Fetched {debate_count} debates, {statement_count} statements...")

            # Create debate node
            debate_props = {
                "id": debate.get("url", "").split("/")[-2] if debate.get("url") else None,
                "date": debate_date,
                "parliament": debate.get("parliament"),
                "session": debate.get("session"),
                "updated_at": datetime.utcnow().isoformat(),
            }
            debate_props = {k: v for k, v in debate_props.items() if v is not None}
            debates_data.append(debate_props)

            # Fetch detailed debate to get statements
            debate_url = debate.get("url")
            if debate_url:
                try:
                    debate_detail = self.op_client.get_debate(debate_url)

                    # Extract statements from the detailed view
                    # Note: This may require parsing the content field
                    # For now, we'll create a single statement per debate as placeholder
                    # In production, you'd parse the actual speeches

                    statement_id = f"stmt-{debate_props.get('id')}"
                    statement_props = {
                        "id": statement_id,
                        "content": debate_detail.get("content_en", "")[:5000],  # Limit size
                        "date": debate_date,
                        "debate_id": debate_props.get("id"),
                        "updated_at": datetime.utcnow().isoformat(),
                    }

                    if statement_props["content"]:
                        statements_data.append(statement_props)
                        statement_count += 1

                        # Track relationship
                        relationships.append({
                            "statement_id": statement_id,
                            "debate_id": debate_props.get("id")
                        })

                except Exception as e:
                    logger.warning(f"Failed to fetch details for {debate_url}: {e}")

        logger.info(f"Collected {len(debates_data)} debates, {len(statements_data)} statements")

        # Import to Neo4j
        if debates_data:
            created = self.neo4j.batch_create_nodes("Debate", debates_data, batch_size=batch_size)
            stats["debates"] = created
            logger.success(f"✅ Imported {created} debates")

        if statements_data:
            created = self.neo4j.batch_create_nodes("Statement", statements_data, batch_size=batch_size)
            stats["statements"] = created
            logger.success(f"✅ Imported {created} statements")

        # Create relationships
        if relationships:
            logger.info("Creating IN_DEBATE relationships...")
            rel_query = """
            UNWIND $rels AS rel
            MATCH (s:Statement {id: rel.statement_id})
            MATCH (d:Debate {id: rel.debate_id})
            MERGE (s)-[:IN_DEBATE]->(d)
            """
            self.neo4j.run_query(rel_query, {"rels": relationships})
            logger.success(f"✅ Created {len(relationships)} relationships")

        return stats

    def import_recent_votes(self, batch_size: int = 1000) -> int:
        """
        Import votes from start_date onward.

        Args:
            batch_size: Batch size for Neo4j operations

        Returns:
            Number of votes imported
        """
        logger.info(f"Importing votes since {self.start_date}...")

        votes_data = []
        vote_count = 0

        for vote in self.op_client.list_votes():
            vote_date = vote.get("date")

            # Filter by date
            if vote_date and vote_date < self.start_date:
                continue

            vote_count += 1
            if vote_count % 50 == 0:
                logger.info(f"Fetched {vote_count} votes...")

            vote_props = {
                "id": f"{vote.get('session')}-{vote.get('number')}",
                "number": vote.get("number"),
                "session": vote.get("session"),
                "date": vote_date,
                "result": vote.get("result"),
                "yeas": vote.get("yeas"),
                "nays": vote.get("nays"),
                "paired": vote.get("paired"),
                "updated_at": datetime.utcnow().isoformat(),
            }

            vote_props = {k: v for k, v in vote_props.items() if v is not None}
            votes_data.append(vote_props)

        if votes_data:
            created = self.neo4j.batch_create_nodes("Vote", votes_data, batch_size=batch_size)
            logger.success(f"✅ Imported {created} votes")
            return created

        return 0

    def import_all(self, batch_size: int = 1000) -> Dict[str, Any]:
        """
        Import all recent data (2022-present).

        Args:
            batch_size: Batch size for Neo4j operations

        Returns:
            Dict with import statistics
        """
        logger.info("=" * 60)
        logger.info(f"RECENT DATA IMPORT ({self.start_date} - present)")
        logger.info("=" * 60)

        stats = {}

        # Import current MPs (from existing parliament.py functions)
        logger.info("\n1. Importing current MPs...")
        from .parliament import ingest_mps, ingest_parties, ingest_ridings
        stats["mps"] = ingest_mps(self.neo4j, batch_size)
        stats["parties"] = ingest_parties(self.neo4j)
        stats["ridings"] = ingest_ridings(self.neo4j)

        # Import current bills (LEGISinfo JSON)
        logger.info("\n2. Importing current bills...")
        from .parliament import ingest_bills_from_legisinfo_json
        stats["bills"] = ingest_bills_from_legisinfo_json(self.neo4j, batch_size)

        # Import recent debates & statements
        logger.info(f"\n3. Importing debates since {self.start_date}...")
        stats["debates"] = self.import_recent_debates(batch_size)

        # Import recent votes
        logger.info(f"\n4. Importing votes since {self.start_date}...")
        stats["votes"] = self.import_recent_votes(batch_size)

        # Import committees
        logger.info("\n5. Importing committees...")
        from .parliament import ingest_committees
        stats["committees"] = ingest_committees(self.neo4j)

        # Import expenses (last 2 years)
        logger.info("\n6. Importing MP expenses (2023-present)...")
        from .finances import ingest_financial_data
        try:
            expense_stats = ingest_financial_data(
                self.neo4j,
                batch_size=batch_size
            )
            stats["expenses"] = expense_stats.get("expenses", 0)
        except Exception as e:
            logger.warning(f"Failed to import expenses: {e}")
            stats["expenses"] = 0

        logger.info("=" * 60)
        logger.success("✅ RECENT DATA IMPORT COMPLETE")
        logger.info(f"MPs: {stats.get('mps', 0):,}")
        logger.info(f"Parties: {stats.get('parties', 0)}")
        logger.info(f"Ridings: {stats.get('ridings', 0)}")
        logger.info(f"Bills: {stats.get('bills', 0):,}")
        logger.info(f"Debates: {stats.get('debates', {}).get('debates', 0):,}")
        logger.info(f"Statements: {stats.get('debates', {}).get('statements', 0):,}")
        logger.info(f"Votes: {stats.get('votes', 0):,}")
        logger.info(f"Committees: {stats.get('committees', 0)}")
        logger.info(f"Expenses: {stats.get('expenses', 0):,}")
        logger.info("=" * 60)

        return stats
