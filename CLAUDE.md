# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

FedMCP is a Model Context Protocol (MCP) server providing access to Canadian federal parliamentary and legal information sources. It exposes tools for searching debates, bills, Hansard transcripts, and CanLII case law through the MCP protocol, making these data sources accessible to Claude and other LLM applications.

The server is built on Python clients adapted from the canfedinfo library in the broadcast-os project.

## Installation & Setup

Install in editable mode for local development:
```bash
pip install -e .
```

For CanLII access, obtain a free API key from https://www.canlii.org/en/feedback/feedback.html and add it to your environment:
```bash
cp .env.example .env
# Edit .env and add: CANLII_API_KEY=your_key_here
```

## Running the MCP Server

Start the server directly:
```bash
python -m fedmcp.server
```

Or use the installed command:
```bash
fedmcp
```

The server communicates via stdio (standard input/output) using the MCP protocol.

## MCP Client Configuration

To use this server with Claude Desktop, add to your configuration file:

**macOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`
**Windows:** `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "fedmcp": {
      "command": "python",
      "args": ["-m", "fedmcp.server"],
      "env": {
        "CANLII_API_KEY": "your_key_here"
      }
    }
  }
}
```

## Architecture

### Client Structure

All clients are located in `src/fedmcp/clients/` and follow a consistent pattern built around `RateLimitedSession` (http.py):
- **Proactive rate limiting**: Enforces minimum interval between requests (configured via `min_request_interval`)
- **Reactive retry logic**: Automatic retry with exponential backoff for 429/5xx errors
- Configurable backoff_factor (default: 1.0) and max_attempts (default: 5)
- Shared session management across all HTTP requests

**Rate Limiting Implementation:**
The `RateLimitedSession` supports both proactive and reactive rate limiting:
- Proactive: Set `min_request_interval` to enforce minimum delay between requests (e.g., 0.5 seconds for CanLII)
- Reactive: Automatic exponential backoff retry when receiving 429 (rate limit) or 5xx (server error) responses
- CanLII client automatically creates a session with `min_request_interval=0.5` to comply with the 2 requests/second limit

**OpenParliamentClient** (clients/openparliament.py):
- Pagination-aware - all list methods return iterators that automatically fetch subsequent pages
- Uses `paginate()` helper from http.py to follow `next_url` links
- Custom headers required: `User-Agent` (with email), `API-Version: v1`, `Accept: application/json`
- Base URL: `https://api.openparliament.ca`
- Methods: `list_debates()`, `get_debate()`, `list_bills()`, `get_bill()`, `list_mps()`, `get_mp()`, `list_votes()`, `get_vote()`, `list_committees()`, `get_committee()`
- **Rate limiting:** Conservative 10 requests/second (0.1s interval) to be respectful; API returns HTTP 429 if limits exceeded

**OurCommonsHansardClient** (clients/ourcommons.py):
- Two-step fetch process: DocumentViewer HTML → extract XML link → fetch XML
- Parses XML into structured dataclasses: `HansardSitting`, `HansardSection`, `HansardSpeech`
- Can return either raw XML string or parsed Python objects via `parse=True` parameter
- Uses BeautifulSoup for HTML scraping and ElementTree for XML parsing
- Method: `get_sitting(slug_or_url, parse=True)`
- **Note:** No rate limiting needed - fetches static XML documents from House of Commons DocumentViewer

**LegisInfoClient** (clients/legisinfo.py):
- Accesses both individual bill details and overview exports (JSON/XML data files)
- Bill URLs follow pattern: `/bill/{session}/{code}/json`
- Base URL: `https://www.parl.ca/LegisInfo/en/`
- Methods: `get_bill(parliament_session, bill_code)`, `list_bills(chamber=None)`
- **Note:** No rate limiting needed - LEGISinfo serves static data exports, not a rate-limited API

