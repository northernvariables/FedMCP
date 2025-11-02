# FedMCP - Federal Parliamentary Information MCP Server

An MCP (Model Context Protocol) server providing **comprehensive access** to Canadian federal parliamentary and legal information sources through Claude and other LLM applications.

**22 tools** providing access to **5 Canadian APIs** with **90% coverage** of common citizen queries and **advanced analytics**.

## Features

FedMCP provides tools for accessing:

- **OpenParliament API** - Debates, votes, MPs, bills, and committees with advanced filtering
- **House of Commons Hansard** - Official transcripts of parliamentary proceedings
- **LEGISinfo** - Current and historical Canadian legislation
- **CanLII API** - Canadian Legal Information Institute case law and legislation (requires API key)
- **Represent API** - Postal code to MP lookup and representative information

## Installation

```bash
# Clone the repository
git clone https://github.com/northernvariables/FedMCP.git
cd FedMCP

# Install in development mode
pip install -e .
```

## Configuration

For CanLII access, you need an API key (free for research and non-commercial use):
1. Request a key from https://www.canlii.org/en/feedback/feedback.html
2. Copy `.env.example` to `.env`
3. Add your CanLII API key to the `.env` file

```bash
cp .env.example .env
# Edit .env and add: CANLII_API_KEY=your_key_here
```

## Usage

### Running the MCP Server

```bash
fedmcp
```

Or run directly with Python:

```bash
python -m fedmcp.server
```

### Available Tools (22 Total)

The MCP server exposes the following tools:

#### Parliamentary Data (OpenParliament & LEGISinfo)
- `search_debates` - Search House of Commons debates by keyword
- `search_bills` - Search Canadian bills by number or keywords
- `list_debates` - List recent parliamentary debates with temporal filtering
- `get_bill` - Get details for a specific bill
- `get_bill_votes` - Get all votes related to a specific bill
- `get_bill_legislative_progress` - **Phase 4** Track a bill's journey through Parliament with detailed status
- `list_mps` - List Members of Parliament with filtering
- `search_politician` - Search for MPs and Senators by name
- `get_politician_voting_history` - Get voting records for a specific politician
- `analyze_mp_voting_participation` - **Phase 4** Analyze MP voting attendance and participation rates
- `list_votes` - List parliamentary votes with temporal and result filtering
- `get_vote_details` - Get detailed vote information including individual MP ballots
- `list_committees` - List parliamentary committees
- `get_committee_details` - Get committee information and meetings
- `analyze_party_discipline` - Analyze voting patterns to find MPs who voted against their party
- `search_topic_across_sources` - **Phase 4** Search across all sources (bills, debates, votes, Hansard) in one query

#### Hansard Transcripts (OurCommons)
- `search_hansard` - Search Hansard transcripts for quotes and statements
- `get_hansard_sitting` - Get complete Hansard transcript for a specific sitting

#### Representative Lookup (Represent API)
- `find_mp_by_postal_code` - **NEW** Find your federal MP by postal code with full contact information

#### Legal Data (CanLII - requires API key)
- `search_cases` - Search Canadian case law by database and keywords
- `get_case` - Get metadata for a specific case
- `get_case_citations` - Get citing/cited cases and legislation
- `search_legislation` - Browse Canadian federal and provincial legislation

## MCP Client Configuration

### Claude Desktop

Add to your Claude Desktop configuration file:

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

## Usage Examples

### Find Your MP by Postal Code
```
User: "Who is my MP for postal code K1A 0A9?"
FedMCP: Returns MP name, party, riding, email, phone, and office addresses
```

### Track Bill Progress (Phase 4)
```
User: "What is the legislative progress of Bill C-2?"
FedMCP: Shows current stage, completed stages, timeline, sponsor, and status
```

### Analyze MP Voting Participation (Phase 4)
```
User: "Analyze Pierre Poilievre's voting participation"
FedMCP: Returns participation rate, vote breakdown, and recent voting activity
```

### Search Across All Sources (Phase 4)
```
User: "Search for 'climate' across all sources"
FedMCP: Returns results from bills, debates, votes, and Hansard in one query
```

### Analyze Party Discipline
```
User: "Analyze party discipline for vote /votes/45-1/43/"
FedMCP: Shows which MPs voted against their party's majority position
```

### Search Hansard Transcripts
```
User: "What did Pierre Poilievre say about carbon tax in the last month?"
FedMCP: Searches recent Hansard transcripts for matching quotes
```

### Search Case Law
```
User: "Find Supreme Court cases about Charter section 7"
FedMCP: Searches CanLII database for matching cases
```

## Architecture

FedMCP is built on the existing canfedinfo library clients, adapted for the MCP protocol:

- **OpenParliamentClient** - Pagination-aware API client for openparliament.ca
- **OurCommonsHansardClient** - XML parser for House of Commons Hansard transcripts
- **LegisInfoClient** - Access to LEGISinfo bill and legislation data
- **CanLIIClient** - REST API client for Canadian case law and legislation
- **RepresentClient** - Postal code lookup client for Represent API by Open North
- **RateLimitedSession** - Built-in retry logic with exponential backoff

All clients use a shared rate-limited HTTP session to ensure reliable API access.

## Recent Enhancements

### Phase 4 (November 2025) 🆕
- ✅ **Bill Legislative Progress Tracker** - Track bills through Parliament with detailed status
- ✅ **MP Voting Participation Analysis** - Accountability tool showing attendance and voting patterns
- ✅ **Multi-Source Topic Search** - Search across all sources (bills, debates, votes, Hansard) in one query
- ✅ Enhanced analytical capabilities leveraging all 5 APIs

### Phase 3 (November 2025)
- ✅ **Postal Code to MP Lookup** - THE #1 most requested feature by Canadians
- ✅ **Party Discipline Analysis** - Unique tool to identify MPs who voted against their party
- ✅ Integrated Represent API by Open North (5th API)
- ✅ Fixed vote ballot URL encoding bug

### Phase 2 (November 2025)
- ✅ Committee data access (list committees, get details)
- ✅ Temporal filtering (date ranges for votes and debates)
- ✅ Vote result filtering (passed/failed votes)
- ✅ Bill vote lookup
- ✅ Complete vote details with individual ballots

### Phase 1 (November 2025)
- ✅ Politician search by name
- ✅ Politician voting history
- ✅ Full Hansard sitting transcripts
- ✅ Enhanced debate listings with filters
- ✅ Enhanced MP listings with filters
- ✅ Enhanced vote listings with filters

**Total Growth:** From 14 tools to **22 tools (+57%)** with **90% coverage** of common citizen queries and **5 advanced analytical tools**.

## Development

```bash
# Install with development dependencies
pip install -e ".[dev]"

# Run tests
pytest
```

## License

MIT License - see LICENSE file for details

## Credits

Based on the canfedinfo library from the broadcast-os project.
