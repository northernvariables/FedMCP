# FedMCP - Federal Parliamentary Information MCP Server

An MCP (Model Context Protocol) server providing access to Canadian federal parliamentary and legal information sources through Claude and other LLM applications.

## Features

FedMCP provides tools for accessing:

- **OpenParliament API** - Debates, votes, MPs, bills, and committees
- **House of Commons Hansard** - Official transcripts of parliamentary proceedings
- **LEGISinfo** - Current and historical Canadian legislation
- **CanLII API** - Canadian Legal Information Institute case law and legislation (requires API key)

## Installation

```bash
# Clone the repository
git clone https://github.com/matthewdufresne/FedMCP.git
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

### Available Tools

The MCP server exposes the following tools:

**Parliamentary Data:**
- `search_debates` - Search House of Commons debates by keyword
- `search_bills` - Search Canadian bills by number or keywords
- `search_hansard` - Search Hansard transcripts for quotes and statements
- `list_debates` - List recent parliamentary debates
- `get_bill` - Get details for a specific bill
- `list_mps` - List Members of Parliament
- `list_votes` - List parliamentary votes

**Legal Data (requires CanLII API key):**
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

## Architecture

FedMCP is built on the existing canfedinfo library clients, adapted for the MCP protocol:

- **OpenParliamentClient** - Pagination-aware API client for openparliament.ca
- **OurCommonsHansardClient** - XML parser for House of Commons Hansard transcripts
- **LegisInfoClient** - Access to LEGISinfo bill and legislation data
- **CanLIIClient** - REST API client for Canadian case law and legislation
- **RateLimitedSession** - Built-in retry logic with exponential backoff

All clients use a shared rate-limited HTTP session to ensure reliable API access.

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
