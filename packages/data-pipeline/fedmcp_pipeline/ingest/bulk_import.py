"""Bulk import from OpenParliament PostgreSQL dump and Lipad historical data."""

import os
import sys
import subprocess
import tempfile
import requests
from pathlib import Path
from datetime import datetime
from typing import Dict, List, Any, Optional, Iterator
import psycopg2
from psycopg2.extras import RealDictCursor

from ..utils.neo4j_client import Neo4jClient
from ..utils.progress import logger, ProgressTracker, batch_iterator


class OpenParliamentBulkImporter:
    """
    Import historical parliamentary data from OpenParliament PostgreSQL dump.

    Coverage: 1994-present (updated monthly)
    Size: ~1.2GB compressed, ~6GB uncompressed
    """

    DUMP_URL = "https://openparliament.ca/data/openparliament.public.sql.bz2"

    def __init__(self, neo4j_client: Neo4jClient, pg_connection_string: str):
        """
        Initialize bulk importer.

        Args:
            neo4j_client: Neo4j client instance
            pg_connection_string: PostgreSQL connection string
                e.g., "postgresql://user:pass@localhost:5432/openparliament_temp"
        """
        self.neo4j = neo4j_client
        self.pg_conn_string = pg_connection_string
        self.download_dir = Path(tempfile.gettempdir()) / "openparliament_import"
        self.download_dir.mkdir(exist_ok=True)

    def download_dump(self) -> Path:
        """
        Download OpenParliament PostgreSQL dump.

        Returns:
            Path to downloaded file
        """
        dump_file = self.download_dir / "openparliament.public.sql.bz2"

        if dump_file.exists():
            logger.info(f"Dump file already exists: {dump_file}")
            return dump_file

        logger.info(f"Downloading OpenParliament dump from {self.DUMP_URL}...")
        logger.info(f"Size: ~1.2GB compressed (this will take a while)")

        response = requests.get(self.DUMP_URL, stream=True)
        response.raise_for_status()

        total_size = int(response.headers.get('content-length', 0))
        downloaded = 0

        with open(dump_file, 'wb') as f:
            for chunk in response.iter_content(chunk_size=8192):
                f.write(chunk)
                downloaded += len(chunk)
                if total_size > 0 and downloaded % (50 * 1024 * 1024) == 0:  # Every 50MB
                    progress = (downloaded / total_size) * 100
                    logger.info(f"Downloaded {downloaded / 1024 / 1024:.1f}MB / {total_size / 1024 / 1024:.1f}MB ({progress:.1f}%)")

        logger.success(f"✅ Downloaded to {dump_file}")
        return dump_file

    def extract_and_load_dump(self, dump_file: Path) -> None:
        """
        Extract and load PostgreSQL dump into database.

        Args:
            dump_file: Path to .sql.bz2 file
        """
        logger.info("Extracting and loading PostgreSQL dump...")
        logger.info("This will take 10-20 minutes...")

        # Extract and pipe directly to psql
        extract_cmd = f"bunzip2 -c {dump_file}"
        load_cmd = f"psql {self.pg_conn_string}"

        logger.info(f"Running: {extract_cmd} | {load_cmd}")

        # Use subprocess to pipe bunzip2 output to psql
        extract_proc = subprocess.Popen(
            extract_cmd,
            shell=True,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE
        )

        load_proc = subprocess.Popen(
            load_cmd,
            shell=True,
            stdin=extract_proc.stdout,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE
        )

        extract_proc.stdout.close()  # Allow extract_proc to receive SIGPIPE
        output, errors = load_proc.communicate()

        if load_proc.returncode != 0:
            logger.error(f"Failed to load dump: {errors.decode()}")
            raise Exception("Database load failed")

        logger.success("✅ Database loaded successfully")

    def get_pg_connection(self):
        """Get PostgreSQL connection."""
        return psycopg2.connect(self.pg_conn_string, cursor_factory=RealDictCursor)

    def import_mps(self, batch_size: int = 1000) -> int:
        """
        Import MPs/politicians from OpenParliament database.

        OpenParliament schema:
        - core_politician: Basic MP info
        - core_politicianinfo: Extended info (email, phone, etc.)
        - core_party: Political parties
        - core_ridinginfo: Electoral districts

        Returns:
            Number of MPs imported
        """
        logger.info("Importing MPs from PostgreSQL dump...")

        with self.get_pg_connection() as conn:
            with conn.cursor() as cur:
                # Query MPs with all related data
                # Get latest party/riding from core_electedmember (most recent by start_date)
                cur.execute("""
                    SELECT DISTINCT ON (p.id)
                        p.id,
                        p.name,
                        p.name_given,
                        p.name_family,
                        p.gender,
                        p.slug,
                        p.headshot,
                        party.slug as party_slug,
                        party.name_en as party_name,
                        party.short_name_en as party_short_name,
                        riding.slug as riding_slug,
                        riding.name_en as riding_name,
                        riding.province as riding_province
                    FROM core_politician p
                    LEFT JOIN core_electedmember em ON p.id = em.politician_id
                    LEFT JOIN core_party party ON em.party_id = party.id
                    LEFT JOIN core_riding riding ON em.riding_id = riding.id
                    WHERE p.slug IS NOT NULL
                    ORDER BY p.id, em.start_date DESC NULLS LAST
                """)

                mps_data = []
                for row in cur:
                    # Note: Using photo_url_source for OpenParliament headshot URLs
                    # This preserves the auto-updated source URL without overwriting
                    # any manually uploaded custom high-res photos in photo_url
                    mp_props = {
                        "id": row['slug'],
                        "name": row['name'],
                        "given_name": row['name_given'],
                        "family_name": row['name_family'],
                        "gender": row['gender'],
                        "party": row['party_short_name'] or row['party_name'],
                        "riding": row['riding_name'],
                        "photo_url_source": row['headshot'],  # OpenParliament source (auto-updated)
                        "updated_at": datetime.utcnow().isoformat(),
                    }

                    # Filter None values
                    mp_props = {k: v for k, v in mp_props.items() if v is not None}
                    mps_data.append(mp_props)

                logger.info(f"Found {len(mps_data):,} MPs in PostgreSQL dump")

        # Batch merge into Neo4j (merge to avoid duplicates with existing data)
        created = self.neo4j.batch_merge_nodes("MP", mps_data, merge_keys=["id"], batch_size=batch_size)
        logger.success(f"✅ Imported {created:,} MPs")
        return created

    def import_debates(self, batch_size: int = 1000, limit: Optional[int] = None) -> Dict[str, int]:
        """
        Import debates (Hansard) from OpenParliament database.

        OpenParliament schema:
        - hansards_document: Individual Hansard sittings
        - hansards_statement: Individual statements/speeches

        Returns:
            Dict with counts
        """
        logger.info("Importing debates from PostgreSQL dump...")

        stats = {"debates": 0, "statements": 0}

        with self.get_pg_connection() as conn:
            with conn.cursor() as cur:
                # Import Hansard documents (debate sittings)
                query = """
                    SELECT
                        id,
                        slug,
                        date,
                        number,
                        parliament,
                        session,
                        document_type
                    FROM hansards_document
                    WHERE document_type = 'debate'
                    ORDER BY date DESC
                """

                if limit:
                    query += f" LIMIT {limit}"

                cur.execute(query)

                debates_data = []
                for row in cur:
                    debate_props = {
                        "id": row['slug'],
                        "date": row['date'].isoformat() if row['date'] else None,
                        "number": row['number'],
                        "parliament": row['parliament'],
                        "session": row['session'],
                        "type": row['document_type'],
                        "updated_at": datetime.utcnow().isoformat(),
                    }

                    debate_props = {k: v for k, v in debate_props.items() if v is not None}
                    debates_data.append(debate_props)

                logger.info(f"Found {len(debates_data):,} debates in PostgreSQL dump")
                stats["debates"] = self.neo4j.batch_create_nodes("Debate", debates_data, batch_size=batch_size)
                logger.success(f"✅ Imported {stats['debates']:,} debates")

                # Import statements (individual speeches)
                logger.info("Importing statements from PostgreSQL dump...")

                statement_query = """
                    SELECT
                        s.id,
                        s.slug,
                        s.time,
                        s.h1_en,
                        s.h2_en,
                        s.content_en,
                        s.wordcount,
                        s.sequence,
                        s.politician_id,
                        p.slug as politician_slug,
                        s.document_id,
                        d.slug as document_slug
                    FROM hansards_statement s
                    LEFT JOIN core_politician p ON s.politician_id = p.id
                    LEFT JOIN hansards_document d ON s.document_id = d.id
                    WHERE s.content_en IS NOT NULL
                    ORDER BY s.time DESC
                """

                if limit:
                    statement_query += f" LIMIT {limit * 10}"  # More statements than debates

                cur.execute(statement_query)

                statements_data = []
                statement_relationships = []

                for row in cur:
                    statement_props = {
                        "id": row['slug'],
                        "time": row['time'].isoformat() if row['time'] else None,
                        "heading": row['h1_en'],
                        "subheading": row['h2_en'],
                        "content": row['content_en'],
                        "wordcount": row['wordcount'],
                        "sequence": row['sequence'],
                        "updated_at": datetime.utcnow().isoformat(),
                    }

                    statement_props = {k: v for k, v in statement_props.items() if v is not None}
                    statements_data.append(statement_props)

                    # Track relationships
                    if row['politician_slug']:
                        statement_relationships.append({
                            "statement_id": row['slug'],
                            "mp_id": row['politician_slug'],
                            "debate_id": row['document_slug']
                        })

                logger.info(f"Found {len(statements_data):,} statements in PostgreSQL dump")
                stats["statements"] = self.neo4j.batch_create_nodes("Statement", statements_data, batch_size=batch_size)
                logger.success(f"✅ Imported {stats['statements']:,} statements")

                # Create relationships
                logger.info("Creating SPOKE relationships...")
                spoke_query = """
                UNWIND $rels AS rel
                MATCH (m:MP {id: rel.mp_id})
                MATCH (s:Statement {id: rel.statement_id})
                MERGE (m)-[:SPOKE]->(s)
                """
                self.neo4j.run_query(spoke_query, {"rels": statement_relationships})

                logger.info("Creating IN_DEBATE relationships...")
                debate_query = """
                UNWIND $rels AS rel
                MATCH (s:Statement {id: rel.statement_id})
                MATCH (d:Debate {id: rel.debate_id})
                MERGE (s)-[:IN_DEBATE]->(d)
                """
                self.neo4j.run_query(debate_query, {"rels": statement_relationships})
                logger.success(f"✅ Created {len(statement_relationships):,} relationships")

        return stats

    def import_committees(self, batch_size: int = 1000) -> Dict[str, int]:
        """
        Import committees and evidence from OpenParliament database.

        OpenParliament schema:
        - committees_committee: Committee info
        - committees_committeemeeting: Meeting records
        - committees_committeemember: Membership

        Returns:
            Dict with counts
        """
        logger.info("Importing committees from PostgreSQL dump...")

        stats = {"committees": 0, "meetings": 0, "memberships": 0}

        with self.get_pg_connection() as conn:
            with conn.cursor() as cur:
                # Import committees
                cur.execute("""
                    SELECT
                        id,
                        slug,
                        short_name_en,
                        name_en,
                        parent
                    FROM committees_committee
                    ORDER BY id
                """)

                committees_data = []
                for row in cur:
                    committee_props = {
                        "code": row['slug'],
                        "name": row['name_en'] or row['short_name_en'],
                        "short_name": row['short_name_en'],
                        "chamber": row['parent'] or "Commons",
                        "updated_at": datetime.utcnow().isoformat(),
                    }

                    committee_props = {k: v for k, v in committee_props.items() if v is not None}
                    committees_data.append(committee_props)

                logger.info(f"Found {len(committees_data):,} committees")
                stats["committees"] = self.neo4j.batch_create_nodes("Committee", committees_data, batch_size=batch_size)
                logger.success(f"✅ Imported {stats['committees']:,} committees")

                # Import committee memberships
                cur.execute("""
                    SELECT
                        cm.id,
                        p.slug as politician_slug,
                        c.slug as committee_slug,
                        cm.role_en
                    FROM committees_committeemember cm
                    JOIN core_politician p ON cm.politician_id = p.id
                    JOIN committees_committee c ON cm.committee_id = c.id
                    WHERE p.slug IS NOT NULL AND c.slug IS NOT NULL
                """)

                memberships = []
                for row in cur:
                    memberships.append({
                        "mp_id": row['politician_slug'],
                        "committee_code": row['committee_slug'],
                        "role": row['role_en']
                    })

                logger.info(f"Creating {len(memberships):,} MEMBER_OF relationships...")
                membership_query = """
                UNWIND $memberships AS m
                MATCH (mp:MP {id: m.mp_id})
                MATCH (c:Committee {code: m.committee_code})
                MERGE (mp)-[r:MEMBER_OF]->(c)
                SET r.role = m.role
                """
                self.neo4j.run_query(membership_query, {"memberships": memberships})
                stats["memberships"] = len(memberships)
                logger.success(f"✅ Created {stats['memberships']:,} memberships")

        return stats

    def import_all(self, download: bool = True, load_pg: bool = True, batch_size: int = 1000, limit: Optional[int] = None) -> Dict[str, Any]:
        """
        Run complete bulk import pipeline.

        Args:
            download: Whether to download dump (skip if already downloaded)
            load_pg: Whether to load into PostgreSQL (skip if already loaded)
            batch_size: Batch size for Neo4j operations
            limit: Limit records for testing

        Returns:
            Dict with import statistics
        """
        logger.info("=" * 60)
        logger.info("OPENPARLIAMENT BULK IMPORT")
        logger.info("=" * 60)

        stats = {}

        # Step 1: Download dump
        if download:
            dump_file = self.download_dump()
        else:
            dump_file = self.download_dir / "openparliament.public.sql.bz2"
            logger.info(f"Using existing dump: {dump_file}")

        # Step 2: Load into PostgreSQL
        if load_pg:
            self.extract_and_load_dump(dump_file)
        else:
            logger.info("Skipping PostgreSQL load (assuming already loaded)")

        # Step 3: Import data into Neo4j
        stats["mps"] = self.import_mps(batch_size)
        stats["debates"] = self.import_debates(batch_size, limit)
        stats["committees"] = self.import_committees(batch_size)

        logger.info("=" * 60)
        logger.success("✅ BULK IMPORT COMPLETE")
        logger.info(f"MPs: {stats['mps']:,}")
        logger.info(f"Debates: {stats['debates']['debates']:,}")
        logger.info(f"Statements: {stats['debates']['statements']:,}")
        logger.info(f"Committees: {stats['committees']['committees']:,}")
        logger.info(f"Committee Memberships: {stats['committees']['memberships']:,}")
        logger.info("=" * 60)

        return stats
