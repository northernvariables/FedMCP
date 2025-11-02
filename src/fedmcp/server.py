"""FedMCP Server - MCP server for Canadian federal parliamentary and legal information."""

import os
import asyncio
import logging
from typing import Any, Optional
from dataclasses import asdict
from itertools import islice

from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

from mcp.server import Server
from mcp.types import (
    Tool,
    TextContent,
    ImageContent,
    EmbeddedResource,
)
import mcp.server.stdio

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

from .clients import (
    OpenParliamentClient,
    OurCommonsHansardClient,
    LegisInfoClient,
    CanLIIClient,
    RepresentClient,
)

# Initialize clients
op_client = OpenParliamentClient()
hansard_client = OurCommonsHansardClient()
legis_client = LegisInfoClient()
represent_client = RepresentClient()

# Initialize CanLII client if API key is available
canlii_api_key = os.getenv("CANLII_API_KEY")
canlii_client = CanLIIClient(api_key=canlii_api_key) if canlii_api_key else None

# Create server instance
app = Server("fedmcp")


# Helper functions
async def run_sync(func, *args, **kwargs):
    """Run a synchronous function in a thread pool to avoid blocking the event loop."""
    return await asyncio.to_thread(func, *args, **kwargs)


def validate_limit(limit: Optional[int], min_val: int = 1, max_val: int = 50, default: int = 10) -> int:
    """Validate and normalize limit parameter.

    Args:
        limit: The limit value to validate
        min_val: Minimum allowed value
        max_val: Maximum allowed value
        default: Default value if limit is None

    Returns:
        Validated limit value

    Raises:
        ValueError: If limit is out of range
    """
    if limit is None:
        return default
    if not isinstance(limit, int):
        raise ValueError(f"limit must be an integer, got {type(limit).__name__}")
    if limit < min_val or limit > max_val:
        raise ValueError(f"limit must be between {min_val} and {max_val}, got {limit}")
    return limit


def sanitize_error_message(error: Exception) -> str:
    """Sanitize error messages to avoid leaking sensitive information.

    Args:
        error: The exception to sanitize

    Returns:
        Sanitized error message
    """
    import re
    error_str = str(error)
    # Remove API keys from error messages
    error_str = re.sub(r'api[_-]?key[=:]\s*[^\s&]+', 'api_key=***', error_str, flags=re.IGNORECASE)
    # Remove Bearer tokens (do this before generic token regex)
    error_str = re.sub(r'Bearer\s+[^\s&]+', 'Bearer ***', error_str, flags=re.IGNORECASE)
    # Remove tokens (matches: token=xxx, token: xxx)
    error_str = re.sub(r'token[=:]\s*[^\s&]+', 'token=***', error_str, flags=re.IGNORECASE)
    return error_str


