"""Financial data ingestion: MP expenses, contracts, grants, donations."""

import sys
import unicodedata
from datetime import datetime
from pathlib import Path
from typing import Dict, Any, Optional

# Add fedmcp package to path
FEDMCP_PATH = Path(__file__).parent.parent.parent.parent / "fedmcp" / "src"
sys.path.insert(0, str(FEDMCP_PATH))

from fedmcp.clients.expenditure import MPExpenditureClient

from ..utils.neo4j_client import Neo4jClient
from ..utils.progress import logger


# Common nickname mappings for Canadian MPs
NICKNAME_MAPPING = {
    'bobby': 'robert',
    'rob': 'robert',
    'bob': 'robert',
    'bill': 'william',
    'dick': 'richard',
    'jim': 'james',
    'joe': 'joseph',
    'mike': 'michael',
    'tony': 'anthony',
    'shuv': 'shuvaloy',
}


def normalize_name(name: str) -> str:
    """
    Normalize a name for fuzzy matching by:
    - Removing accents/diacritics
    - Converting to lowercase
    - Removing extra whitespace
    - Removing punctuation like periods

    Args:
        name: Name to normalize

    Returns:
        Normalized name string
    """
    if not name:
        return ""

    # Remove accents: é → e, è → e, ñ → n, etc.
    # NFD decomposes characters into base + combining characters
    # Then filter out combining characters
    name = ''.join(
        char for char in unicodedata.normalize('NFD', name)
        if unicodedata.category(char) != 'Mn'
    )

    # Remove periods (for middle initials like "S." or "A.")
    name = name.replace('.', '')

    # Convert to lowercase and strip whitespace
    name = name.lower().strip()

    # Normalize whitespace
    name = ' '.join(name.split())

    return name


def extract_core_name(given_name: str, family_name: str) -> str:
    """
    Extract core first and last name, removing middle names/initials.

    Args:
        given_name: Given/first name (may include middle names/initials)
        family_name: Family/last name

    Returns:
        "FirstName LastName" with middle names removed
    """
    # Get first word from given name (removes middle names/initials)
    first_only = given_name.split()[0] if given_name else ""

    # Get first word from family name (handles hyphenated surnames)
    # e.g., "Fancy-Landry" → "Fancy"
    last_first = family_name.split()[0].split('-')[0] if family_name else ""

    return f"{first_only} {last_first}".strip()


