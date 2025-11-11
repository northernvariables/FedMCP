"""Lobbying network relationships: WORKS_FOR, LOBBIED_ON, MET_WITH."""

from typing import Dict, Any

from ..utils.neo4j_client import Neo4jClient
from ..utils.progress import logger


def build_lobbying_network(neo4j_client: Neo4jClient, batch_size: int = 10000) -> Dict[str, int]:
    """
    Build lobbying network relationships.

    Creates:
    - (Lobbyist)-[:WORKS_FOR]->(Organization)
    - (Lobbyist)-[:REGISTERED_FOR]->(LobbyRegistration)
    - (LobbyRegistration)-[:ON_BEHALF_OF]->(Organization)
    - (LobbyCommunication)-[:COMMUNICATION_BY]->(Organization)
    - (LobbyCommunication)-[:CONDUCTED_BY]->(Lobbyist)
    - (LobbyCommunication)-[:CONTACTED]->(MP)
    - (Lobbyist)-[:MET_WITH]->(MP) with date properties

    Args:
        neo4j_client: Neo4j client
        batch_size: Batch size for operations

    Returns:
        Dict with counts of created relationships
    """
    logger.info("=" * 60)
    logger.info("BUILDING LOBBYING NETWORK")
    logger.info("=" * 60)

    stats = {}

    # 1. Link Lobbyists to Organizations (WORKS_FOR)
    # Match lobbyist names from registrations to link them to organizations
    logger.info("Creating WORKS_FOR relationships (Lobbyist -> Organization)...")
    works_for_query = """
    MATCH (l:Lobbyist), (r:LobbyRegistration)
    WHERE l.name = r.registrant_name
    MATCH (o:Organization)
    WHERE o.name = r.client_org_name
    MERGE (l)-[:WORKS_FOR]->(o)
    RETURN count(*) as count
    """
    result = neo4j_client.run_query(works_for_query)
    stats["works_for"] = result[0]["count"] if result else 0
    logger.info(f"Created {stats['works_for']:,} WORKS_FOR relationships")

    # 2. Link Lobbyists to LobbyRegistrations (REGISTERED_FOR)
    logger.info("Creating REGISTERED_FOR relationships (Lobbyist -> LobbyRegistration)...")
    registered_for_query = """
    MATCH (l:Lobbyist), (r:LobbyRegistration)
    WHERE l.name = r.registrant_name
    MERGE (l)-[:REGISTERED_FOR]->(r)
    RETURN count(*) as count
    """
    result = neo4j_client.run_query(registered_for_query)
    stats["registered_for"] = result[0]["count"] if result else 0
    logger.info(f"Created {stats['registered_for']:,} REGISTERED_FOR relationships")

    # 3. Link LobbyRegistrations to Organizations (ON_BEHALF_OF)
    logger.info("Creating ON_BEHALF_OF relationships (LobbyRegistration -> Organization)...")
    on_behalf_of_query = """
    MATCH (r:LobbyRegistration), (o:Organization)
    WHERE o.name = r.client_org_name
    MERGE (r)-[:ON_BEHALF_OF]->(o)
    RETURN count(*) as count
    """
    result = neo4j_client.run_query(on_behalf_of_query)
    stats["on_behalf_of"] = result[0]["count"] if result else 0
    logger.info(f"Created {stats['on_behalf_of']:,} ON_BEHALF_OF relationships")

    # 4. Link LobbyCommunications to Organizations (COMMUNICATION_BY)
    logger.info("Creating COMMUNICATION_BY relationships (LobbyCommunication -> Organization)...")
    comm_by_org_query = """
    MATCH (c:LobbyCommunication), (o:Organization)
    WHERE o.name = c.client_org_name
    MERGE (c)-[:COMMUNICATION_BY]->(o)
    RETURN count(*) as count
    """
    result = neo4j_client.run_query(comm_by_org_query)
    stats["communication_by"] = result[0]["count"] if result else 0
    logger.info(f"Created {stats['communication_by']:,} COMMUNICATION_BY relationships")

    # 5. Link LobbyCommunications to Lobbyists (CONDUCTED_BY)
    logger.info("Creating CONDUCTED_BY relationships (LobbyCommunication -> Lobbyist)...")
    conducted_by_query = """
    MATCH (c:LobbyCommunication), (l:Lobbyist)
    WHERE l.name = c.registrant_name
    MERGE (c)-[:CONDUCTED_BY]->(l)
    RETURN count(*) as count
    """
    result = neo4j_client.run_query(conducted_by_query)
    stats["conducted_by"] = result[0]["count"] if result else 0
    logger.info(f"Created {stats['conducted_by']:,} CONDUCTED_BY relationships")

    # 6. Link LobbyCommunications to MPs (CONTACTED)
    # Match DPOH names to MP names - this is fuzzy matching
    logger.info("Creating CONTACTED relationships (LobbyCommunication -> MP)...")
    contacted_query = """
    MATCH (c:LobbyCommunication), (mp:MP)
    WHERE any(dpoh IN c.dpoh_names WHERE mp.name CONTAINS dpoh OR dpoh CONTAINS mp.name)
    MERGE (c)-[:CONTACTED]->(mp)
    RETURN count(*) as count
    """
    result = neo4j_client.run_query(contacted_query)
    stats["contacted"] = result[0]["count"] if result else 0
    logger.info(f"Created {stats['contacted']:,} CONTACTED relationships")

    # 7. Link Lobbyists to MPs (MET_WITH) with date properties from communications
    logger.info("Creating MET_WITH relationships (Lobbyist -> MP)...")
    met_with_query = """
    MATCH (l:Lobbyist)-[:CONDUCTED_BY]-(c:LobbyCommunication)-[:CONTACTED]->(mp:MP)
    MERGE (l)-[r:MET_WITH]->(mp)
    ON CREATE SET r.first_contact = c.date, r.last_contact = c.date
    ON MATCH SET r.last_contact = CASE
        WHEN r.last_contact IS NULL OR c.date > r.last_contact
        THEN c.date
        ELSE r.last_contact
    END
    RETURN count(DISTINCT r) as count
    """
    result = neo4j_client.run_query(met_with_query)
    stats["met_with"] = result[0]["count"] if result else 0
    logger.info(f"Created {stats['met_with']:,} MET_WITH relationships")

    logger.info("=" * 60)
    logger.success("✅ LOBBYING NETWORK COMPLETE")
    logger.info(f"WORKS_FOR: {stats.get('works_for', 0):,}")
    logger.info(f"REGISTERED_FOR: {stats.get('registered_for', 0):,}")
    logger.info(f"ON_BEHALF_OF: {stats.get('on_behalf_of', 0):,}")
    logger.info(f"COMMUNICATION_BY: {stats.get('communication_by', 0):,}")
    logger.info(f"CONDUCTED_BY: {stats.get('conducted_by', 0):,}")
    logger.info(f"CONTACTED: {stats.get('contacted', 0):,}")
    logger.info(f"MET_WITH: {stats.get('met_with', 0):,}")
    logger.info("=" * 60)

    return stats
