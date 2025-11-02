"""FedMCP - MCP server for Canadian federal parliamentary and legal information."""

from .clients import (
    OpenParliamentClient,
    OurCommonsHansardClient,
    LegisInfoClient,
    CanLIIClient,
    HansardSitting,
    HansardSection,
    HansardSpeech,
)

__version__ = "0.1.0"

__all__ = [
    "OpenParliamentClient",
    "OurCommonsHansardClient",
    "LegisInfoClient",
    "CanLIIClient",
    "HansardSitting",
    "HansardSection",
    "HansardSpeech",
]