def ingest_financial_data(neo4j_client: Neo4jClient, batch_size: int = 10000) -> Dict[str, int]:
    """
    Ingest financial data: MP expenses, contracts, grants, donations.

    Args:
        neo4j_client: Neo4j client
        batch_size: Batch size for operations

    Returns:
        Dict with counts of created entities
    """
    logger.info("=" * 60)
    logger.info("FINANCIAL DATA INGESTION")
    logger.info("=" * 60)

    stats = {}

    # Build MP name -> ID mapping from database
    logger.info("Building MP name -> ID mapping...")
    mp_mapping = {}
    mp_list = []  # Store all MP records for fuzzy matching
    mp_query_result = neo4j_client.run_query("""
        MATCH (m:MP)
        RETURN m.id AS id, m.name AS name, m.given_name AS given_name, m.family_name AS family_name
    """)
    for record in mp_query_result:
        mp_id = record.get("id")
        name = record.get("name")
        given = record.get("given_name", "")
        family = record.get("family_name", "")

        # Store for fuzzy matching
        mp_list.append({
            "id": mp_id,
            "name": name,
            "given_name": given,
            "family_name": family
        })

        # Store by full name (normalized)
        if name:
            mp_mapping[normalize_name(name)] = mp_id

        # Store by "FirstName LastName" format (normalized)
        if given and family:
            normalized_full = normalize_name(f"{given} {family}")
            mp_mapping[normalized_full] = mp_id

            # Also store core name without middle names/initials
            # e.g., "Amanpreet S. Gill" -> "amanpreet gill"
            core_name = normalize_name(extract_core_name(given, family))
            if core_name:
                mp_mapping[core_name] = mp_id

            # Store with nickname variations
            first_name = given.split()[0] if given else ""
            first_normalized = normalize_name(first_name)
            if first_normalized in NICKNAME_MAPPING:
                # e.g., "Bobby Morrissey" also maps as "Robert Morrissey"
                formal_name = normalize_name(f"{NICKNAME_MAPPING[first_normalized]} {family}")
                mp_mapping[formal_name] = mp_id

                # Also store core version with formal name
                formal_core = normalize_name(f"{NICKNAME_MAPPING[first_normalized]} {family.split()[0].split('-')[0]}")
                mp_mapping[formal_core] = mp_id

        # For compound last names, also store with just the first part
        # e.g., "Michelle Rempel Garner" -> "Michelle Rempel"
        if given and family and " " in family:
            first_family = family.split()[0]
            mp_mapping[normalize_name(f"{given} {first_family}")] = mp_id

        # For hyphenated last names, also store first part only
        # e.g., "Jessica Fancy-Landry" -> "Jessica Fancy"
        if given and family and "-" in family:
            first_part = family.split('-')[0]
            mp_mapping[normalize_name(f"{given} {first_part}")] = mp_id
            # Also core version
            mp_mapping[normalize_name(f"{given.split()[0]} {first_part}")] = mp_id

    logger.info(f"Mapped {len(mp_mapping):,} MP name variations to IDs")

    # 1. MP Expenses
    logger.info("Fetching MP expenses...")
    expense_client = MPExpenditureClient()

    # Get expenses for recent quarters (2024-2025)
    expenses_data = []
    skipped_count = 0
    for fiscal_year in [2024, 2025, 2026]:
        for quarter in [1, 2, 3, 4]:
            try:
                logger.debug(f"Fetching FY {fiscal_year} Q{quarter}...")
                summary = expense_client.get_quarterly_summary(fiscal_year, quarter)

                for mp_expenses in summary:
                    # Skip vacant seats
                    if mp_expenses.name == "Vacant":
                        continue

                    # Parse name from "LastName, FirstName" format to "FirstName LastName"
                    # Example: "Aboultaif,  Ziad" -> "Ziad Aboultaif"
                    # Example: "Sgro, Hon. Judy A." -> "Hon. Judy A. Sgro"
                    if "," in mp_expenses.name:
                        parts = mp_expenses.name.split(",", 1)  # Split only on first comma
                        if len(parts) == 2:
                            last_name = parts[0].strip()
                            first_name = parts[1].strip()
                            full_name = f"{first_name} {last_name}"
                        else:
                            full_name = mp_expenses.name.strip()
                    else:
                        full_name = mp_expenses.name.strip()

                    # Strip honorifics/titles from the name
                    # Common titles: "Hon.", "Rt. Hon.", "Right Hon.", "Dr.", "Rev.", "Prof."
                    honorifics = ["Right Hon.", "Rt. Hon.", "Hon.", "Dr.", "Rev.", "Prof.", "Mr.", "Mrs.", "Ms.", "Miss"]
                    for honorific in honorifics:
                        full_name = full_name.replace(honorific, "").strip()

                    # Normalize the name (remove accents, lowercase, clean whitespace)
                    normalized_name = normalize_name(full_name)

                    # Look up MP ID from normalized name
                    mp_id = mp_mapping.get(normalized_name)

                    # If not found, try variations
                    if not mp_id and " " in normalized_name:
                        parts = normalized_name.split()

                        # Try: first name + first word of last name
                        # Handles: "Fancy Jessica" when DB has "Jessica Fancy-Landry"
                        if len(parts) >= 2:
                            first_last = f"{parts[0]} {parts[1]}"
                            mp_id = mp_mapping.get(first_last)

                        # Try: extracting just first + last (no middle names)
                        # Handles: "Rhéal Éloi Fortin" -> "rheal fortin"
                        if not mp_id and len(parts) >= 2:
                            core_name = f"{parts[0]} {parts[-1]}"
                            mp_id = mp_mapping.get(core_name)

                        # Try: check if first name is a nickname, try formal version
                        # Handles: "Robert Morrissey" when DB has "Bobby Morrissey"
                        if not mp_id and len(parts) >= 2:
                            first_name_norm = parts[0]
                            # Check reverse mapping (formal -> nickname)
                            for nickname, formal in NICKNAME_MAPPING.items():
                                if first_name_norm == formal:
                                    nickname_version = f"{nickname} {parts[-1]}"
                                    mp_id = mp_mapping.get(nickname_version)
                                    if mp_id:
                                        break

                    if not mp_id:
                        logger.debug(f"Could not find MP ID for: {mp_expenses.name} (normalized: {normalized_name})")
                        skipped_count += 1
                        continue

                    # Create separate expense records for each category
                    categories = [
                        ("salaries", mp_expenses.salaries, "Staff salaries and benefits"),
                        ("travel", mp_expenses.travel, "Travel expenses"),
                        ("hospitality", mp_expenses.hospitality, "Hospitality and events"),
                        ("contracts", mp_expenses.contracts, "Contract services"),
                    ]

                    for category, amount, description in categories:
                        if amount > 0:  # Only create records for non-zero expenses
                            expense_props = {
                                "id": f"exp-{mp_id}-{fiscal_year}-q{quarter}-{category}",
                                "mp_id": mp_id,
                                "fiscal_year": fiscal_year,
                                "quarter": quarter,
                                "category": category,
                                "amount": amount,
                                "description": description,
                                "updated_at": datetime.utcnow().isoformat(),
                            }
                            expenses_data.append(expense_props)

            except Exception as e:
                logger.warning(f"Could not fetch FY {fiscal_year} Q{quarter}: {e}")
                continue

    logger.info(f"Found {len(expenses_data):,} expense records ({skipped_count} MPs skipped due to name mismatch)")

    if expenses_data:
        stats["expenses"] = neo4j_client.batch_merge_nodes("Expense", expenses_data, merge_keys=["id"], batch_size=batch_size)
        logger.info(f"Created/updated {stats['expenses']:,} expense nodes")

        # Create INCURRED relationships between MPs and Expenses
        logger.info("Creating INCURRED relationships...")
        rel_query = """
        MATCH (e:Expense)
        MATCH (m:MP {id: e.mp_id})
        MERGE (m)-[:INCURRED]->(e)
        """
        neo4j_client.run_query(rel_query)
        logger.info("✅ Created INCURRED relationships")
    else:
        stats["expenses"] = 0

    # TODO: Contracts, grants, donations (requires additional data sources)
    stats["contracts"] = 0
    stats["grants"] = 0
    stats["donations"] = 0

    logger.info("=" * 60)
    logger.success("✅ FINANCIAL DATA INGESTION COMPLETE")
    logger.info(f"Expenses: {stats['expenses']:,}")
    logger.info(f"Contracts: {stats['contracts']:,} (TODO)")
    logger.info(f"Grants: {stats['grants']:,} (TODO)")
    logger.info(f"Donations: {stats['donations']:,} (TODO)")
    logger.info("=" * 60)

    return stats
