"""Client modules for accessing Canadian parliamentary and legal data sources."""

from .openparliament import OpenParliamentClient
from .ourcommons import OurCommonsHansardClient, HansardSitting, HansardSection, HansardSpeech
from .legisinfo import LegisInfoClient
from .canlii import CanLIIClient
from .represent import RepresentClient

__all__ = [
    "OpenParliamentClient",
    "OurCommonsHansardClient",
    "HansardSitting",
    "HansardSection",
    "HansardSpeech",
    "LegisInfoClient",
    "CanLIIClient",
    "RepresentClient",
]
