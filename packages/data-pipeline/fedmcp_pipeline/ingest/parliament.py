"""Parliamentary data ingestion: MPs, bills, votes, debates, committees."""

import sys
import json
import requests
from datetime import datetime
from pathlib import Path
from typing import List, Dict, Any, Optional

# Add fedmcp package to path
FEDMCP_PATH = Path(__file__).parent.parent.parent.parent / "fedmcp" / "src"
sys.path.insert(0, str(FEDMCP_PATH))

from fedmcp.clients.openparliament import OpenParliamentClient
from fedmcp.clients.legisinfo import LegisInfoClient

from ..utils.neo4j_client import Neo4jClient
from ..utils.progress import logger, ProgressTracker, batch_iterator


def detect_province(riding_name: str) -> Optional[str]:
    """
    Detect the province/territory for a riding using keyword matching.

    Args:
        riding_name: Name of the riding (e.g., "Calgary Centre", "Toronto—Danforth")

    Returns:
        Two-letter province/territory code (e.g., "ON", "QC", "BC") or None if not detected
    """
    # Load province mapping data
    data_file = Path(__file__).parent.parent / "data" / "riding_provinces.json"
    if not data_file.exists():
        logger.warning(f"Province mapping file not found: {data_file}")
        return None

    with open(data_file, 'r') as f:
        mapping = json.load(f)

    # Check manual overrides first (for ridings like "Nunavut", "Northwest Territories")
    manual_overrides = mapping.get("manual_overrides", {})
    for override_name, province_code in manual_overrides.items():
        if override_name.lower() in riding_name.lower():
            return province_code

    # Check keyword patterns
    keyword_patterns = mapping.get("keyword_patterns", {})
    for province_code, keywords in keyword_patterns.items():
        for keyword in keywords:
            if keyword.lower() in riding_name.lower():
                return province_code

    # No match found
    logger.warning(f"Could not detect province for riding: {riding_name}")
    return None


