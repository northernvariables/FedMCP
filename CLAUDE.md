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

### MCP Server (server.py)

The MCP server exposes tools through the Model Context Protocol. Each tool corresponds to a specific query capability:

**Parliamentary Data Tools:**
- `search_debates` - Search House of Commons debates by keyword
- `search_bills` - Search bills by number or keywords
- `search_hansard` - Search Hansard transcripts for quotes
- `list_debates` - List recent debates with pagination
- `get_bill` - Get specific bill details from LEGISinfo
- `list_mps` - List Members of Parliament
- `list_votes` - List parliamentary votes

**Legal Data Tools (requires CANLII_API_KEY):**
- `search_cases` - Search case law by database and keywords
- `get_case` - Get specific case metadata
- `get_case_citations` - Get citing/cited cases and legislation
- `search_legislation` - Browse federal and provincial legislation

The server uses async/await patterns and communicates via stdio using the MCP SDK.

## Common Development Tasks

### Testing client usage locally

```python
import os
from fedmcp import OpenParliamentClient, LegisInfoClient, OurCommonsHansardClient, CanLIIClient

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

## Key Implementation Notes

- All clients accept optional `session` parameter to share a `RateLimitedSession` instance
- OpenParliament list methods return iterators - use `list()` to materialize all results
- Hansard parsing preserves paragraph structure with double-newline separation
- Bill codes in LEGISinfo should be lowercase (e.g., "c-249" not "C-249")
- DocumentViewer slugs for Hansard can be relative (e.g., "latest/hansard") or full URLs
- The MCP server initializes clients globally to avoid recreation on each request
- CanLII tools are only exposed if the `CANLII_API_KEY` environment variable is set

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