@app.list_tools()
async def list_tools() -> list[Tool]:
    """List available MCP tools."""
    tools = [
        Tool(
            name="search_debates",
            description="Search Canadian House of Commons debates by keyword. Returns debate records with date, speaker, and content.",
            inputSchema={
                "type": "object",
                "properties": {
                    "query": {
                        "type": "string",
                        "description": "Keywords to search in debates",
                    },
                    "limit": {
                        "type": "integer",
                        "description": "Maximum number of results (1-50)",
                        "default": 10,
                        "minimum": 1,
                        "maximum": 50,
                    },
                },
                "required": ["query"],
            },
        ),
        Tool(
            name="search_bills",
            description="Search for Canadian bills by number (e.g., C-249) or keywords. Searches both LEGISinfo and OpenParliament.",
            inputSchema={
                "type": "object",
                "properties": {
                    "query": {
                        "type": "string",
                        "description": "Bill number (e.g., C-249) or keywords",
                    },
                    "session": {
                        "type": "string",
                        "description": "Parliamentary session (e.g., 45-1), required for specific bill lookup",
                    },
                    "sponsor": {
                        "type": "string",
                        "description": "Filter by bill sponsor - politician URL (e.g., '/politicians/pierre-poilievre/')",
                    },
                    "limit": {
                        "type": "integer",
                        "description": "Maximum number of results (1-50)",
                        "default": 10,
                        "minimum": 1,
                        "maximum": 50,
                    },
                },
                "required": ["query"],
            },
        ),
        Tool(
            name="search_hansard",
            description="Search the latest House of Commons Hansard transcript for quotes or keywords. Returns matching speeches with full context.",
            inputSchema={
                "type": "object",
                "properties": {
                    "query": {
                        "type": "string",
                        "description": "Quote or keywords to search in Hansard",
                    },
                    "limit": {
                        "type": "integer",
                        "description": "Maximum number of speeches to return (1-20)",
                        "default": 5,
                        "minimum": 1,
                        "maximum": 20,
                    },
                },
                "required": ["query"],
            },
        ),
        Tool(
            name="get_committee_evidence",
            description="Get transcript evidence from a specific committee meeting. Returns speeches and testimony from witnesses and MPs.",
            inputSchema={
                "type": "object",
                "properties": {
                    "parliament": {
                        "type": "string",
                        "description": "Parliament number (e.g., '44')",
                    },
                    "session": {
                        "type": "string",
                        "description": "Session number (e.g., '1')",
                    },
                    "committee": {
                        "type": "string",
                        "description": "Committee code (e.g., 'ETHI' for Ethics, 'ENVI' for Environment)",
                    },
                    "meeting": {
                        "type": "integer",
                        "description": "Meeting number",
                    },
                    "search": {
                        "type": "string",
                        "description": "Optional: Search for specific keywords in the transcript",
                    },
                    "limit": {
                        "type": "integer",
                        "description": "Maximum number of speeches to return (if searching)",
                        "default": 10,
                        "minimum": 1,
                        "maximum": 50,
                    },
                },
                "required": ["parliament", "session", "committee", "meeting"],
            },
        ),
        Tool(
            name="list_debates",
            description="List recent House of Commons debates with pagination and optional date filtering.",
            inputSchema={
                "type": "object",
                "properties": {
                    "limit": {
                        "type": "integer",
                        "description": "Number of results to return",
                        "default": 5,
                        "minimum": 1,
                        "maximum": 100,
                    },
                    "offset": {
                        "type": "integer",
                        "description": "Offset for pagination",
                        "default": 0,
                        "minimum": 0,
                    },
                    "date_after": {
                        "type": "string",
                        "description": "Filter debates after this date (YYYY-MM-DD format)",
                    },
                    "date_before": {
                        "type": "string",
                        "description": "Filter debates before this date (YYYY-MM-DD format)",
                    },
                },
            },
        ),
        Tool(
            name="get_bill",
            description="Get detailed information for a specific bill from LEGISinfo.",
            inputSchema={
                "type": "object",
                "properties": {
                    "session": {
                        "type": "string",
                        "description": "Parliamentary session (e.g., 45-1)",
                    },
                    "code": {
                        "type": "string",
                        "description": "Bill code (e.g., c-249, lowercase)",
                    },
                },
                "required": ["session", "code"],
            },
        ),
        Tool(
            name="list_mps",
            description="List current Members of Parliament from OpenParliament.",
            inputSchema={
                "type": "object",
                "properties": {
                    "limit": {
                        "type": "integer",
                        "description": "Number of results to return",
                        "default": 10,
                        "minimum": 1,
                        "maximum": 100,
                    },
                },
            },
        ),
        Tool(
            name="list_votes",
            description="List recent parliamentary votes from OpenParliament with optional date and result filtering.",
            inputSchema={
                "type": "object",
                "properties": {
                    "limit": {
                        "type": "integer",
                        "description": "Number of results to return",
                        "default": 10,
                        "minimum": 1,
                        "maximum": 100,
                    },
                    "date_after": {
                        "type": "string",
                        "description": "Filter votes after this date (YYYY-MM-DD format)",
                    },
                    "date_before": {
                        "type": "string",
                        "description": "Filter votes before this date (YYYY-MM-DD format)",
                    },
                    "result": {
                        "type": "string",
                        "description": "Filter by vote result",
                        "enum": ["Passed", "Negatived"],
                    },
                },
            },
        ),
        Tool(
            name="list_committees",
            description="List parliamentary committees (both House and Senate committees).",
            inputSchema={
                "type": "object",
                "properties": {
                    "limit": {
                        "type": "integer",
                        "description": "Number of results to return",
                        "default": 10,
                        "minimum": 1,
                        "maximum": 100,
                    },
                },
            },
        ),
        Tool(
            name="search_mp",
            description="Search for a Member of Parliament by name, party, or riding. Returns matching MPs with their details.",
            inputSchema={
                "type": "object",
                "properties": {
                    "name": {
                        "type": "string",
                        "description": "Name to search for (case-insensitive, partial matches OK)",
                    },
                    "party": {
                        "type": "string",
                        "description": "Filter by party (e.g., 'Conservative', 'Liberal', 'NDP', 'Bloc')",
                    },
                    "riding": {
                        "type": "string",
                        "description": "Filter by riding/constituency name (partial match)",
                    },
                    "limit": {
                        "type": "integer",
                        "description": "Maximum number of results",
                        "default": 10,
                        "minimum": 1,
                        "maximum": 50,
                    },
                },
            },
        ),
        Tool(
            name="get_mp_voting_history",
            description="Get recent voting history for a specific MP. Shows how they voted on recent bills and motions.",
            inputSchema={
                "type": "object",
                "properties": {
                    "mp_url": {
                        "type": "string",
                        "description": "The politician URL from search_mp results (e.g., '/politicians/pierre-poilievre/')",
                    },
                    "limit": {
                        "type": "integer",
                        "description": "Number of recent votes to return",
                        "default": 10,
                        "minimum": 1,
                        "maximum": 50,
                    },
                },
                "required": ["mp_url"],
            },
        ),
        Tool(
            name="get_vote_details",
            description="Get detailed information about a specific vote, including how individual MPs voted.",
            inputSchema={
                "type": "object",
                "properties": {
                    "vote_url": {
                        "type": "string",
                        "description": "The vote URL (e.g., '/votes/45-1/43/')",
                    },
                    "include_ballots": {
                        "type": "boolean",
                        "description": "Include individual MP ballots (how each MP voted)",
                        "default": False,
                    },
                    "limit": {
                        "type": "integer",
                        "description": "Maximum number of ballots to return if include_ballots is true",
                        "default": 50,
                        "minimum": 1,
                        "maximum": 350,
                    },
                },
                "required": ["vote_url"],
            },
        ),
        Tool(
            name="find_mp_by_postal_code",
            description="Find your federal Member of Parliament by postal code. Returns MP name, party, riding, and contact information.",
            inputSchema={
                "type": "object",
                "properties": {
                    "postal_code": {
                        "type": "string",
                        "description": "Canadian postal code (e.g., 'K1A 0A9' or 'k1a0a9')",
                    },
                },
                "required": ["postal_code"],
            },
        ),
        Tool(
            name="analyze_party_discipline",
            description="Analyze party discipline for a specific vote. Shows which MPs voted against their party's majority position.",
            inputSchema={
                "type": "object",
                "properties": {
                    "vote_url": {
                        "type": "string",
                        "description": "The vote URL (e.g., '/votes/45-1/43/')",
                    },
                },
                "required": ["vote_url"],
            },
        ),
    ]

    # Add CanLII tools if client is available
    if canlii_client:
        tools.extend([
            Tool(
                name="search_cases",
                description="Search Canadian case law via CanLII. Requires specifying a court/tribunal database ID (e.g., 'csc-scc' for Supreme Court).",
                inputSchema={
                    "type": "object",
                    "properties": {
                        "database_id": {
                            "type": "string",
                            "description": "Database ID (e.g., 'csc-scc' for Supreme Court, 'fca-caf' for Federal Court of Appeal)",
                        },
                        "query": {
                            "type": "string",
                            "description": "Keywords to search in case law",
                        },
                        "language": {
                            "type": "string",
                            "description": "Language code ('en' or 'fr')",
                            "default": "en",
                        },
                        "limit": {
                            "type": "integer",
                            "description": "Maximum number of results (1-50)",
                            "default": 10,
                            "minimum": 1,
                            "maximum": 50,
                        },
                        "published_after": {
                            "type": "string",
                            "description": "Filter cases published after this date (YYYY-MM-DD)",
                        },
                        "published_before": {
                            "type": "string",
                            "description": "Filter cases published before this date (YYYY-MM-DD)",
                        },
                        "decision_date_after": {
                            "type": "string",
                            "description": "Filter cases decided after this date (YYYY-MM-DD)",
                        },
                        "decision_date_before": {
                            "type": "string",
                            "description": "Filter cases decided before this date (YYYY-MM-DD)",
                        },
                    },
                    "required": ["database_id", "query"],
                },
            ),
            Tool(
                name="get_case",
                description="Get detailed metadata for a specific case from CanLII.",
                inputSchema={
                    "type": "object",
                    "properties": {
                        "database_id": {
                            "type": "string",
                            "description": "Database ID (e.g., 'csc-scc')",
                        },
                        "case_id": {
                            "type": "string",
                            "description": "Case ID",
                        },
                        "language": {
                            "type": "string",
                            "description": "Language code ('en' or 'fr')",
                            "default": "en",
                        },
                    },
                    "required": ["database_id", "case_id"],
                },
            ),
            Tool(
                name="get_case_citations",
                description="Get citation information for a case (cited cases, citing cases, or cited legislation).",
                inputSchema={
                    "type": "object",
                    "properties": {
                        "database_id": {
                            "type": "string",
                            "description": "Database ID (e.g., 'csc-scc')",
                        },
                        "case_id": {
                            "type": "string",
                            "description": "Case ID",
                        },
                        "citation_type": {
                            "type": "string",
                            "description": "Type of citations to retrieve",
                            "enum": ["citedCases", "citingCases", "citedLegislations"],
                            "default": "citingCases",
                        },
                    },
                    "required": ["database_id", "case_id"],
                },
            ),
            Tool(
                name="search_legislation",
                description="Browse Canadian federal and provincial legislation via CanLII.",
                inputSchema={
                    "type": "object",
                    "properties": {
                        "database_id": {
                            "type": "string",
                            "description": "Database ID (e.g., 'ca' for federal acts, 'car' for regulations)",
                            "default": "ca",
                        },
                        "language": {
                            "type": "string",
                            "description": "Language code ('en' or 'fr')",
                            "default": "en",
                        },
                        "limit": {
                            "type": "integer",
                            "description": "Maximum number of results",
                            "default": 20,
                            "minimum": 1,
                            "maximum": 100,
                        },
                    },
                },
            ),
            Tool(
                name="list_canlii_databases",
                description="List all available CanLII databases for case law or legislation. Use this to discover court/tribunal databases or legislation databases.",
                inputSchema={
                    "type": "object",
                    "properties": {
                        "type": {
                            "type": "string",
                            "description": "Type of databases to list",
                            "enum": ["cases", "legislation"],
                            "default": "cases",
                        },
                        "language": {
                            "type": "string",
                            "description": "Language code ('en' or 'fr')",
                            "default": "en",
                        },
                    },
                },
            ),
        ])

    return tools


