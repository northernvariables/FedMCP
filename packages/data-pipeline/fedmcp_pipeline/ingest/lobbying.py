"""Lobbying data ingestion: registrations, communications, lobbyists, organizations."""

import sys
from datetime import datetime
from pathlib import Path
from typing import Dict, Any

# Add fedmcp package to path
FEDMCP_PATH = Path(__file__).parent.parent.parent.parent / "fedmcp" / "src"
sys.path.insert(0, str(FEDMCP_PATH))

from fedmcp.clients.lobbying import LobbyingRegistryClient

from ..utils.neo4j_client import Neo4jClient
from ..utils.progress import logger


def ingest_lobbying_data(neo4j_client: Neo4jClient, batch_size: int = 10000) -> Dict[str, int]:
    """
    Ingest lobbying registry data.

    Downloads ~90MB CSV data from Open Canada portal, caches locally,
    and loads into Neo4j.

    Args:
        neo4j_client: Neo4j client
        batch_size: Batch size for operations

    Returns:
        Dict with counts of created entities
    """
    logger.info("=" * 60)
    logger.info("LOBBYING DATA INGESTION")
    logger.info("=" * 60)

    lobby_client = LobbyingRegistryClient()

    stats = {}

    # Track unique entities for later creation
    unique_organizations = {}
    unique_lobbyists = {}

    # 1. Lobby Registrations
    logger.info("Fetching lobby registrations (may download 90MB on first run)...")
    registrations = lobby_client.search_registrations(active_only=False, limit=None)
    logger.info(f"Found {len(registrations):,} registrations")

    # Transform to Neo4j format with ALL fields
    reg_data = []
    for i, reg in enumerate(registrations):
        # Extract organization
        org_name = reg.client_org_name
        if org_name and org_name not in unique_organizations:
            unique_organizations[org_name] = {
                "id": f"org-{len(unique_organizations)}",
                "name": org_name,
            }

        # Extract lobbyist
        lobbyist_name = reg.registrant_name
        if lobbyist_name and lobbyist_name not in unique_lobbyists:
            unique_lobbyists[lobbyist_name] = {
                "id": f"lobbyist-{len(unique_lobbyists)}",
                "name": lobbyist_name,
            }

        reg_props = {
            "id": reg.reg_id or f"reg-{i}",
            "reg_number": reg.reg_number,
            "client_org_name": reg.client_org_name,
            "registrant_name": reg.registrant_name,
            "effective_date": reg.effective_date,
            "end_date": reg.end_date if reg.end_date and reg.end_date != "null" else None,
            "active": reg.is_active,
            "subject_matters": reg.subject_matters if reg.subject_matters else [],
            "government_institutions": reg.government_institutions if reg.government_institutions else [],
            "updated_at": datetime.utcnow().isoformat(),
        }
        reg_props = {k: v for k, v in reg_props.items() if v is not None}
        reg_data.append(reg_props)

        # Log progress every 10,000 registrations
        if (i + 1) % 10000 == 0:
            logger.info(f"Processed {i + 1:,} registrations...")

    stats["lobby_registrations"] = neo4j_client.batch_create_nodes("LobbyRegistration", reg_data, batch_size)

    # 2. Lobby Communications
    logger.info("Fetching lobby communications...")
    communications = lobby_client.search_communications(limit=None)  # Process ALL
    logger.info(f"Found {len(communications):,} communications")

    comm_data = []
    for i, comm in enumerate(communications):
        # Extract organization
        org_name = comm.client_org_name
        if org_name and org_name not in unique_organizations:
            unique_organizations[org_name] = {
                "id": f"org-{len(unique_organizations)}",
                "name": org_name,
            }

        # Extract lobbyist
        lobbyist_name = comm.registrant_name
        if lobbyist_name and lobbyist_name not in unique_lobbyists:
            unique_lobbyists[lobbyist_name] = {
                "id": f"lobbyist-{len(unique_lobbyists)}",
                "name": lobbyist_name,
            }

        comm_props = {
            "id": comm.comlog_id or f"comm-{i}",
            "client_org_name": comm.client_org_name,
            "registrant_name": comm.registrant_name,
            "date": comm.comm_date,
            "dpoh_names": comm.dpoh_names if comm.dpoh_names else [],
            "dpoh_titles": comm.dpoh_titles if comm.dpoh_titles else [],
            "institutions": comm.institutions if comm.institutions else [],
            "subject_matters": comm.subject_matters if comm.subject_matters else [],
            "updated_at": datetime.utcnow().isoformat(),
        }
        comm_props = {k: v for k, v in comm_props.items() if v is not None}
        comm_data.append(comm_props)

        # Log progress every 10,000 communications
        if (i + 1) % 10000 == 0:
            logger.info(f"Processed {i + 1:,} communications...")

    stats["lobby_communications"] = neo4j_client.batch_create_nodes("LobbyCommunication", comm_data, batch_size)

    # 3. Create Organizations
    logger.info(f"Creating {len(unique_organizations):,} unique organizations...")
    org_data = list(unique_organizations.values())
    stats["organizations"] = neo4j_client.batch_create_nodes("Organization", org_data, batch_size)

    # 4. Create Lobbyists
    logger.info(f"Creating {len(unique_lobbyists):,} unique lobbyists...")
    lobbyist_data = list(unique_lobbyists.values())
    stats["lobbyists"] = neo4j_client.batch_create_nodes("Lobbyist", lobbyist_data, batch_size)

    logger.info("=" * 60)
    logger.success("✅ LOBBYING DATA INGESTION COMPLETE")
    logger.info(f"Registrations: {stats['lobby_registrations']:,}")
    logger.info(f"Communications: {stats['lobby_communications']:,}")
    logger.info(f"Organizations: {stats['organizations']:,}")
    logger.info(f"Lobbyists: {stats['lobbyists']:,}")
    logger.info("=" * 60)

    return stats