def ingest_mps(neo4j_client: Neo4jClient, batch_size: int = 10000) -> int:
    """
    Ingest all MPs from OpenParliament API with full details.

    Args:
        neo4j_client: Neo4j client instance
        batch_size: Batch size for Neo4j operations

    Returns:
        Number of MPs created
    """
    logger.info("Fetching MPs from OpenParliament API...")
    op_client = OpenParliamentClient()

    # Load cabinet positions
    cabinet_file = Path(__file__).parent.parent / "data" / "cabinet_positions.json"
    cabinet_positions = {}
    if cabinet_file.exists():
        with open(cabinet_file, 'r') as f:
            cabinet_data = json.load(f)
            cabinet_positions = {
                m["slug"]: m["position"]
                for m in cabinet_data.get("cabinet_ministers", [])
            }
        logger.info(f"Loaded {len(cabinet_positions)} cabinet positions")

    # Fetch all MPs (current + historical) - list endpoint for URLs
    mps_list = list(op_client.list_mps())
    logger.info(f"Found {len(mps_list):,} MPs, fetching detailed information...")

    # Fetch detailed data for each MP
    mps_data = []
    for i, mp_summary in enumerate(mps_list):
        if i % 50 == 0:
            logger.info(f"Progress: {i}/{len(mps_list)}")

        mp_url = mp_summary.get("url", "")
        mp_id = mp_url.split("/")[-2]

        try:
            # Fetch full MP details
            mp_data = op_client._request(mp_url)

            # Extract nested party and riding data from current membership
            current_party = mp_data.get("current_party") or {}
            party_name = current_party.get("short_name", {}).get("en") if isinstance(current_party.get("short_name"), dict) else current_party.get("short_name")

            current_riding = mp_data.get("current_riding") or {}
            riding_name = current_riding.get("name", {}).get("en") if isinstance(current_riding.get("name"), dict) else current_riding.get("name")

            # Extract additional info from other_info
            other_info = mp_data.get("other_info", {})
            twitter_handles = other_info.get("twitter", [])
            twitter_handle = twitter_handles[0] if twitter_handles else None

            wikipedia_ids = other_info.get("wikipedia_id", [])
            wikipedia_id = wikipedia_ids[0] if wikipedia_ids else None

            # Extract parl_mp_id for matching to government roles (Cabinet, PS)
            parl_mp_ids = other_info.get("parl_mp_id", [])
            parl_mp_id = int(parl_mp_ids[0]) if parl_mp_ids else None

            constituency_offices = other_info.get("constituency_offices", [])
            constituency_office = constituency_offices[0] if constituency_offices else None

            # Extract OurCommons link
            links = mp_data.get("links", [])
            ourcommons_url = next((link["url"] for link in links if "ourcommons.ca" in link.get("url", "")), None)

            # Extract photo URL from OpenParliament
            # The 'image' field contains a relative path like "polpics/name.jpg"
            # We'll store it as photo_url_source for the 3-tier fallback system
            photo_url_source = mp_data.get("image")
            if photo_url_source and not photo_url_source.startswith("http"):
                # Convert relative path to full OpenParliament URL
                photo_url_source = f"https://www.openparliament.ca{photo_url_source}" if photo_url_source.startswith("/") else f"https://www.openparliament.ca/{photo_url_source}"

            mp_props = {
                "id": mp_id,
                "name": mp_data.get("name"),
                "given_name": mp_data.get("given_name"),
                "family_name": mp_data.get("family_name"),
                "gender": mp_data.get("gender"),
                "party": party_name,
                "riding": riding_name,
                "current": mp_summary.get("current", True),
                "elected_date": mp_summary.get("elected"),
                "email": mp_data.get("email"),
                "phone": mp_data.get("voice"),
                "twitter": twitter_handle,
                "wikipedia_id": wikipedia_id,
                "parl_mp_id": parl_mp_id,
                "constituency_office": constituency_office,
                "ourcommons_url": ourcommons_url,
                "cabinet_position": cabinet_positions.get(mp_id),
                "photo_url_source": photo_url_source,  # OpenParliament photo URL (auto-updated)
                "updated_at": datetime.utcnow().isoformat(),
            }

            # Filter out None values
            mp_props = {k: v for k, v in mp_props.items() if v is not None}
            mps_data.append(mp_props)

        except Exception as e:
            logger.warning(f"Failed to fetch details for {mp_id}: {e}")
            # Fall back to summary data
            current_party = mp_summary.get("current_party") or {}
            party_name = current_party.get("short_name", {}).get("en") if isinstance(current_party.get("short_name"), dict) else current_party.get("short_name")

            current_riding = mp_summary.get("current_riding") or {}
            riding_name = current_riding.get("name", {}).get("en") if isinstance(current_riding.get("name"), dict) else current_riding.get("name")

            # Extract photo URL from summary if available
            photo_url_source = mp_summary.get("image")
            if photo_url_source and not photo_url_source.startswith("http"):
                photo_url_source = f"https://www.openparliament.ca{photo_url_source}" if photo_url_source.startswith("/") else f"https://www.openparliament.ca/{photo_url_source}"

            mp_props = {
                "id": mp_id,
                "name": mp_summary.get("name"),
                "party": party_name,
                "riding": riding_name,
                "current": mp_summary.get("current", True),
                "photo_url_source": photo_url_source,
                "updated_at": datetime.utcnow().isoformat(),
            }
            mp_props = {k: v for k, v in mp_props.items() if v is not None}
            mps_data.append(mp_props)

    # Batch create MPs
    created = neo4j_client.batch_create_nodes("MP", mps_data, batch_size=batch_size)
    logger.success(f"✅ Created {created:,} MPs with full details")
    return created


