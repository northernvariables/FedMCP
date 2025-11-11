#!/usr/bin/env python3
"""
Hansard Threading Population Script

This script analyzes Statement nodes in Neo4j and populates threading metadata:
- thread_id: UUID identifying a conversation thread
- parent_statement_id: ID of the statement being replied to
- sequence_in_thread: Position in thread (0 = root, 1, 2, 3...)

It also creates REPLIES_TO relationships between statements.

Algorithm:
1. Process documents in chronological order
2. Within each document, group statements by topic (h2/h3)
3. Detect conversation patterns:
   - Question → Answer sequences
   - Same speaker continuations
   - Time proximity (<= 5 minutes)
4. Assign thread IDs and create relationships

Usage:
    python populate_threading.py
    python populate_threading.py --document-id 12345  # Process specific document
    python populate_threading.py --dry-run            # Preview without writing
"""

import argparse
import logging
import uuid
from datetime import datetime, timedelta
from typing import List, Dict, Optional, Tuple
from collections import defaultdict

from neo4j import GraphDatabase
from neo4j.time import DateTime as Neo4jDateTime

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


class ThreadingAnalyzer:
    """Analyzes statements and detects conversational threading patterns."""

    # Time window for considering statements part of same thread
    MAX_THREAD_GAP_MINUTES = 5

    # Statement types that start new threads
    THREAD_ROOT_TYPES = {'question', 'debate'}

    # Statement types that are replies
    REPLY_TYPES = {'answer', 'interjection'}

    def __init__(self, driver):
        self.driver = driver

    def process_all_documents(self, dry_run: bool = False) -> Dict[str, int]:
        """
        Process all documents and populate threading.

        Returns:
            Dict with statistics: threads_created, relationships_created
        """
        stats = {'threads_created': 0, 'relationships_created': 0, 'documents_processed': 0}

        with self.driver.session() as session:
            # Get all documents ordered by date
            result = session.run("""
                MATCH (d:Document)
                WHERE d.public = true
                RETURN d.id AS id, d.date AS date, d.document_type AS type
                ORDER BY d.date DESC
                LIMIT 100
            """)

            documents = list(result)
            logger.info(f"Found {len(documents)} documents to process")

            for idx, record in enumerate(documents, 1):
                doc_id = record['id']
                doc_date = record['date']
                doc_type = record['type']

                logger.info(f"[{idx}/{len(documents)}] Processing document {doc_id} "
                           f"({doc_type}, {doc_date})")

                try:
                    doc_stats = self.process_document(doc_id, dry_run=dry_run)
                    stats['threads_created'] += doc_stats['threads']
                    stats['relationships_created'] += doc_stats['relationships']
                    stats['documents_processed'] += 1

                    logger.info(f"  Created {doc_stats['threads']} threads, "
                               f"{doc_stats['relationships']} relationships")

                except Exception as e:
                    logger.error(f"  Error processing document {doc_id}: {e}")
                    continue

        return stats

    def process_document(self, document_id: int, dry_run: bool = False) -> Dict[str, int]:
        """
        Process a single document and detect threading patterns.

        Args:
            document_id: Document ID to process
            dry_run: If True, don't write changes to database

        Returns:
            Dict with statistics: threads, relationships
        """
        stats = {'threads': 0, 'relationships': 0}

        with self.driver.session() as session:
            # Get all statements for this document, ordered by time
            result = session.run("""
                MATCH (s:Statement)-[:PART_OF]->(d:Document {id: $doc_id})
                RETURN
                    s.id AS id,
                    s.time AS time,
                    s.statement_type AS type,
                    s.who_en AS who,
                    s.politician_id AS politician_id,
                    s.h1_en AS h1,
                    s.h2_en AS h2,
                    s.h3_en AS h3,
                    s.procedural AS procedural,
                    s.wordcount AS wordcount
                ORDER BY s.time ASC
            """, doc_id=document_id)

            statements = [dict(record) for record in result]

            if not statements:
                logger.warning(f"  No statements found for document {document_id}")
                return stats

            logger.info(f"  Analyzing {len(statements)} statements...")

            # Group statements by topic (h2) for better threading
            topic_groups = self._group_by_topic(statements)

            # Detect threads within each topic group
            all_threads = []
            for topic, group_statements in topic_groups.items():
                threads = self._detect_threads(group_statements)
                all_threads.extend(threads)
                logger.debug(f"    Topic '{topic[:50]}': {len(threads)} threads detected")

            logger.info(f"  Total threads detected: {len(all_threads)}")

            if not dry_run:
                # Write threading metadata to database
                for thread in all_threads:
                    self._write_thread(session, thread)
                    stats['threads'] += 1
                    stats['relationships'] += len(thread) - 1  # n-1 relationships for n statements

        return stats

    def _group_by_topic(self, statements: List[Dict]) -> Dict[str, List[Dict]]:
        """
        Group statements by topic heading (h2).

        Returns:
            Dict mapping topic string to list of statements
        """
        groups = defaultdict(list)

        for stmt in statements:
            # Use h2 as primary grouping, fall back to h1, then "Other"
            topic = stmt.get('h2') or stmt.get('h1') or 'Other'
            groups[topic].append(stmt)

        return dict(groups)

    def _detect_threads(self, statements: List[Dict]) -> List[List[Dict]]:
        """
        Detect conversation threads within a group of statements.

        Algorithm:
        1. Find thread roots (questions, debate openings)
        2. Group subsequent statements as replies if:
           - Within time window (5 minutes)
           - Type is 'answer' or continues the conversation
           - Not a procedural statement (unless very short)
        3. Handle alternating speakers (back-and-forth exchanges)

        Returns:
            List of threads, where each thread is a list of statement dicts
        """
        threads = []
        current_thread = []
        last_time = None
        last_speaker = None

        for stmt in statements:
            stmt_type = stmt.get('type', '').lower()
            stmt_time = self._parse_time(stmt.get('time'))
            stmt_speaker = stmt.get('politician_id')
            is_procedural = stmt.get('procedural', False)
            wordcount = stmt.get('wordcount', 0)

            # Skip very short procedural statements (likely "Hear, hear!" etc.)
            if is_procedural and wordcount < 20:
                continue

            # Decide if this starts a new thread or continues current one
            should_start_new_thread = False

            if not current_thread:
                # No current thread, start new one
                should_start_new_thread = True

            elif stmt_type in self.THREAD_ROOT_TYPES:
                # Questions and debate statements always start new threads
                should_start_new_thread = True

            elif last_time and stmt_time:
                # Check time gap
                time_gap = self._time_difference_minutes(last_time, stmt_time)
                if time_gap > self.MAX_THREAD_GAP_MINUTES:
                    should_start_new_thread = True

            # Special case: If current thread only has 1 statement and this is an answer,
            # it's likely a Q&A pair - keep in same thread
            if len(current_thread) == 1 and stmt_type in self.REPLY_TYPES:
                should_start_new_thread = False

            if should_start_new_thread and current_thread:
                # Save current thread and start new one
                threads.append(current_thread)
                current_thread = []

            # Add statement to current thread
            current_thread.append(stmt)
            last_time = stmt_time
            last_speaker = stmt_speaker

        # Don't forget the last thread
        if current_thread:
            threads.append(current_thread)

        # Filter out single-statement "threads" unless they're substantive
        threads = [t for t in threads if len(t) > 1 or t[0].get('wordcount', 0) > 100]

        return threads

    def _write_thread(self, session, thread: List[Dict]):
        """
        Write thread metadata to Neo4j.

        Creates:
        - thread_id for all statements in thread
        - parent_statement_id for replies
        - sequence_in_thread (0, 1, 2, ...)
        - REPLIES_TO relationships
        """
        if not thread:
            return

        # Generate unique thread ID
        thread_id = str(uuid.uuid4())

        # Process each statement in the thread
        for idx, stmt in enumerate(thread):
            statement_id = stmt['id']
            parent_id = thread[idx - 1]['id'] if idx > 0 else None

            # Update statement properties
            session.run("""
                MATCH (s:Statement {id: $stmt_id})
                SET s.thread_id = $thread_id,
                    s.sequence_in_thread = $sequence,
                    s.parent_statement_id = $parent_id
            """,
                stmt_id=statement_id,
                thread_id=thread_id,
                sequence=idx,
                parent_id=parent_id
            )

            # Create REPLIES_TO relationship if this is a reply
            if parent_id:
                session.run("""
                    MATCH (reply:Statement {id: $reply_id})
                    MATCH (parent:Statement {id: $parent_id})
                    MERGE (reply)-[:REPLIES_TO]->(parent)
                """,
                    reply_id=statement_id,
                    parent_id=parent_id
                )

    @staticmethod
    def _parse_time(time_value) -> Optional[datetime]:
        """Parse Neo4j DateTime to Python datetime."""
        if time_value is None:
            return None

        if isinstance(time_value, Neo4jDateTime):
            return datetime(
                time_value.year,
                time_value.month,
                time_value.day,
                time_value.hour,
                time_value.minute,
                time_value.second
            )

        if isinstance(time_value, datetime):
            return time_value

        if isinstance(time_value, str):
            try:
                return datetime.fromisoformat(time_value.replace('Z', '+00:00'))
            except:
                logger.warning(f"Could not parse time: {time_value}")
                return None

        return None

    @staticmethod
    def _time_difference_minutes(time1: datetime, time2: datetime) -> float:
        """Calculate time difference in minutes."""
        diff = abs(time2 - time1)
        return diff.total_seconds() / 60


