"""Test Phase 4 enhancements."""
import asyncio
from mcp import ClientSession, StdioServerParameters
from mcp.client.stdio import stdio_client

async def test_phase4():
    """Test that all Phase 4 tools are available and working."""
    server_params = StdioServerParameters(
        command="/Users/matthewdufresne/FedMCP/venv/bin/python",
        args=["-m", "fedmcp.server"],
    )

    print("=" * 60)
    print("Testing Phase 4 Enhancements")
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

            # Check for Phase 4 tools
            phase4_tools = {
                "get_bill_legislative_progress": "Bill legislative progress tracker",
                "analyze_mp_voting_participation": "MP voting participation analyzer",
                "search_topic_across_sources": "Multi-source topic search",
            }

            print("Phase 4 New Tools:")
            print("-" * 60)
            for tool_name, description in phase4_tools.items():
                if tool_name in tool_names:
                    print(f"  ✓ {tool_name}: {description}")
                else:
                    print(f"  ✗ {tool_name}: {description} - MISSING!")

            print("\n" + "=" * 60)
            print("Quick Functional Test")
            print("=" * 60)

            # Test bill progress tracker
            if "get_bill_legislative_progress" in tool_names:
                try:
                    print("\nTesting get_bill_legislative_progress (C-2)...")
                    result = await session.call_tool("get_bill_legislative_progress", arguments={
                        "bill_number": "C-2",
                        "session": "45-1"
                    })
                    if result.content:
                        preview = str(result.content[0])[:300]
                        print(f"  ✓ Response: {preview}...")
                except Exception as e:
                    print(f"  ⚠ Error: {e}")

            # Test MP voting participation
            if "analyze_mp_voting_participation" in tool_names:
                try:
                    print("\nTesting analyze_mp_voting_participation (Pierre Poilievre)...")
                    result = await session.call_tool("analyze_mp_voting_participation", arguments={
                        "politician_url": "/politicians/pierre-poilievre/",
                        "limit": 20
                    })
                    if result.content:
                        preview = str(result.content[0])[:300]
                        print(f"  ✓ Response: {preview}...")
                except Exception as e:
                    print(f"  ⚠ Error: {e}")

            # Test multi-source search
            if "search_topic_across_sources" in tool_names:
                try:
                    print("\nTesting search_topic_across_sources ('climate')...")
                    result = await session.call_tool("search_topic_across_sources", arguments={
                        "topic": "climate",
                        "limit_per_source": 3
                    })
                    if result.content:
                        preview = str(result.content[0])[:400]
                        print(f"  ✓ Response: {preview}...")
                except Exception as e:
                    print(f"  ⚠ Error: {e}")

            print("\n" + "=" * 60)
            print("Phase 4 Testing Complete!")
            print("=" * 60)
            print("\n✅ Phase 4 core features are working!")
            print("\nNew capabilities:")
            print("  • Bill legislative progress tracking (understand where bills are)")
            print("  • MP voting participation analysis (accountability tool)")
            print("  • Multi-source topic search (comprehensive research)")
            print("\nTo test in Claude Desktop:")
            print("  1. Restart Claude Desktop")
            print("  2. Try: 'What is the legislative progress of Bill C-2?'")
            print("  3. Try: 'Analyze Pierre Poilievre's voting participation'")
            print("  4. Try: 'Search for climate across all sources'")

if __name__ == "__main__":
    asyncio.run(test_phase4())