def ingest_parties(neo4j_client: Neo4jClient) -> int:
    """
    Ingest political parties.

    Note: OpenParliament doesn't have a parties endpoint, so we extract from MPs.
    """
    logger.info("Extracting parties from MPs...")

    # Query existing MPs to get unique parties
    result = neo4j_client.run_query(
        """
        MATCH (m:MP)
        WHERE m.party IS NOT NULL
        WITH DISTINCT m.party AS party_name
        RETURN party_name
        ORDER BY party_name
        """
    )

    parties = [record["party_name"] for record in result]
    logger.info(f"Found {len(parties)} unique parties")

    # Manually map party short names to codes and full names
    party_mapping = {
        "Conservative": {"code": "CPC", "name": "Conservative Party of Canada"},
        "Liberal": {"code": "LPC", "name": "Liberal Party of Canada"},
        "NDP": {"code": "NDP", "name": "New Democratic Party"},
        "Bloc Québécois": {"code": "BQ", "name": "Bloc Québécois"},
        "Green": {"code": "GPC", "name": "Green Party of Canada"},
        "Independent": {"code": "IND", "name": "Independent"},
        "People's Party": {"code": "PPC", "name": "People's Party of Canada"},
    }

    parties_data = []
    for party_short in parties:
        if party_short in party_mapping:
            party_props = {
                "code": party_mapping[party_short]["code"],
                "name": party_mapping[party_short]["name"],
                "short_name": party_short,
                "updated_at": datetime.utcnow().isoformat(),
            }
            parties_data.append(party_props)
        else:
            # Fallback for unmapped parties
            parties_data.append({
                "code": party_short.upper().replace(" ", "_"),
                "name": party_short,
                "short_name": party_short,
                "updated_at": datetime.utcnow().isoformat(),
            })

    # Create parties
    created = neo4j_client.batch_create_nodes("Party", parties_data)
    logger.success(f"✅ Created {created} parties")
    return created


def ingest_ridings(neo4j_client: Neo4jClient) -> int:
    """Ingest electoral ridings (extracted from MPs) with province detection."""
    logger.info("Extracting ridings from MPs...")

    result = neo4j_client.run_query(
        """
        MATCH (m:MP)
        WHERE m.riding IS NOT NULL
        WITH DISTINCT m.riding AS riding_name
        RETURN riding_name
        ORDER BY riding_name
        """
    )

    ridings = [record["riding_name"] for record in result]
    logger.info(f"Found {len(ridings)} unique ridings")

    # Create riding nodes with province detection
    ridings_data = []
    provinces_detected = 0
    for riding in ridings:
        province = detect_province(riding)
        if province:
            provinces_detected += 1

        ridings_data.append({
            "id": riding.lower().replace(" ", "-").replace("'", ""),
            "name": riding,
            "province": province,
            "is_vacant": False,  # All current ridings have MPs (extracted from MP data)
        })

    logger.info(f"Detected provinces for {provinces_detected}/{len(ridings)} ridings")

    created = neo4j_client.batch_create_nodes("Riding", ridings_data)
    logger.success(f"✅ Created {created} ridings with province data")
    return created


def update_vacant_ridings(neo4j_client: Neo4jClient) -> int:
    """
    Update vacancy status for ridings without current MPs.

    This should be called after MPs and ridings are ingested to identify
    ridings that have no current MP representation.

    Returns:
        Number of vacant ridings detected
    """
    logger.info("Checking for vacant ridings...")

    # Find ridings with no current MP (no REPRESENTS relationship)
    result = neo4j_client.run_query(
        """
        MATCH (r:Riding)
        WHERE NOT EXISTS {
            MATCH (m:MP)-[:REPRESENTS]->(r)
            WHERE m.current = true
        }
        SET r.is_vacant = true
        RETURN count(r) as vacant_count
        """
    )

    vacant_count = result[0]["vacant_count"] if result else 0

    if vacant_count > 0:
        logger.warning(f"Found {vacant_count} vacant ridings")
    else:
        logger.success("✅ No vacant ridings detected")

    return vacant_count


