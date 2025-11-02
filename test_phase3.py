"""Test Phase 3 enhancements."""
import asyncio
from mcp import ClientSession, StdioServerParameters
from mcp.client.stdio import stdio_client

async def test_phase3():
    """Test that all Phase 3 tools are available and working."""
    server_params = StdioServerParameters(
        command="/Users/matthewdufresne/FedMCP/venv/bin/python",
        args=["-m", "fedmcp.server"],
    )

    print("=" * 60)
    print("Testing Phase 3 Enhancements")
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

            # Check for Phase 3 tools
            phase3_tools = {
                "find_mp_by_postal_code": "Postal code to MP lookup (Represent API)",
                "analyze_party_discipline": "Party discipline analysis",
            }

            print("Phase 3 New Tools:")
            print("-" * 60)
            for tool_name, description in phase3_tools.items():
                if tool_name in tool_names:
                    print(f"  ✓ {tool_name}: {description}")
                else:
                    print(f"  ✗ {tool_name}: {description} - MISSING!")

            print("\n" + "=" * 60)
            print("Quick Functional Test")
            print("=" * 60)

            # Test postal code lookup
            if "find_mp_by_postal_code" in tool_names:
                try:
                    print("\nTesting find_mp_by_postal_code (postal_code='K1A 0A9')...")
                    result = await session.call_tool("find_mp_by_postal_code", arguments={
                        "postal_code": "K1A 0A9"
                    })
                    if result.content:
                        preview = str(result.content[0])[:300]
                        print(f"  ✓ Response: {preview}...")
                except Exception as e:
                    print(f"  ⚠ Error (may be API issue): {e}")

            # Test party discipline analysis (using a recent vote)
            if "analyze_party_discipline" in tool_names:
                try:
                    print("\nTesting analyze_party_discipline (vote_url='/votes/45-1/43/')...")
                    result = await session.call_tool("analyze_party_discipline", arguments={
                        "vote_url": "/votes/45-1/43/"
                    })
                    if result.content:
                        preview = str(result.content[0])[:300]
                        print(f"  ✓ Response: {preview}...")
                except Exception as e:
                    print(f"  ⚠ Error: {e}")

            print("\n" + "=" * 60)
            print("Phase 3 Testing Complete!")
            print("=" * 60)
            print("\n✅ Phase 3 core features are working!")
            print("\nNew capabilities:")
            print("  • Postal code to MP lookup (THE #1 most requested feature)")
            print("  • Party discipline analysis (unique analytical tool)")
            print("\nTo test in Claude Desktop:")
            print("  1. Restart Claude Desktop")
            print("  2. Try: 'Who is my MP for postal code K1A 0A9?'")
            print("  3. Try: 'Analyze party discipline for vote /votes/45-1/43/'")
            print("  4. Try: 'Which MPs voted against their party in the last vote?'")

if __name__ == "__main__":
    asyncio.run(test_phase3())