def main():
    """Main entry point."""
    parser = argparse.ArgumentParser(description='Populate Hansard threading metadata')
    parser.add_argument('--neo4j-uri', default='bolt://localhost:7687',
                       help='Neo4j connection URI')
    parser.add_argument('--neo4j-user', default='neo4j',
                       help='Neo4j username')
    parser.add_argument('--neo4j-password', default='canadagpt2024',
                       help='Neo4j password')
    parser.add_argument('--document-id', type=int,
                       help='Process specific document ID only')
    parser.add_argument('--dry-run', action='store_true',
                       help='Preview changes without writing to database')
    parser.add_argument('--verbose', action='store_true',
                       help='Enable verbose logging')

    args = parser.parse_args()

    if args.verbose:
        logging.getLogger().setLevel(logging.DEBUG)

    # Connect to Neo4j
    logger.info(f"Connecting to Neo4j at {args.neo4j_uri}...")
    driver = GraphDatabase.driver(
        args.neo4j_uri,
        auth=(args.neo4j_user, args.neo4j_password)
    )

    try:
        # Verify connection
        driver.verify_connectivity()
        logger.info("✓ Connected to Neo4j")

        # Create analyzer
        analyzer = ThreadingAnalyzer(driver)

        # Process documents
        if args.document_id:
            logger.info(f"Processing single document: {args.document_id}")
            stats = analyzer.process_document(args.document_id, dry_run=args.dry_run)
            logger.info(f"\nResults: {stats['threads']} threads, "
                       f"{stats['relationships']} relationships")
        else:
            logger.info("Processing all documents...")
            stats = analyzer.process_all_documents(dry_run=args.dry_run)
            logger.info(f"\n{'DRY RUN ' if args.dry_run else ''}COMPLETE")
            logger.info(f"Documents processed: {stats['documents_processed']}")
            logger.info(f"Threads created: {stats['threads_created']}")
            logger.info(f"Relationships created: {stats['relationships_created']}")

    except Exception as e:
        logger.error(f"Error: {e}", exc_info=True)
        return 1
    finally:
        driver.close()
        logger.info("Disconnected from Neo4j")

    return 0


if __name__ == '__main__':
    exit(main())