def ingest_bills(neo4j_client: Neo4jClient, batch_size: int = 10000, limit: Optional[int] = None, fetch_details: bool = True) -> int:
    """
    Ingest bills from OpenParliament API.

    Args:
        neo4j_client: Neo4j client
        batch_size: Batch size for operations
        limit: Limit number of bills (for testing)
        fetch_details: If True, fetch individual bill details to get sponsor info (slower but more complete)
    """
    logger.info("Fetching bills from OpenParliament API...")
    op_client = OpenParliamentClient()

    # Get list of bills
    bills_raw = []
    for i, bill in enumerate(op_client.list_bills()):
        bills_raw.append(bill)
        if limit and i >= limit - 1:
            break

    logger.info(f"Found {len(bills_raw):,} bills")

    # Fetch detailed bill information if requested
    if fetch_details:
        logger.info("Fetching detailed bill information (this will take a while)...")
        bills_detailed = []
        for i, bill in enumerate(bills_raw):
            if (i + 1) % 100 == 0:
                logger.info(f"  Fetched details for {i + 1}/{len(bills_raw)} bills...")

            try:
                bill_url = bill.get("url")
                if bill_url:
                    bill_detail = op_client.get_bill(bill_url)
                    bills_detailed.append(bill_detail)
                else:
                    bills_detailed.append(bill)
            except Exception as e:
                logger.warning(f"Failed to fetch details for {bill.get('number')} ({bill.get('session')}): {e}")
                bills_detailed.append(bill)  # Use list data as fallback

        bills_raw = bills_detailed
        logger.info(f"✅ Fetched details for {len(bills_detailed)}/{len(bills_raw)} bills")

    # Transform to Neo4j format
    bills_data = []
    for bill in bills_raw:
        bill_props = {
            "number": bill.get("number"),
            "session": bill.get("session"),
            "title": bill.get("name", {}).get("en") or bill.get("short_title", {}).get("en"),
            "status": bill.get("status", {}).get("name") if isinstance(bill.get("status"), dict) else bill.get("status"),
            "introduced_date": bill.get("introduced"),
            "sponsor_politician_url": bill.get("sponsor_politician_url"),
            "updated_at": datetime.utcnow().isoformat(),
        }

        # Filter None values
        bill_props = {k: v for k, v in bill_props.items() if v is not None}
        bills_data.append(bill_props)

    # Batch merge bills (handle duplicates with composite key: number + session)
    created = neo4j_client.batch_merge_nodes("Bill", bills_data, merge_keys=["number", "session"], batch_size=batch_size)
    logger.success(f"✅ Merged {created:,} bills")
    return created


def link_bill_sponsors(neo4j_client: Neo4jClient) -> int:
    """
    Create SPONSORED relationships between MPs and Bills.

    This must be run after both MPs and Bills have been ingested.
    Extracts MP slug from sponsor_politician_url and creates relationships.
    """
    logger.info("Creating SPONSORED relationships...")

    query = """
    MATCH (b:Bill)
    WHERE b.sponsor_politician_url IS NOT NULL
    WITH b, split(b.sponsor_politician_url, '/') AS url_parts
    WITH b, url_parts[size(url_parts)-2] AS mp_slug
    MATCH (m:MP {id: mp_slug})
    MERGE (m)-[:SPONSORED]->(b)
    RETURN count(*) as relationships_created
    """

    result = neo4j_client.run_query(query)
    count = result[0]["relationships_created"] if result else 0
    logger.success(f"✅ Created {count:,} SPONSORED relationships")
    return count


