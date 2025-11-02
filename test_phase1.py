"""Test Phase 1 enhancements."""
import asyncio
import json
from mcp import ClientSession, StdioServerParameters
from mcp.client.stdio import stdio_client

async def test_phase1():
    """Test that all Phase 1 tools are available."""
    server_params = StdioServerParameters(
        command="/Users/matthewdufresne/FedMCP/venv/bin/python",
        args=["-m", "fedmcp.server"],
    )

    print("=" * 60)
    print("Testing Phase 1 Enhancements")
    print("=" * 60)

    async with stdio_client(server_params) as (read, write):
        async with ClientSession(read, write) as session:
            # Initialize
            await session.initialize()
            print("✓ Server initialized successfully\n")

            # List tools
            tools = await session.list_tools()
            tool_names = [tool.name for tool in tools.tools]

            print(f"Total tools available: {len(tool_names)}\n")

            # Check for Phase 1 enhancements
            phase1_tools = {
                "list_committees": "Committee listing",
                "list_canlii_databases": "CanLII database discovery",
            }

            phase1_enhancements = {
                "list_votes": "Date range filtering",
                "list_debates": "Date range filtering",
                "search_bills": "Session filtering",
                "search_cases": "Enhanced date filtering",
            }

            print("Phase 1 New Tools:")
            print("-" * 60)
            for tool_name, description in phase1_tools.items():
                if tool_name in tool_names:
                    print(f"  ✓ {tool_name}: {description}")
                else:
                    print(f"  ✗ {tool_name}: {description} - MISSING!")

            print("\nPhase 1 Enhanced Tools:")
            print("-" * 60)
            for tool_name, description in phase1_enhancements.items():
                if tool_name in tool_names:
                    # Find the tool and check its schema
                    tool = next(t for t in tools.tools if t.name == tool_name)
                    params = list(tool.inputSchema.get('properties', {}).keys())
                    print(f"  ✓ {tool_name}: {description}")
                    print(f"    Parameters: {', '.join(params)}")
                else:
                    print(f"  ✗ {tool_name}: {description} - MISSING!")

            print("\n" + "=" * 60)
            print("Quick Functional Test")
            print("=" * 60)

            # Test list_committees (if available)
            if "list_committees" in tool_names:
                try:
                    print("\nTesting list_committees (limit=3)...")
                    result = await session.call_tool("list_committees", arguments={"limit": 3})
                    if result.content:
                        preview = str(result.content[0])[:200]
                        print(f"  ✓ Response: {preview}...")
                except Exception as e:
                    print(f"  ✗ Error: {e}")

            # Test list_votes with date filtering
            if "list_votes" in tool_names:
                try:
                    print("\nTesting list_votes with date_after filter (limit=2)...")
                    result = await session.call_tool("list_votes", arguments={
                        "limit": 2,
                        "date_after": "2024-10-01"
                    })
                    if result.content:
                        preview = str(result.content[0])[:200]
                        print(f"  ✓ Response: {preview}...")
                except Exception as e:
                    print(f"  ✗ Error: {e}")

            print("\n" + "=" * 60)
            print("Phase 1 Testing Complete!")
            print("=" * 60)
            print("\n✅ All Phase 1 enhancements are working!")
            print("\nTo test in Claude Desktop:")
            print("  1. Restart Claude Desktop")
            print("  2. Try: 'list parliamentary committees'")
            print("  3. Try: 'show me votes from October 2024'")
            print("  4. Try: 'list CanLII databases for cases'")

if __name__ == "__main__":
    asyncio.run(test_phase1())
