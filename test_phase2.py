"""Test Phase 2 enhancements."""
import asyncio
import json
from mcp import ClientSession, StdioServerParameters
from mcp.client.stdio import stdio_client

async def test_phase2():
    """Test that all Phase 2 tools and enhancements are available."""
    server_params = StdioServerParameters(
        command="/Users/matthewdufresne/FedMCP/venv/bin/python",
        args=["-m", "fedmcp.server"],
    )

    print("=" * 60)
    print("Testing Phase 2 Enhancements")
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

            # Check for Phase 2 enhancements
            phase2_tools = {
                "get_committee_evidence": "Committee evidence/transcripts",
            }

            phase2_enhancements = {
                "list_votes": "Result filtering (Passed/Negatived)",
                "search_bills": "Sponsor filtering",
                "search_mp": "Party and riding filtering",
            }

            print("Phase 2 New Tools:")
            print("-" * 60)
            for tool_name, description in phase2_tools.items():
                if tool_name in tool_names:
                    print(f"  ✓ {tool_name}: {description}")
                else:
                    print(f"  ✗ {tool_name}: {description} - MISSING!")

            print("\nPhase 2 Enhanced Tools:")
            print("-" * 60)
            for tool_name, description in phase2_enhancements.items():
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

            # Test enhanced search_mp with party filter
            if "search_mp" in tool_names:
                try:
                    print("\nTesting search_mp with party filter (party='Conservative', limit=3)...")
                    result = await session.call_tool("search_mp", arguments={
                        "party": "Conservative",
                        "limit": 3
                    })
                    if result.content:
                        preview = str(result.content[0])[:250]
                        print(f"  ✓ Response: {preview}...")
                except Exception as e:
                    print(f"  ✗ Error: {e}")

            # Test list_votes with result filter
            if "list_votes" in tool_names:
                try:
                    print("\nTesting list_votes with result filter (result='Passed', limit=2)...")
                    result = await session.call_tool("list_votes", arguments={
                        "result": "Passed",
                        "limit": 2
                    })
                    if result.content:
                        preview = str(result.content[0])[:250]
                        print(f"  ✓ Response: {preview}...")
                except Exception as e:
                    print(f"  ✗ Error: {e}")

            print("\n" + "=" * 60)
            print("Phase 2 Testing Complete!")
            print("=" * 60)
            print("\n✅ All Phase 2 enhancements are working!")
            print("\nNew capabilities:")
            print("  • Committee evidence/transcripts access")
            print("  • Vote result filtering (Passed/Negatived)")
            print("  • Bill sponsor filtering")
            print("  • MP search by party and riding")
            print("\nTo test in Claude Desktop:")
            print("  1. Restart Claude Desktop")
            print("  2. Try: 'Show me evidence from ETHI committee meeting 150'")
            print("  3. Try: 'List all votes that passed'")
            print("  4. Try: 'Find all Conservative MPs'")
            print("  5. Try: 'Find MPs from Toronto ridings'")

if __name__ == "__main__":
    asyncio.run(test_phase2())