def ingest_bills_from_legisinfo_json(neo4j_client: Neo4jClient, batch_size: int = 10000) -> int:
    """
    Ingest bills from LEGISinfo JSON bulk export (FAST - single file download).

    This is the preferred method for bill ingestion as it:
    - Downloads a single 204KB JSON file (vs thousands of API calls)
    - Contains 100% sponsor coverage (vs 88% from OpenParliament list)
    - Completes in ~1 second (vs 50+ minutes for full ingestion)
    - No rate limiting concerns

    Args:
        neo4j_client: Neo4j client
        batch_size: Batch size for operations

    Returns:
        Number of bills created/updated
    """
    logger.info("Downloading bills from LEGISinfo JSON bulk export...")

    # Download JSON file
    url = "https://www.parl.ca/legisinfo/en/bills/json"
    response = requests.get(url, timeout=30)
    response.raise_for_status()
    bills_json = response.json()

    logger.info(f"Downloaded {len(bills_json):,} bills from LEGISinfo")

    # Transform to Neo4j format
    bills_data = []
    sponsor_mapping = {}  # Track sponsors for relationship creation

    for bill in bills_json:
        bill_number = bill.get("BillNumberFormatted")
        session = bill.get("ParlSessionCode")
        sponsor_name = bill.get("SponsorEn")

        # Extract parliament and session from code like "45-1"
        if session and "-" in session:
            parl, sess = session.split("-")
            parliament = int(parl)
            session_num = int(sess)
        else:
            parliament = None
            session_num = None

        bill_props = {
            "number": bill_number,
            "session": session,
            "parliament": parliament,
            "session_number": session_num,
            "title": bill.get("LongTitleEn") or bill.get("ShortTitleEn"),
            "title_fr": bill.get("LongTitleFr") or bill.get("ShortTitleFr"),
            "status": bill.get("CurrentStatusEn"),
            "status_fr": bill.get("CurrentStatusFr"),
            "sponsor_name": sponsor_name,
            "introduced_date": bill.get("IntroducedDateTime"),
            "updated_at": datetime.utcnow().isoformat(),
        }

        # Add optional date fields if present
        optional_dates = [
            ("passed_house_first_reading", "PassedHouseFirstReadingDateTime"),
            ("passed_house_second_reading", "PassedHouseSecondReadingDateTime"),
            ("passed_house_third_reading", "PassedHouseThirdReadingDateTime"),
            ("passed_senate_first_reading", "PassedSenateFirstReadingDateTime"),
            ("passed_senate_second_reading", "PassedSenateSecondReadingDateTime"),
            ("passed_senate_third_reading", "PassedSenateThirdReadingDateTime"),
            ("royal_assent", "RoyalAssentDateTime"),
        ]

        for prop_name, json_field in optional_dates:
            if bill.get(json_field):
                bill_props[prop_name] = bill.get(json_field)

        # Filter None values
        bill_props = {k: v for k, v in bill_props.items() if v is not None}
        bills_data.append(bill_props)

        # Track sponsor for relationship creation
        if sponsor_name and bill_number and session:
            sponsor_mapping[f"{bill_number}-{session}"] = sponsor_name

    # Batch merge bills
    created = neo4j_client.batch_merge_nodes("Bill", bills_data, merge_keys=["number", "session"], batch_size=batch_size)
    logger.success(f"✅ Merged {created:,} bills from LEGISinfo JSON")

    # Create SPONSORED relationships using sponsor names
    logger.info("Creating SPONSORED relationships from sponsor names...")
    rel_count = link_bill_sponsors_by_name(neo4j_client, sponsor_mapping)
    logger.success(f"✅ Created {rel_count:,} SPONSORED relationships")

    return created


def link_bill_sponsors_by_name(neo4j_client: Neo4jClient, sponsor_mapping: Dict[str, str]) -> int:
    """
    Create SPONSORED relationships using sponsor names from LEGISinfo.

    LEGISinfo provides sponsor names (e.g., "Hon. Mark Carney") rather than URLs,
    so we need to match against MP names in the database.

    Args:
        neo4j_client: Neo4j client
        sponsor_mapping: Dict mapping "bill_number-session" to sponsor name

    Returns:
        Number of relationships created
    """
    if not sponsor_mapping:
        return 0

    # Strategy: Try exact name match, then fuzzy match on family name
    query = """
    UNWIND $bill_sponsors AS bs
    MATCH (b:Bill {number: bs.bill_number, session: bs.session})

    // Try exact match first
    OPTIONAL MATCH (m1:MP)
    WHERE m1.name = bs.sponsor_name
       OR m1.name CONTAINS bs.sponsor_name
       OR bs.sponsor_name CONTAINS m1.name

    // If no exact match, try matching on family name
    OPTIONAL MATCH (m2:MP)
    WHERE bs.sponsor_name CONTAINS m2.family_name
      AND m2.family_name IS NOT NULL
      AND size(m2.family_name) > 3

    WITH b, COALESCE(m1, m2) AS mp
    WHERE mp IS NOT NULL
    MERGE (mp)-[:SPONSORED]->(b)
    RETURN count(*) as relationships_created
    """

    # Prepare data
    bill_sponsors = []
    for bill_key, sponsor_name in sponsor_mapping.items():
        parts = bill_key.rsplit("-", 1)
        if len(parts) == 2:
            bill_number, session = parts
            # Clean sponsor name - remove titles
            clean_name = sponsor_name
            for title in ["Hon. ", "Sen. ", "Mr. ", "Mrs. ", "Ms. ", "Dr. "]:
                clean_name = clean_name.replace(title, "")
            clean_name = clean_name.strip()

            bill_sponsors.append({
                "bill_number": bill_number,
                "session": session,
                "sponsor_name": clean_name
            })

    result = neo4j_client.run_query(query, {"bill_sponsors": bill_sponsors})
    count = result[0]["relationships_created"] if result else 0
    return count