@app.call_tool()
async def call_tool(name: str, arguments: Any) -> list[TextContent]:
    """Handle tool calls.

    Note: All client operations are synchronous (using requests library),
    so we run them in a thread pool to avoid blocking the async event loop.
    """

    try:
        if name == "search_debates":
            try:
                query = arguments["query"]
                limit = validate_limit(arguments.get("limit"), default=10, max_val=50)
                logger.info(f"search_debates called with query='{query}', limit={limit}")

                def _search_debates():
                    debates = []
                    query_lower = query.lower()

                    # Use islice to cap max examined debates (3x limit for filtering)
                    # This prevents fetching unlimited pages when searching
                    max_to_examine = limit * 3
                    for debate in islice(op_client.list_debates(), max_to_examine):
                        debate_text = " ".join([
                            str(debate.get("content", {}).get("en", "")),
                            str(debate.get("heading", {}).get("en", "")),
                            str(debate.get("speaker", {}).get("name", "")),
                        ]).lower()

                        if query_lower in debate_text:
                            debates.append({
                                "date": debate.get("date"),
                                "url": debate.get("url"),
                                "speaker": debate.get("speaker", {}).get("name"),
                                "content_preview": str(debate.get("content", {}).get("en", ""))[:300],
                            })
                            if len(debates) >= limit:
                                break
                    return debates

                debates = await run_sync(_search_debates)

                return [TextContent(
                    type="text",
                    text=f"Found {len(debates)} debate(s) matching '{query}':\n\n" +
                         "\n\n".join([
                             f"Date: {d['date']}\nSpeaker: {d['speaker']}\nPreview: {d['content_preview']}...\nURL: {d['url']}"
                             for d in debates
                         ])
                )]
            except ValueError as e:
                logger.warning(f"Invalid input for search_debates: {e}")
                return [TextContent(type="text", text=f"Invalid input: {str(e)}")]
            except Exception as e:
                logger.exception(f"Unexpected error in search_debates")
                return [TextContent(type="text", text=f"Error searching debates: {sanitize_error_message(e)}")]

        elif name == "search_bills":
            try:
                query = arguments["query"]
                session = arguments.get("session")
                sponsor = arguments.get("sponsor")
                limit = validate_limit(arguments.get("limit"), default=10, max_val=50)
                logger.info(f"search_bills called with query='{query}', session={session}, sponsor={sponsor}, limit={limit}")

                query_upper = query.upper()
                is_bill_number = query_upper.startswith(('C-', 'S-')) and len(query) < 10

                bills = []

                # Try specific bill lookup if bill number and session provided
                if is_bill_number and session:
                    try:
                        bill_code = query_upper.lower()
                        bill_data = await run_sync(legis_client.get_bill, session, bill_code)

                        if isinstance(bill_data, list) and bill_data:
                            bill_info = bill_data[0]
                            return [TextContent(
                                type="text",
                                text=f"Bill {bill_info.get('Number')}\n" +
                                     f"Title: {bill_info.get('LongTitle') or bill_info.get('ShortTitle')}\n" +
                                     f"Session: {session}\n" +
                                     f"Source: LEGISinfo"
                            )]
                    except Exception:
                        pass  # Fall through to search

                # Search in OpenParliament bills
                def _search_bills():
                    query_lower = query.lower()
                    found_bills = []

                    # Build query parameters for filtering
                    params = {}
                    if session:
                        params['session'] = session
                    if sponsor:
                        params['sponsor_politician'] = sponsor

                    # Use islice to cap max examined bills (2x limit for filtering)
                    # This prevents fetching unlimited pages when searching
                    max_to_examine = limit * 2
                    for bill in islice(op_client.list_bills(**params), max_to_examine):
                        bill_text = " ".join([
                            str(bill.get("number", "")),
                            str(bill.get("name", {}).get("en", "")),
                            str(bill.get("short_title", {}).get("en", "")),
                        ]).lower()

                        if query_lower in bill_text:
                            found_bills.append({
                                "number": bill.get("number"),
                                "name": bill.get("name", {}).get("en"),
                                "short_title": bill.get("short_title", {}).get("en"),
                                "url": bill.get("url"),
                            })
                            if len(found_bills) >= limit:
                                break
                    return found_bills

                bills = await run_sync(_search_bills)

                return [TextContent(
                    type="text",
                    text=f"Found {len(bills)} bill(s) matching '{query}':\n\n" +
                         "\n\n".join([
                             f"Number: {b['number']}\n" +
                             f"Name: {(b['name'] or 'N/A')[:200]}{'...' if b['name'] and len(b['name']) > 200 else ''}\n" +
                             f"Short Title: {(b['short_title'] or 'N/A')[:150]}{'...' if b['short_title'] and len(b['short_title']) > 150 else ''}\n" +
                             f"URL: {b['url']}"
                             for b in bills
                         ])
                )]
            except ValueError as e:
                logger.warning(f"Invalid input for search_bills: {e}")
                return [TextContent(type="text", text=f"Invalid input: {str(e)}")]
            except Exception as e:
                logger.exception(f"Unexpected error in search_bills")
                return [TextContent(type="text", text=f"Error searching bills: {sanitize_error_message(e)}")]

        elif name == "search_hansard":
            try:
                query = arguments["query"]
                limit = validate_limit(arguments.get("limit"), default=5, max_val=20)
                logger.info(f"search_hansard called with query='{query}', limit={limit}")

                sitting = await run_sync(hansard_client.get_sitting, "latest/hansard", parse=True)

                if not sitting or not sitting.sections:
                    return [TextContent(
                        type="text",
                        text=f"No Hansard data available or no matches found for '{query}'"
                    )]

                matches = []
                query_lower = query.lower()

                for section in sitting.sections:
                    for speech in section.speeches:
                        if len(matches) >= limit:
                            break

                        if speech.text and query_lower in speech.text.lower():
                            text_lower = speech.text.lower()
                            match_idx = text_lower.find(query_lower)

                            start = max(0, match_idx - 200)
                            end = min(len(speech.text), match_idx + len(query) + 200)
                            context = speech.text[start:end]

                            matches.append({
                                "speaker": speech.speaker_name,
                                "party": speech.party,
                                "riding": speech.riding,
                                "context": context,
                            })

                return [TextContent(
                    type="text",
                    text=f"Hansard Date: {sitting.date}\n" +
                         f"Found {len(matches)} speech(es) matching '{query}':\n\n" +
                         "\n\n---\n\n".join([
                             f"Speaker: {m['speaker']} ({m['party']}, {m['riding']})\nContext: ...{m['context']}..."
                             for m in matches
                         ])
                )]
            except ValueError as e:
                logger.warning(f"Invalid input for search_hansard: {e}")
                return [TextContent(type="text", text=f"Invalid input: {str(e)}")]
            except Exception as e:
                logger.exception(f"Unexpected error in search_hansard")
                return [TextContent(type="text", text=f"Error searching Hansard: {sanitize_error_message(e)}")]

        elif name == "get_committee_evidence":
            try:
                parliament = arguments["parliament"]
                session = arguments["session"]
                committee = arguments["committee"].upper()
                meeting = arguments["meeting"]
                search_query = arguments.get("search")
                limit = validate_limit(arguments.get("limit"), default=10, max_val=50)

                logger.info(f"get_committee_evidence called with {parliament}-{session}/{committee}/meeting-{meeting}")

                # Build the committee evidence URL
                # Format: /DocumentViewer/en/{parliament}-{session}/{COMMITTEE}/meeting-{number}/evidence
                slug = f"{parliament}-{session}/{committee}/meeting-{meeting}/evidence"

                # Fetch and parse committee evidence (same format as Hansard)
                sitting = await run_sync(hansard_client.get_sitting, slug, parse=True)

                if not sitting or not sitting.sections:
                    return [TextContent(
                        type="text",
                        text=f"No evidence available for {committee} meeting {meeting}"
                    )]

                # If searching, filter speeches
                if search_query:
                    matches = []
                    query_lower = search_query.lower()

                    for section in sitting.sections:
                        for speech in section.speeches:
                            if len(matches) >= limit:
                                break

                            if speech.text and query_lower in speech.text.lower():
                                text_lower = speech.text.lower()
                                match_idx = text_lower.find(query_lower)

                                start = max(0, match_idx - 200)
                                end = min(len(speech.text), match_idx + len(search_query) + 200)
                                context = speech.text[start:end]

                                matches.append({
                                    "speaker": speech.speaker_name,
                                    "party": speech.party,
                                    "riding": speech.riding,
                                    "context": context,
                                })

                    return [TextContent(
                        type="text",
                        text=f"Committee: {committee}\nMeeting: {meeting}\nDate: {sitting.date}\n" +
                             f"Found {len(matches)} speech(es) matching '{search_query}':\n\n" +
                             "\n\n---\n\n".join([
                                 f"Speaker: {m['speaker']} ({m['party']}, {m['riding']})\nContext: ...{m['context']}..."
                                 for m in matches
                             ])
                    )]

                # No search - return all speeches (limited)
                all_speeches = []
                for section in sitting.sections:
                    for speech in section.speeches[:limit]:
                        all_speeches.append({
                            "speaker": speech.speaker_name or "Unknown",
                            "party": speech.party or "N/A",
                            "riding": speech.riding or "N/A",
                            "text_preview": speech.text[:300] if speech.text else "No text"
                        })
                        if len(all_speeches) >= limit:
                            break
                    if len(all_speeches) >= limit:
                        break

                return [TextContent(
                    type="text",
                    text=f"Committee: {committee}\nMeeting: {meeting}\nDate: {sitting.date}\n" +
                         f"Evidence (showing {len(all_speeches)} speeches):\n\n" +
                         "\n\n---\n\n".join([
                             f"Speaker: {s['speaker']} ({s['party']}, {s['riding']})\n{s['text_preview']}..."
                             for s in all_speeches
                         ])
                )]
            except KeyError as e:
                logger.warning(f"Missing required parameter for get_committee_evidence: {e}")
                return [TextContent(type="text", text=f"Missing required parameter: {str(e)}")]
            except ValueError as e:
                logger.warning(f"Invalid input for get_committee_evidence: {e}")
                return [TextContent(type="text", text=f"Invalid input: {str(e)}")]
            except Exception as e:
                logger.exception(f"Unexpected error in get_committee_evidence")
                return [TextContent(type="text", text=f"Error fetching committee evidence: {sanitize_error_message(e)}")]

        elif name == "list_debates":
            try:
                limit = validate_limit(arguments.get("limit"), default=5, max_val=100)
                offset = arguments.get("offset", 0)
                date_after = arguments.get("date_after")
                date_before = arguments.get("date_before")

                if not isinstance(offset, int) or offset < 0:
                    raise ValueError("offset must be a non-negative integer")
                logger.info(f"list_debates called with limit={limit}, offset={offset}, date_after={date_after}, date_before={date_before}")

                # Build query parameters for date filtering
                params = {'offset': offset}
                if date_after:
                    params['date__gte'] = date_after
                if date_before:
                    params['date__lte'] = date_before

                # Use islice to properly limit results (limit param only controls page size, not total)
                debates = await run_sync(lambda: list(islice(op_client.list_debates(**params), limit)))

                return [TextContent(
                    type="text",
                    text=f"Recent debates (limit={limit}, offset={offset}):\n\n" +
                         "\n\n".join([
                             f"Date: {d.get('date')}\nSpeaker: {d.get('speaker', {}).get('name')}\n" +
                             f"Heading: {d.get('heading', {}).get('en', 'N/A')}\nURL: {d.get('url')}"
                             for d in debates
                         ])
                )]
            except ValueError as e:
                logger.warning(f"Invalid input for list_debates: {e}")
                return [TextContent(type="text", text=f"Invalid input: {str(e)}")]
            except Exception as e:
                logger.exception(f"Unexpected error in list_debates")
                return [TextContent(type="text", text=f"Error listing debates: {sanitize_error_message(e)}")]

        elif name == "get_bill":
            try:
                session = arguments["session"]
                code = arguments["code"]
                logger.info(f"get_bill called with session={session}, code={code}")

                result = await run_sync(legis_client.get_bill, session, code)
                if isinstance(result, list) and result:
                    bill = result[0]
                    return [TextContent(
                        type="text",
                        text=f"Bill {bill.get('Number')}\n" +
                             f"Long Title: {bill.get('LongTitle')}\n" +
                             f"Short Title: {bill.get('ShortTitle')}\n" +
                             f"Session: {session}\n" +
                             f"Sponsor: {bill.get('Sponsor', {}).get('Name', 'N/A')}"
                    )]

                return [TextContent(type="text", text=f"Bill data: {result}")]
            except KeyError as e:
                logger.warning(f"Missing required parameter for get_bill: {e}")
                return [TextContent(type="text", text=f"Missing required parameter: {str(e)}")]
            except Exception as e:
                logger.exception(f"Unexpected error in get_bill")
                return [TextContent(type="text", text=f"Error getting bill: {sanitize_error_message(e)}")]

        elif name == "list_mps":
            try:
                limit = validate_limit(arguments.get("limit"), default=10, max_val=100)
                logger.info(f"list_mps called with limit={limit}")

                # Use islice to properly limit results (limit param only controls page size, not total)
                mps = await run_sync(lambda: list(islice(op_client.list_mps(), limit)))

                return [TextContent(
                    type="text",
                    text=f"Current Members of Parliament (limit={limit}):\n\n" +
                         "\n".join([
                             f"- {mp.get('name')} ({mp.get('party', {}).get('short_name', {}).get('en', 'N/A')}) - {mp.get('riding', {}).get('name', {}).get('en', 'N/A')}"
                             for mp in mps
                         ])
                )]
            except ValueError as e:
                logger.warning(f"Invalid input for list_mps: {e}")
                return [TextContent(type="text", text=f"Invalid input: {str(e)}")]
            except Exception as e:
                logger.exception(f"Unexpected error in list_mps")
                return [TextContent(type="text", text=f"Error listing MPs: {sanitize_error_message(e)}")]

        elif name == "list_votes":
            try:
                limit = validate_limit(arguments.get("limit"), default=10, max_val=100)
                date_after = arguments.get("date_after")
                date_before = arguments.get("date_before")
                result = arguments.get("result")

                logger.info(f"list_votes called with limit={limit}, date_after={date_after}, date_before={date_before}, result={result}")

                # Build query parameters for filtering
                params = {}
                if date_after:
                    params['date__gte'] = date_after
                if date_before:
                    params['date__lte'] = date_before
                if result:
                    params['result'] = result

                # Run synchronous API call in thread pool to avoid blocking
                # Use islice to properly limit results (limit param only controls page size, not total)
                votes = await asyncio.to_thread(lambda: list(islice(op_client.list_votes(**params), limit)))

                return [TextContent(
                    type="text",
                    text=f"Recent parliamentary votes (limit={limit}):\n\n" +
                         "\n\n".join([
                             f"Date: {v.get('date')}\nNumber: {v.get('number')}\n" +
                             f"Description: {v.get('description', {}).get('en', 'N/A')[:200]}{'...' if len(v.get('description', {}).get('en', '')) > 200 else ''}\n" +
                             f"Result: {v.get('result')}\nURL: {v.get('url')}"
                             for v in votes
                         ])
                )]
            except ValueError as e:
                logger.warning(f"Invalid input for list_votes: {e}")
                return [TextContent(type="text", text=f"Invalid input: {str(e)}")]
            except Exception as e:
                logger.exception(f"Unexpected error in list_votes")
                return [TextContent(type="text", text=f"Error listing votes: {sanitize_error_message(e)}")]

        elif name == "list_committees":
            try:
                limit = validate_limit(arguments.get("limit"), default=10, max_val=100)
                logger.info(f"list_committees called with limit={limit}")

                # Run synchronous API call in thread pool to avoid blocking
                # Use islice to properly limit results
                committees = await asyncio.to_thread(lambda: list(islice(op_client.list_committees(), limit)))

                return [TextContent(
                    type="text",
                    text=f"Parliamentary committees (limit={limit}):\n\n" +
                         "\n\n".join([
                             f"Name: {c.get('name', {}).get('en', 'N/A')}\n" +
                             f"Short Name: {c.get('short_name', {}).get('en', 'N/A')}\n" +
                             f"URL: {c.get('url')}"
                             for c in committees
                         ])
                )]
            except ValueError as e:
                logger.warning(f"Invalid input for list_committees: {e}")
                return [TextContent(type="text", text=f"Invalid input: {str(e)}")]
            except Exception as e:
                logger.exception(f"Unexpected error in list_committees")
                return [TextContent(type="text", text=f"Error listing committees: {sanitize_error_message(e)}")]

        elif name == "search_mp":
            try:
                name = arguments.get("name")
                party = arguments.get("party")
                riding = arguments.get("riding")
                limit = validate_limit(arguments.get("limit"), default=10, max_val=50)

                # Require at least one search criterion
                if not any([name, party, riding]):
                    return [TextContent(
                        type="text",
                        text="Please provide at least one search criterion: name, party, or riding."
                    )]

                logger.info(f"search_mp called with name='{name}', party='{party}', riding='{riding}', limit={limit}")

                def _search_mp():
                    # Start with all politicians or name-filtered if provided
                    if name:
                        politicians = op_client.search_politician(name)
                    else:
                        politicians = op_client._paginate("/politicians/")

                    # Apply additional filters
                    matched = []
                    party_lower = party.lower() if party else None
                    riding_lower = riding.lower() if riding else None

                    for p in politicians:
                        if len(matched) >= limit:
                            break

                        # Check party filter
                        if party_lower:
                            current_party = p.get('current_party', {})
                            party_name = (current_party.get('short_name', {}).get('en', '') or
                                        current_party.get('name', {}).get('en', '')).lower()
                            if party_lower not in party_name:
                                continue

                        # Check riding filter
                        if riding_lower:
                            current_riding = p.get('current_riding', {})
                            riding_name = current_riding.get('name', {}).get('en', '').lower()
                            if riding_lower not in riding_name:
                                continue

                        matched.append(p)

                    return matched

                politicians = await run_sync(_search_mp)

                if not politicians:
                    criteria = []
                    if name: criteria.append(f"name '{name}'")
                    if party: criteria.append(f"party '{party}'")
                    if riding: criteria.append(f"riding '{riding}'")
                    return [TextContent(
                        type="text",
                        text=f"No MPs found matching {' and '.join(criteria)}."
                    )]

                return [TextContent(
                    type="text",
                    text=f"Found {len(politicians)} MP(s):\n\n" +
                         "\n\n".join([
                             f"Name: {p.get('name')}\n" +
                             f"Party: {p.get('current_party', {}).get('short_name', {}).get('en', 'N/A')}\n" +
                             f"Riding: {p.get('current_riding', {}).get('name', {}).get('en', 'N/A')}\n" +
                             f"URL: {p.get('url')}"
                             for p in politicians
                         ])
                )]
            except ValueError as e:
                logger.warning(f"Invalid input for search_mp: {e}")
                return [TextContent(type="text", text=f"Invalid input: {str(e)}")]
            except Exception as e:
                logger.exception(f"Unexpected error in search_mp")
                return [TextContent(type="text", text=f"Error searching for MP: {sanitize_error_message(e)}")]

        elif name == "get_mp_voting_history":
            try:
                mp_url = arguments["mp_url"]
                limit = validate_limit(arguments.get("limit"), default=10, max_val=50)
                logger.info(f"get_mp_voting_history called with mp_url={mp_url}, limit={limit}")

                # Get politician details
                politician = await run_sync(op_client.get_politician, mp_url)
                mp_name = politician.get('name', 'Unknown MP')

                # Get voting history (ballots)
                ballots = await run_sync(op_client.get_politician_ballots, mp_url, limit)

                if not ballots:
                    return [TextContent(
                        type="text",
                        text=f"No recent voting records found for {mp_name}."
                    )]

                # Fetch vote details for each ballot to get descriptions
                vote_records = []
                for ballot in ballots:
                    vote_url = ballot.get('vote_url', '')
                    ballot_value = ballot.get('ballot', 'Unknown')

                    try:
                        vote = await run_sync(op_client.get_vote, vote_url)
                        vote_records.append({
                            'date': vote.get('date', 'Unknown'),
                            'ballot': ballot_value,
                            'description': vote.get('description', {}).get('en', 'No description')[:150],
                            'result': vote.get('result', 'Unknown'),
                            'vote_url': vote_url
                        })
                    except:
                        # If we can't get vote details, just include what we have
                        vote_records.append({
                            'date': 'Unknown',
                            'ballot': ballot_value,
                            'description': 'Vote details unavailable',
                            'result': 'Unknown',
                            'vote_url': vote_url
                        })

                return [TextContent(
                    type="text",
                    text=f"Voting history for {mp_name} (last {len(vote_records)} votes):\n\n" +
                         "\n\n".join([
                             f"Date: {vr['date']}\n" +
                             f"Voted: {vr['ballot']}\n" +
                             f"Topic: {vr['description']}{'...' if len(vr.get('description', '')) > 147 else ''}\n" +
                             f"Result: {vr['result']}\n" +
                             f"Vote URL: {vr['vote_url']}"
                             for vr in vote_records
                         ])
                )]
            except KeyError as e:
                logger.warning(f"Missing required parameter for get_mp_voting_history: {e}")
                return [TextContent(type="text", text=f"Missing required parameter: {str(e)}")]
            except ValueError as e:
                logger.warning(f"Invalid input for get_mp_voting_history: {e}")
                return [TextContent(type="text", text=f"Invalid input: {str(e)}")]
            except Exception as e:
                logger.exception(f"Unexpected error in get_mp_voting_history")
                return [TextContent(type="text", text=f"Error getting MP voting history: {sanitize_error_message(e)}")]

        elif name == "get_vote_details":
            try:
                vote_url = arguments["vote_url"]
                include_ballots = arguments.get("include_ballots", False)
                limit = validate_limit(arguments.get("limit"), default=50, max_val=350) if include_ballots else 0
                logger.info(f"get_vote_details called with vote_url={vote_url}, include_ballots={include_ballots}")

                # Get vote summary
                vote = await run_sync(op_client.get_vote, vote_url)

                response_parts = [
                    f"Vote Details:\n",
                    f"Date: {vote.get('date')}\n",
                    f"Number: {vote.get('number')}\n",
                    f"Session: {vote.get('session')}\n",
                    f"Description: {vote.get('description', {}).get('en', 'No description')}\n",
                    f"Result: {vote.get('result')}\n",
                    f"Yea: {vote.get('yea_total', 0)}, Nay: {vote.get('nay_total', 0)}, Paired: {vote.get('paired_total', 0)}\n"
                ]

                # Add party breakdown
                party_votes = vote.get('party_votes', [])
                if party_votes:
                    response_parts.append("\nParty Breakdown:\n")
                    for pv in party_votes:
                        party_name = pv.get('party', {}).get('short_name', {}).get('en', 'Unknown')
                        party_vote = pv.get('vote', 'Unknown')
                        response_parts.append(f"- {party_name}: {party_vote}\n")

                # Add individual ballots if requested
                if include_ballots:
                    ballots = await run_sync(op_client.get_vote_ballots, vote_url, limit)

                    if ballots:
                        response_parts.append(f"\nIndividual MP Votes (showing {min(len(ballots), limit)} of {len(ballots)}):\n\n")

                        for ballot in ballots[:limit]:
                            politician_url = ballot.get('politician_url', '')
                            ballot_value = ballot.get('ballot', 'Unknown')

                            # Extract MP name from URL (e.g., /politicians/pierre-poilievre/ -> Pierre Poilievre)
                            mp_name = politician_url.strip('/').split('/')[-1].replace('-', ' ').title()

                            response_parts.append(f"- {mp_name}: {ballot_value}\n")

                return [TextContent(type="text", text="".join(response_parts))]
            except KeyError as e:
                logger.warning(f"Missing required parameter for get_vote_details: {e}")
                return [TextContent(type="text", text=f"Missing required parameter: {str(e)}")]
            except ValueError as e:
                logger.warning(f"Invalid input for get_vote_details: {e}")
                return [TextContent(type="text", text=f"Invalid input: {str(e)}")]
            except Exception as e:
                logger.exception(f"Unexpected error in get_vote_details")
                return [TextContent(type="text", text=f"Error getting vote details: {sanitize_error_message(e)}")]

        elif name == "find_mp_by_postal_code":
            try:
                postal_code = arguments["postal_code"]
                logger.info(f"find_mp_by_postal_code called with postal_code={postal_code}")

                # Get federal MP by postal code
                mp = await run_sync(represent_client.get_federal_mp_by_postal_code, postal_code)

                if not mp:
                    return [TextContent(
                        type="text",
                        text=f"No federal MP found for postal code '{postal_code}'. Please verify the postal code is correct."
                    )]

                # Format the response with MP information
                response_parts = [
                    f"Your Federal Member of Parliament:\n\n",
                    f"Name: {mp.get('name', 'N/A')}\n",
                    f"Party: {mp.get('party_name', 'N/A')}\n",
                    f"Riding: {mp.get('district_name', 'N/A')}\n",
                ]

                # Add contact information if available
                if mp.get('email'):
                    response_parts.append(f"Email: {mp.get('email')}\n")
                if mp.get('url'):
                    response_parts.append(f"Website: {mp.get('url')}\n")

                # Add office information if available
                offices = mp.get('offices', [])
                if offices:
                    response_parts.append("\nOffices:\n")
                    for office in offices:
                        office_type = office.get('type', 'Office')
                        if office.get('postal'):
                            response_parts.append(f"  {office_type}:\n")
                            response_parts.append(f"    {office.get('postal', '').strip()}\n")
                        if office.get('tel'):
                            response_parts.append(f"    Phone: {office.get('tel')}\n")
                        if office.get('fax'):
                            response_parts.append(f"    Fax: {office.get('fax')}\n")

                # Add social media if available
                social = []
                for key in ['twitter', 'facebook', 'instagram']:
                    if mp.get(key):
                        social.append(f"{key.title()}: {mp.get(key)}")
                if social:
                    response_parts.append(f"\nSocial Media: {', '.join(social)}\n")

                return [TextContent(type="text", text="".join(response_parts))]

            except KeyError as e:
                logger.warning(f"Missing required parameter for find_mp_by_postal_code: {e}")
                return [TextContent(type="text", text=f"Missing required parameter: {str(e)}")]
            except ValueError as e:
                logger.warning(f"Invalid input for find_mp_by_postal_code: {e}")
                return [TextContent(type="text", text=f"Invalid input: {str(e)}")]
            except Exception as e:
                logger.exception(f"Unexpected error in find_mp_by_postal_code")
                return [TextContent(type="text", text=f"Error finding MP by postal code: {sanitize_error_message(e)}")]

        elif name == "analyze_party_discipline":
            try:
                vote_url = arguments["vote_url"]
                logger.info(f"analyze_party_discipline called with vote_url={vote_url}")

                # Get vote details
                vote = await run_sync(op_client.get_vote, vote_url)

                # Get all individual ballots (limit 350 covers all MPs)
                ballots = await run_sync(op_client.get_vote_ballots, vote_url, 350)

                if not ballots:
                    return [TextContent(
                        type="text",
                        text=f"No ballot data available for this vote."
                    )]

                # Group ballots by party
                from collections import defaultdict
                party_ballots = defaultdict(list)

                for ballot in ballots:
                    politician_url = ballot.get('politician_url', '')
                    ballot_value = ballot.get('ballot', 'Unknown')

                    # Get politician details to find their party
                    try:
                        politician = await run_sync(op_client.get_politician, politician_url)
                        party_name = politician.get('current_party', {}).get('short_name', {}).get('en', 'Unknown')

                        party_ballots[party_name].append({
                            'name': politician.get('name', 'Unknown'),
                            'riding': politician.get('current_riding', {}).get('name', {}).get('en', 'Unknown'),
                            'ballot': ballot_value,
                            'url': politician_url
                        })
                    except:
                        # Skip if we can't get politician details
                        continue

                # Analyze party discipline
                response_parts = [
                    f"Party Discipline Analysis\n",
                    f"Vote: {vote.get('description', {}).get('en', 'N/A')}\n",
                    f"Date: {vote.get('date')}\n",
                    f"Result: {vote.get('result')}\n\n",
                ]

                dissidents = []

                for party, mps in sorted(party_ballots.items()):
                    # Count votes by type
                    vote_counts = defaultdict(int)
                    for mp in mps:
                        vote_counts[mp['ballot']] += 1

                    # Determine party majority position
                    majority_vote = max(vote_counts.items(), key=lambda x: x[1])[0]
                    majority_count = vote_counts[majority_vote]
                    total_count = len(mps)

                    response_parts.append(f"{party} ({total_count} MPs):\n")
                    response_parts.append(f"  Party Position: {majority_vote} ({majority_count}/{total_count})\n")

                    # Find dissidents (those who voted differently)
                    party_dissidents = [mp for mp in mps if mp['ballot'] != majority_vote]

                    if party_dissidents:
                        response_parts.append(f"  MPs who broke ranks ({len(party_dissidents)}):\n")
                        for mp in party_dissidents:
                            response_parts.append(f"    - {mp['name']} ({mp['riding']}): Voted {mp['ballot']}\n")
                            dissidents.append({
                                'party': party,
                                'name': mp['name'],
                                'riding': mp['riding'],
                                'voted': mp['ballot'],
                                'party_position': majority_vote
                            })
                    else:
                        response_parts.append(f"  All MPs voted with party\n")

                    response_parts.append("\n")

                # Summary
                if dissidents:
                    response_parts.append(f"Summary: {len(dissidents)} MP(s) voted against their party's majority position\n")
                else:
                    response_parts.append("Summary: All MPs voted with their party\n")

                return [TextContent(type="text", text="".join(response_parts))]

            except KeyError as e:
                logger.warning(f"Missing required parameter for analyze_party_discipline: {e}")
                return [TextContent(type="text", text=f"Missing required parameter: {str(e)}")]
            except Exception as e:
                logger.exception(f"Unexpected error in analyze_party_discipline")
                return [TextContent(type="text", text=f"Error analyzing party discipline: {sanitize_error_message(e)}")]

        # CanLII tools
        elif name == "search_cases":
            try:
                if not canlii_client:
                    return [TextContent(
                        type="text",
                        text="CanLII service unavailable. CANLII_API_KEY not configured."
                    )]

                database_id = arguments["database_id"]
                query = arguments["query"]
                language = arguments.get("language", "en")
                limit = validate_limit(arguments.get("limit"), default=10, max_val=100)
                published_after = arguments.get("published_after")
                published_before = arguments.get("published_before")
                decision_date_after = arguments.get("decision_date_after")
                decision_date_before = arguments.get("decision_date_before")
                logger.info(f"search_cases called with database_id={database_id}, query='{query}', limit={limit}")

                cases = await run_sync(
                    canlii_client.search_cases_by_keyword,
                    database_id=database_id,
                    query=query,
                    language=language,
                    limit=limit,
                    published_after=published_after,
                    published_before=published_before,
                    decision_date_after=decision_date_after,
                    decision_date_before=decision_date_before,
                )

                return [TextContent(
                    type="text",
                    text=f"Found {len(cases)} case(s) in {database_id} matching '{query}':\n\n" +
                         "\n\n".join([
                             f"Title: {c.get('title', 'N/A')}\n" +
                             f"Citation: {c.get('citation', 'N/A')}\n" +
                             f"Date: {c.get('decisionDate', 'N/A')}\n" +
                             f"Docket: {c.get('docketNumber', 'N/A')}"
                             for c in cases
                         ])
                )]
            except (KeyError, ValueError) as e:
                logger.warning(f"Invalid input for search_cases: {e}")
                return [TextContent(type="text", text=f"Invalid input: {str(e)}")]
            except Exception as e:
                logger.exception(f"Unexpected error in search_cases")
                return [TextContent(type="text", text=f"Error searching cases: {sanitize_error_message(e)}")]

        elif name == "get_case":
            try:
                if not canlii_client:
                    return [TextContent(
                        type="text",
                        text="CanLII service unavailable. CANLII_API_KEY not configured."
                    )]

                database_id = arguments["database_id"]
                case_id = arguments["case_id"]
                language = arguments.get("language", "en")
                logger.info(f"get_case called with database_id={database_id}, case_id={case_id}")

                case = await run_sync(canlii_client.get_case, database_id, case_id, language=language)

                return [TextContent(
                    type="text",
                    text=f"Case: {case.get('title', 'N/A')}\n" +
                         f"Citation: {case.get('citation', 'N/A')}\n" +
                         f"Docket: {case.get('docketNumber', 'N/A')}\n" +
                         f"Decision Date: {case.get('decisionDate', 'N/A')}\n" +
                         f"Keywords: {', '.join(case.get('keywords', []))}"
                )]
            except KeyError as e:
                logger.warning(f"Missing required parameter for get_case: {e}")
                return [TextContent(type="text", text=f"Missing required parameter: {str(e)}")]
            except Exception as e:
                logger.exception(f"Unexpected error in get_case")
                return [TextContent(type="text", text=f"Error getting case: {sanitize_error_message(e)}")]

        elif name == "get_case_citations":
            try:
                if not canlii_client:
                    return [TextContent(
                        type="text",
                        text="CanLII service unavailable. CANLII_API_KEY not configured."
                    )]

                database_id = arguments["database_id"]
                case_id = arguments["case_id"]
                citation_type = arguments.get("citation_type", "citingCases")
                logger.info(f"get_case_citations called with database_id={database_id}, case_id={case_id}, citation_type={citation_type}")

                if citation_type == "citedCases":
                    result = await run_sync(canlii_client.get_cited_cases, database_id, case_id)
                elif citation_type == "citingCases":
                    result = await run_sync(canlii_client.get_citing_cases, database_id, case_id)
                else:  # citedLegislations
                    result = await run_sync(canlii_client.get_cited_legislations, database_id, case_id)

                return [TextContent(
                    type="text",
                    text=f"Citations ({citation_type}) for {database_id}/{case_id}:\n\n{result}"
                )]
            except KeyError as e:
                logger.warning(f"Missing required parameter for get_case_citations: {e}")
                return [TextContent(type="text", text=f"Missing required parameter: {str(e)}")]
            except Exception as e:
                logger.exception(f"Unexpected error in get_case_citations")
                return [TextContent(type="text", text=f"Error getting case citations: {sanitize_error_message(e)}")]

        elif name == "search_legislation":
            try:
                if not canlii_client:
                    return [TextContent(
                        type="text",
                        text="CanLII service unavailable. CANLII_API_KEY not configured."
                    )]

                database_id = arguments.get("database_id", "ca")
                language = arguments.get("language", "en")
                limit = validate_limit(arguments.get("limit"), default=20, max_val=100)
                logger.info(f"search_legislation called with database_id={database_id}, limit={limit}")

                result = await run_sync(canlii_client.browse_legislation, database_id, language=language)

                if "legislations" in result:
                    legislations = result["legislations"][:limit]
                    return [TextContent(
                        type="text",
                        text=f"Legislation in {database_id}:\n\n" +
                             "\n".join([
                                 f"- {leg.get('title', 'N/A')}"
                                 for leg in legislations
                             ])
                    )]

                return [TextContent(type="text", text=f"Legislation data: {result}")]
            except ValueError as e:
                logger.warning(f"Invalid input for search_legislation: {e}")
                return [TextContent(type="text", text=f"Invalid input: {str(e)}")]
            except Exception as e:
                logger.exception(f"Unexpected error in search_legislation")
                return [TextContent(type="text", text=f"Error searching legislation: {sanitize_error_message(e)}")]

        elif name == "list_canlii_databases":
            try:
                if not canlii_client:
                    return [TextContent(
                        type="text",
                        text="CanLII service unavailable. CANLII_API_KEY not configured."
                    )]

                db_type = arguments.get("type", "cases")
                language = arguments.get("language", "en")
                logger.info(f"list_canlii_databases called with type={db_type}, language={language}")

                if db_type == "legislation":
                    result = await run_sync(canlii_client.list_legislation_databases, language)
                    db_title = "Legislation Databases"
                else:
                    result = await run_sync(canlii_client.list_databases, language)
                    db_title = "Case Law Databases"

                # Format the result - structure varies by jurisdiction
                formatted_output = [f"{db_title} (Language: {language}):\n"]

                if isinstance(result, dict):
                    for jurisdiction, data in result.items():
                        if isinstance(data, dict) and 'databases' in data:
                            databases = data['databases']
                            formatted_output.append(f"\n{jurisdiction.upper()}:")
                            for db in databases:
                                db_id = db.get('databaseId', 'N/A')
                                db_name = db.get('name', 'N/A')
                                formatted_output.append(f"  - {db_id}: {db_name}")
                        elif isinstance(data, list):
                            formatted_output.append(f"\n{jurisdiction.upper()}:")
                            for db in data:
                                db_id = db.get('databaseId', 'N/A')
                                db_name = db.get('name', 'N/A')
                                formatted_output.append(f"  - {db_id}: {db_name}")

                return [TextContent(type="text", text="\n".join(formatted_output))]
            except ValueError as e:
                logger.warning(f"Invalid input for list_canlii_databases: {e}")
                return [TextContent(type="text", text=f"Invalid input: {str(e)}")]
            except Exception as e:
                logger.exception(f"Unexpected error in list_canlii_databases")
                return [TextContent(type="text", text=f"Error listing CanLII databases: {sanitize_error_message(e)}")]

        else:
            logger.warning(f"Unknown tool requested: {name}")
            return [TextContent(type="text", text=f"Unknown tool: {name}")]

    except Exception as e:
        logger.exception(f"Unexpected error executing {name}")
        return [TextContent(type="text", text=f"Error executing {name}: {sanitize_error_message(e)}")]


async def main():
    """Run the MCP server."""
    async with mcp.server.stdio.stdio_server() as (read_stream, write_stream):
        await app.run(
            read_stream,
            write_stream,
            app.create_initialization_options()
        )


if __name__ == "__main__":
    asyncio.run(main())
