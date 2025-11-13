"""Financial flow relationships: INCURRED, RECEIVED, DONATED."""

from typing import Dict, Any

from ..utils.neo4j_client import Neo4jClient
from ..utils.progress import logger


def build_financial_flows(neo4j_client: Neo4jClient, batch_size: int = 10000) -> Dict[str, int]:
    """
    Build financial flow relationships.

    Creates:
    - (MP)-[:INCURRED]->(Expense)
    - (Organization)-[:RECEIVED]->(Contract)
    - (Organization)-[:DONATED]->(Party)

    Args:
        neo4j_client: Neo4j client
        batch_size: Batch size for operations

    Returns:
        Dict with counts of created relationships
    """
    logger.info("=" * 60)
    logger.info("BUILDING FINANCIAL FLOWS")
    logger.info("=" * 60)

    stats = {}

    # 1. MP INCURRED Expense
    logger.info("Creating (MP)-[:INCURRED]->(Expense) relationships...")

    result = neo4j_client.run_query(
        """
        MATCH (m:MP), (e:Expense)
        WHERE e.mp_id = m.id
        RETURN m.id AS mp_id, e.id AS expense_id
        LIMIT 10000
        """
    )

    incurred_rels = [
        {"from_id": record["mp_id"], "to_id": record["expense_id"]}
        for record in result
    ]

    if incurred_rels:
        stats["incurred"] = neo4j_client.batch_create_relationships(
            "INCURRED",
            incurred_rels,
            from_label="MP",
            to_label="Expense",
            batch_size=batch_size,
        )
    else:
        stats["incurred"] = 0

    # TODO: RECEIVED (contracts/grants), DONATED relationships
    stats["received"] = 0
    stats["donated"] = 0

    logger.info("=" * 60)
    logger.success("✅ FINANCIAL FLOWS COMPLETE")
    logger.info(f"INCURRED: {stats['incurred']:,}")
    logger.info(f"RECEIVED: {stats['received']:,} (TODO)")
    logger.info(f"DONATED: {stats['donated']:,} (TODO)")
    logger.info("=" * 60)

    return stats