def ingest_votes(neo4j_client: Neo4jClient, batch_size: int = 10000, limit: Optional[int] = None) -> int:
    """Ingest parliamentary votes."""
    logger.info("Fetching votes from OpenParliament API...")
    op_client = OpenParliamentClient()

    votes_raw = []
    for i, vote in enumerate(op_client.list_votes()):
        votes_raw.append(vote)
        if limit and i >= limit - 1:
            break

    logger.info(f"Found {len(votes_raw):,} votes")

    # Transform to Neo4j format
    votes_data = []
    for vote in votes_raw:
        vote_props = {
            "id": f"{vote.get('session')}-{vote.get('number')}",
            "number": vote.get("number"),
            "session": vote.get("session"),
            "date": vote.get("date"),
            "result": vote.get("result"),
            "yeas": vote.get("yea_total"),  # OpenParliament uses yea_total, not yeas
            "nays": vote.get("nay_total"),  # OpenParliament uses nay_total, not nays
            "paired": vote.get("paired_total"),  # OpenParliament uses paired_total
            "bill_url": vote.get("bill_url"),  # Capture bill URL for relationship creation
            "updated_at": datetime.utcnow().isoformat(),
        }

        # Filter None values
        vote_props = {k: v for k, v in vote_props.items() if v is not None}
        votes_data.append(vote_props)

    # Batch create votes
    created = neo4j_client.batch_create_nodes("Vote", votes_data, batch_size=batch_size)
    logger.success(f"✅ Created {created:,} votes")
    return created


def ingest_committees(neo4j_client: Neo4jClient) -> int:
    """Ingest parliamentary committees."""
    logger.info("Fetching committees from OpenParliament API...")
    op_client = OpenParliamentClient()

    committees_raw = list(op_client.list_committees())
    logger.info(f"Found {len(committees_raw)} committees")

    # Transform to Neo4j format
    committees_data = []
    for committee in committees_raw:
        # Determine chamber from parent_url (null = Commons, otherwise Senate/Joint)
        parent_url = committee.get("parent_url")
        if parent_url and "senate" in parent_url.lower():
            chamber = "Senate"
        elif parent_url:
            chamber = "Joint"
        else:
            chamber = "Commons"

        committee_props = {
            "code": committee.get("slug"),
            "name": committee.get("name", {}).get("en") or committee.get("short_name", {}).get("en"),
            "name_fr": committee.get("name", {}).get("fr") or committee.get("short_name", {}).get("fr"),
            "short_name": committee.get("short_name", {}).get("en"),
            "short_name_fr": committee.get("short_name", {}).get("fr"),
            "chamber": chamber,
            "updated_at": datetime.utcnow().isoformat(),
        }

        # Filter None values
        committee_props = {k: v for k, v in committee_props.items() if v is not None}
        committees_data.append(committee_props)

    # Create committees
    created = neo4j_client.batch_create_nodes("Committee", committees_data)
    logger.success(f"✅ Created {created} committees")
    return created