**CanLIIClient** (clients/canlii.py):
- REST API access to Canadian case law and legislation
- Requires API key (free for research, request from https://www.canlii.org/en/feedback/feedback.html)
- Supports multiple court/tribunal databases (Supreme Court, Federal Courts, Provincial Courts)
- Base URL: `https://api.canlii.org/v1`
- Methods: `list_databases()`, `browse_cases()`, `get_case()`, `get_cited_cases()`, `get_citing_cases()`, `get_cited_legislations()`, `list_legislation_databases()`, `browse_legislation()`, `get_legislation()`, `search_cases_by_keyword()`
- **Rate limits (automatically enforced):**
  - 5,000 queries/day (tracked by CanLII)
  - 2 requests/second (enforced by client with 0.5s minimum interval)
  - 1 concurrent request (enforced by synchronous execution)

**MPExpenditureClient** (clients/expenditure.py):
- Fetches MP quarterly expenditure data from House of Commons Proactive Disclosure
- Parses CSV exports with spending by category (salaries, travel, hospitality, contracts)
- Base URL: `https://www.ourcommons.ca/proactivedisclosure/en/members`
- Methods: `get_quarterly_summary(fiscal_year, quarter)`, `search_by_name()`, `search_by_party()`, `search_by_constituency()`, `get_top_spenders()`, `get_party_averages()`
- **Data Availability:**
  - Available from July 2020 (FY 2020-2021 Q2) onward
  - FY 2020-2021 Q1 (Apr-Jun 2020) returns server errors - not available
  - Pre-2020 data not available through current system
- **Travel Expense Notes:**
  - Party leader travel may be funded through party/research office budgets, not individual MP allocations
  - MPs with Ottawa-area ridings naturally have lower travel expenses
  - $0 travel does NOT mean no travel occurred - check reporting categories
- **Technical Notes:** Extracts CSV UUID from HTML pages, handles UTF-8 BOM in CSV files

**PetitionsClient** (clients/petitions.py):
- Accesses House of Commons petition data via XML API
- Tracks citizen petitions, sponsor MPs, signature counts, government responses
- Base URL: `https://www.ourcommons.ca/petitions/en/Petition/Search`
- Methods: `list_petitions(category)`, `search_petitions(keyword, sponsor_name)`, `get_petition(petition_number)`, `search_by_topic()`, `get_petitions_by_mp()`
- **Note:** Client-side filtering for keyword searches; covers 341+ active petitions

**LobbyingRegistryClient** (clients/lobbying.py):
- Downloads and caches federal lobbying registry data (~90MB compressed)
- Includes 100,000+ registrations and 350,000+ communication reports (1996-present)
- Data sources: Office of the Commissioner of Lobbying
- Methods: `search_registrations()`, `search_communications()`, `get_top_clients()`, `get_top_lobbyists()`
- **Key features:**
  - Weekly auto-update capability
  - Latin-1 encoding support for Canadian government data
  - Caches data to `~/.cache/fedmcp/lobbying/`
  - Tracks lobbyist-government official meetings (DPOHs)
- **Note:** Initial download takes ~30 seconds; subsequent loads are instant from cache

### MCP Server (server.py)

The MCP server exposes 40+ tools through the Model Context Protocol. Tools are organized by functionality:

**Parliamentary Data Tools:**
- `search_debates` - Search House of Commons debates by keyword
- `search_bills` - Search bills by number or keywords
- `search_hansard` - Search Hansard transcripts for quotes
- `search_bill_debates` - Get debates for a specific bill
- `list_debates` - List recent debates with pagination
- `get_bill` - Get specific bill details from LEGISinfo
- `list_mps` - List Members of Parliament
- `list_votes` - List parliamentary votes
- `get_committee_details` - Committee membership and mandate
- `get_politician_profile` - Complete MP biographical and parliamentary history
- `list_committees` - List all parliamentary committees

**MP Accountability Tools:**
- `get_mp_expenses` - Quarterly expenditure data for specific MPs
- `search_mp_expenses` - Find top spenders or compare party averages
- `search_mp` - Search MPs by name, party, or riding
- `get_mp_activity_scorecard` - Comprehensive performance across all data sources
- `analyze_mp_bills` - Legislative effectiveness and bill success rates

**Petition Tools:**
- `search_petitions` - Search petitions by keyword, sponsor, or topic
- `get_petition_details` - Full petition text, signatures, responses
- `get_mp_petitions` - All petitions sponsored by an MP

**Lobbying & Influence Tools:**
- `search_lobbying_registrations` - Who lobbies for which organizations
- `search_lobbying_communications` - Actual lobbyist-government meetings
- `get_top_lobbying_clients` - Most active corporate lobbying
- `analyze_bill_lobbying` - Corporate influence on specific legislation
- `detect_conflicts_of_interest` - Cross-reference expenses, lobbying, voting

**Bill Analytics Tools:**
- `analyze_bill_progress` - Timeline and status of bill passage
- `compare_party_bills` - Party-by-party bill success rates
- `analyze_mp_bills` - Individual MP legislative record

**Committee Tools:**
- `track_committee_activity` - Meeting frequency and productivity
- `get_committee_evidence` - Witness testimony from meetings

**Legal Data Tools (requires CANLII_API_KEY):**
- `search_cases` - Search case law by database and keywords
- `get_case` - Get specific case metadata
- `get_case_citations` - Get citing/cited cases and legislation
- `search_legislation` - Browse federal and provincial legislation

The server uses async/await patterns and communicates via stdio using the MCP SDK. All accountability tools leverage cross-source data correlation for comprehensive analysis.

## Common Development Tasks

### Testing client usage locally

```python
import os
from fedmcp import OpenParliamentClient, LegisInfoClient, OurCommonsHansardClient, CanLIIClient
from fedmcp.clients.expenditure import MPExpenditureClient
from fedmcp.clients.petitions import PetitionsClient
from fedmcp.clients.lobbying import LobbyingRegistryClient

# OpenParliament - pagination is automatic
op = OpenParliamentClient()
for debate in op.list_debates(limit=10):
    print(debate)

# LEGISinfo - session format is "parliament-session" (e.g., "45-1")
legis = LegisInfoClient()
bill = legis.get_bill("45-1", "c-249")

# Commons Hansard - use "latest/hansard" or specific sitting paths
commons = OurCommonsHansardClient()
sitting = commons.get_sitting("latest/hansard", parse=True)
print(f"Date: {sitting.date}, Sections: {len(sitting.sections)}")

# MP Expenses
expenses = MPExpenditureClient()
mp_expenses = expenses.search_by_name("Poilievre", fiscal_year=2026, quarter=1)
print(f"Total spending: ${mp_expenses[0].total:,.2f}")

# Petitions
petitions = PetitionsClient()
climate_petitions = petitions.search_petitions(keyword="climate", limit=5)
print(f"Found {len(climate_petitions)} climate petitions")

# Lobbying Registry
lobbying = LobbyingRegistryClient()
# First call downloads ~90MB data, subsequent calls use cache
pharma_lobbying = lobbying.search_registrations(
    subject_keyword="pharmaceutical",
    active_only=True,
    limit=10
)
print(f"Active pharma lobbying: {len(pharma_lobbying)} registrations")

# CanLII - requires API key
canlii = CanLIIClient(api_key=os.getenv("CANLII_API_KEY"))
cases = canlii.search_cases_by_keyword("csc-scc", "charter rights", limit=10)
```

### Adding a new MCP tool

1. Define the tool in the `list_tools()` function with proper input schema
2. Implement the handler in the `call_tool()` function
3. Return results as `TextContent` objects
4. Handle errors gracefully with try/except blocks

### Common database IDs for CanLII

**Supreme Court and Federal Courts:**
- `csc-scc` - Supreme Court of Canada
- `fca-caf` - Federal Court of Appeal
- `fct-cf` - Federal Court (Trial Division)

**Provincial Courts of Appeal:**
- `onca` - Ontario Court of Appeal
- `bcca` - British Columbia Court of Appeal
- `abca` - Alberta Court of Appeal
- `qcca` - Quebec Court of Appeal

**Legislation:**
- `ca` - Federal acts
- `car` - Federal regulations
- `on` - Ontario statutes
- `bc` - British Columbia statutes

## Government Accountability Features

FedMCP includes comprehensive accountability tracking across multiple data sources:

### Corruption & Conflict Detection
- **Cross-source correlation**: Links MP voting records, lobbying meetings, and expenses
- **Lobbying transparency**: Tracks 100,000+ registrations and 350,000+ communications
- **Conflict of interest detection**: Identifies unusual patterns (high lobbying exposure + relevant voting)
- **Corporate influence mapping**: Shows which organizations lobby on which bills

### MP Performance Tracking
- **Legislative effectiveness**: Bills sponsored vs. passed into law
- **Citizen engagement**: Petition sponsorship and signature volumes
- **Expense transparency**: Quarterly spending by category with outlier detection
- **Committee participation**: Membership and activity tracking
- **Activity scorecards**: Aggregated performance metrics across all data sources

### Use Case Examples

**Investigating Corporate Influence:**
```
1. Use analyze_bill_lobbying to find organizations lobbying on Bill C-3
2. Use search_lobbying_communications to see which MPs they met with
3. Use list_votes to check how those MPs voted
4. Use detect_conflicts_of_interest to identify patterns
```

**Evaluating MP Performance:**
```
1. Use get_mp_activity_scorecard for comprehensive overview
2. Use analyze_mp_bills to see legislative effectiveness
3. Use get_mp_expenses to review spending patterns
4. Use get_mp_petitions to check citizen engagement
```

**Tracking Legislation:**
```
1. Use analyze_bill_progress for timeline and status
2. Use search_bill_debates to find relevant Hansard speeches
3. Use analyze_bill_lobbying to identify corporate interest
4. Use get_committee_details to see who's reviewing it
```

## Key Implementation Notes

- All clients accept optional `session` parameter to share a `RateLimitedSession` instance
- OpenParliament list methods return iterators - use `list()` to materialize all results
- Hansard parsing preserves paragraph structure with double-newline separation
- Bill codes in LEGISinfo should be lowercase (e.g., "c-249" not "C-249")
- DocumentViewer slugs for Hansard can be relative (e.g., "latest/hansard") or full URLs
- The MCP server initializes clients globally to avoid recreation on each request
- CanLII tools are only exposed if the `CANLII_API_KEY` environment variable is set
- **Lobbying data**: First load downloads ~90MB, cached locally for instant subsequent access
- **Petitions**: XML API supports up to 1000 records per request
- **Expenses**: Data available quarterly, typically 2-3 months after quarter end

## Testing the MCP Server

To test the server locally with Claude Desktop:

1. Build and install the package: `pip install -e .`
2. Add the server configuration to Claude Desktop's config file
3. Restart Claude Desktop
4. The FedMCP tools should appear in the MCP tools menu
5. Test with queries like "Search for debates about climate change" or "Find Supreme Court cases about charter rights"

## Bug Fixes from canfedinfo

The client code includes fixes from the original canfedinfo library:

**OpenParliamentClient** (clients/openparliament.py:52-54):
- Fixed pagination to handle relative URLs from API responses
- The fetcher prepends `base_url` to relative URLs starting with '/'

**OurCommonsHansardClient** (clients/ourcommons.py:89-96, 101-149):
- Fixed UTF-8 BOM handling by decoding with 'utf-8-sig' encoding
- Updated XML parsing to match actual Hansard structure using `<ExtractedInformation>`, `<Intervention>`, and `<ParaText>` elements
- Always compile graph-api for Cloud Run with --platform linux/amd64
- production application is located on neo4j VM on google cloud services
- Ingestion functions are handled on the ingestion VM in Google Cloud Services
- canadagpt-graph-api is the container in Cloud Run for the production graph api
- Screenshots are located at ~/Desktop/Screenshot*.png