def ingest_government_roles(neo4j_client: Neo4jClient, batch_size: int = 10000) -> int:
    """
    Ingest Cabinet ministers and Parliamentary Secretaries from House of Commons XML.

    Creates Role nodes with temporal tracking (from_date, to_date, is_current) for:
    - Cabinet ministers (including Prime Minister)
    - Parliamentary Secretaries

    Args:
        neo4j_client: Neo4j client instance
        batch_size: Batch size for Neo4j operations

    Returns:
        Number of roles created
    """
    logger.info("Fetching government roles from House of Commons XML...")

    from fedmcp.clients.roles import GovernmentRolesClient
    roles_client = GovernmentRolesClient()

    roles_data = []

    # Fetch ministers
    logger.info("Fetching Cabinet ministers...")
    ministers = roles_client.get_ministers()
    logger.info(f"Found {len(ministers)} ministers")

    for minister in ministers:
        role_props = {
            "id": f"minister-{minister.person_id}-{int(minister.from_date.timestamp())}",
            "person_id": minister.person_id,
            "title": minister.title,
            "role_type": "Prime Minister" if minister.title == "Prime Minister" else "Cabinet Minister",
            "from_date": minister.from_date.isoformat(),
            "to_date": minister.to_date.isoformat() if minister.to_date else None,
            "order_of_precedence": minister.order_of_precedence,
            "is_current": minister.is_current,
            "updated_at": datetime.utcnow().isoformat(),
        }
        # Filter None values
        roles_data.append({k: v for k, v in role_props.items() if v is not None})

    # Fetch Parliamentary Secretaries
    logger.info("Fetching Parliamentary Secretaries...")
    secretaries = roles_client.get_parliamentary_secretaries()
    logger.info(f"Found {len(secretaries)} Parliamentary Secretaries")

    for ps in secretaries:
        role_props = {
            "id": f"ps-{ps.person_id}",
            "person_id": ps.person_id,
            "title": ps.title,
            "role_type": "Parliamentary Secretary",
            "is_current": True,  # PS data only includes current roles
            "updated_at": datetime.utcnow().isoformat(),
        }
        roles_data.append({k: v for k, v in role_props.items() if v is not None})

    # Batch create roles
    created = neo4j_client.batch_create_nodes("Role", roles_data, batch_size=batch_size)
    logger.success(f"✅ Created {created} government roles")
    return created


def link_government_roles(neo4j_client: Neo4jClient) -> int:
    """
    Create HOLDS_ROLE relationships between MPs and government Roles.

    Matches MPs to Roles using the numeric parl_mp_id field from OpenParliament
    API which corresponds to the person_id field in government roles XML.

    This must be run after both MPs and Roles have been ingested.

    Args:
        neo4j_client: Neo4j client instance

    Returns:
        Number of relationships created
    """
    logger.info("Creating HOLDS_ROLE relationships...")

    query = """
    MATCH (r:Role)
    WHERE r.person_id IS NOT NULL
    MATCH (m:MP)
    WHERE m.parl_mp_id = r.person_id
    MERGE (m)-[:HOLDS_ROLE]->(r)
    RETURN count(*) as relationships_created
    """

    result = neo4j_client.run_query(query)
    count = result[0]["relationships_created"] if result else 0
    logger.success(f"✅ Created {count:,} HOLDS_ROLE relationships")
    return count


def ingest_committee_memberships(neo4j_client: Neo4jClient) -> int:
    """
    Scrape committee membership from House of Commons website and create MEMBER_OF relationships.

    This scrapes the current membership from committee pages at ourcommons.ca
    and creates relationships between MPs and Committees with role information.

    Args:
        neo4j_client: Neo4j client instance

    Returns:
        Number of relationships created
    """
    logger.info("Scraping committee memberships from House of Commons website...")

    from fedmcp.clients.committee_membership import CommitteeMembershipClient

    # Get all committees from Neo4j
    query = "MATCH (c:Committee) RETURN c.code as code, c.name as name"
    committees = neo4j_client.run_query(query)

    if not committees:
        logger.warning("No committees found in database. Run ingest_committees first.")
        return 0

    membership_client = CommitteeMembershipClient()
    relationships_created = 0
    failed_committees = []

    for committee in committees:
        code = committee["code"]
        name = committee["name"]

        try:
            logger.info(f"Fetching members for {code} ({name})...")
            members = membership_client.get_committee_members(code)
            logger.info(f"Found {len(members)} members for {code}")

            # Create relationships for each member
            for member in members:
                # Try to match MP by name
                # Use case-insensitive matching and handle various name formats
                match_query = """
                MATCH (m:MP)
                WHERE toLower(m.name) = toLower($member_name)
                   OR toLower(m.name) CONTAINS toLower($member_name)
                   OR toLower($member_name) CONTAINS toLower(m.name)
                MATCH (c:Committee {code: $committee_code})
                MERGE (m)-[r:MEMBER_OF]->(c)
                SET r.role = $role,
                    r.updated_at = $updated_at
                RETURN count(*) as created
                """

                result = neo4j_client.run_query(
                    match_query,
                    {
                        "member_name": member.name,
                        "committee_code": code,
                        "role": member.role,
                        "updated_at": datetime.utcnow().isoformat(),
                    }
                )

                if result and result[0]["created"] > 0:
                    relationships_created += result[0]["created"]
                    logger.debug(f"  ✓ Linked {member.name} as {member.role}")
                else:
                    logger.warning(f"  ✗ Could not find MP: {member.name}")

        except Exception as e:
            logger.error(f"Failed to fetch members for {code}: {e}")
            failed_committees.append(code)
            continue

    logger.success(f"✅ Created {relationships_created} committee membership relationships")
    if failed_committees:
        logger.warning(f"Failed to fetch membership for {len(failed_committees)} committees: {', '.join(failed_committees)}")

    return relationships_created


def ingest_parliament_data(
    neo4j_client: Neo4jClient,
    batch_size: int = 10000,
    limit_bills: Optional[int] = None,
    limit_votes: Optional[int] = None,
) -> Dict[str, int]:
    """
    Run full parliament data ingestion pipeline.

    Args:
        neo4j_client: Neo4j client
        batch_size: Batch size for operations
        limit_bills: Limit number of bills (for testing)
        limit_votes: Limit number of votes (for testing)

    Returns:
        Dict with counts of created entities
    """
    logger.info("=" * 60)
    logger.info("PARLIAMENT DATA INGESTION")
    logger.info("=" * 60)

    stats = {}

    # 1. MPs
    stats["mps"] = ingest_mps(neo4j_client, batch_size)

    # 2. Parties (derived from MPs)
    stats["parties"] = ingest_parties(neo4j_client)

    # 3. Ridings (derived from MPs)
    stats["ridings"] = ingest_ridings(neo4j_client)

    # 4. Bills (using LEGISinfo JSON bulk export - fast!)
    # Note: This also creates SPONSORED relationships internally
    stats["bills"] = ingest_bills_from_legisinfo_json(neo4j_client, batch_size)
    stats["bill_sponsors"] = "included"  # Handled by ingest_bills_from_legisinfo_json

    # 5. Votes
    stats["votes"] = ingest_votes(neo4j_client, batch_size, limit=limit_votes)

    # 6. Committees
    stats["committees"] = ingest_committees(neo4j_client)

    # 7. Government roles (Cabinet ministers and Parliamentary Secretaries)
    stats["roles"] = ingest_government_roles(neo4j_client, batch_size)

    # 8. Link government roles to MPs
    stats["role_relationships"] = link_government_roles(neo4j_client)

    logger.info("=" * 60)
    logger.success("✅ PARLIAMENT DATA INGESTION COMPLETE")
    logger.info(f"MPs: {stats['mps']:,}")
    logger.info(f"Parties: {stats['parties']}")
    logger.info(f"Ridings: {stats['ridings']}")
    logger.info(f"Bills: {stats['bills']:,}")
    logger.info(f"Bill Sponsors: {stats['bill_sponsors']:,}")
    logger.info(f"Votes: {stats['votes']:,}")
    logger.info(f"Committees: {stats['committees']}")
    logger.info(f"Government Roles: {stats['roles']}")
    logger.info(f"MP-Role Relationships: {stats['role_relationships']:,}")
    logger.info("=" * 60)

    return stats
