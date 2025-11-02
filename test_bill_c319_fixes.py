"""Test bug fixes for Bill C-319 queries."""
import asyncio
from mcp import ClientSession, StdioServerParameters
from mcp.client.stdio import stdio_client

async def test_c319_fixes():
    """Test that Bill C-319 (44-1) can now be found."""
    server_params = StdioServerParameters(
        command="/Users/matthewdufresne/FedMCP/venv/bin/python",
        args=["-m", "fedmcp.server"],
    )

    print("=" * 70)
    print("Testing Bill C-319 Bug Fixes")
    print("=" * 70)

    async with stdio_client(server_params) as (read, write):
        async with ClientSession(read, write) as session:
            # Initialize
            await session.initialize()
            print("✓ Server initialized successfully\n")

            # TEST 1: get_bill_legislative_progress with multi-session support
            print("=" * 70)
            print("TEST 1: get_bill_legislative_progress (C-319)")
            print("=" * 70)
            try:
                print("\nCalling get_bill_legislative_progress with bill_number='C-319'...")
                print("(Should auto-detect session 44-1)")
                result = await session.call_tool("get_bill_legislative_progress", arguments={
                    "bill_number": "C-319"
                })
                if result.content:
                    response_text = str(result.content[0].text)
                    print("\n" + "─" * 70)
                    print(response_text[:800])
                    if len(response_text) > 800:
                        print("...(truncated)")
                    print("─" * 70)

                    if "44-1" in response_text:
                        print("\n✅ SUCCESS: Found Bill C-319 from session 44-1")
                    elif "not found" in response_text.lower():
                        print("\n❌ FAIL: Bill C-319 not found")
                    else:
                        print("\n⚠️  PARTIAL: Got response but unclear if correct session")
                else:
                    print("\n❌ FAIL: No response content")
            except Exception as e:
                print(f"\n❌ ERROR: {e}")

            # TEST 2: search_topic_across_sources with improved bill search
            print("\n\n" + "=" * 70)
            print("TEST 2: search_topic_across_sources ('Bill C-319')")
            print("=" * 70)
            try:
                print("\nCalling search_topic_across_sources with topic='Bill C-319'...")
                print("(Should detect it's a bill number and search LEGISinfo)")
                result = await session.call_tool("search_topic_across_sources", arguments={
                    "topic": "Bill C-319",
                    "limit_per_source": 5
                })
                if result.content:
                    response_text = str(result.content[0].text)
                    print("\n" + "─" * 70)

                    # Extract just the BILLS section
                    if "BILLS" in response_text:
                        bills_section = response_text.split("BILLS")[1].split("\n\n")[0:3]
                        print("BILLS section:")
                        print("\n".join(bills_section))

                    print("─" * 70)

                    if "C-319" in response_text and "44-1" in response_text:
                        print("\n✅ SUCCESS: Found Bill C-319 (44-1) in bills section")
                    elif "No bills found" in response_text:
                        print("\n❌ FAIL: No bills found")
                    elif "C-319" in response_text:
                        print("\n⚠️  PARTIAL: Found C-319 but session unclear")
                    else:
                        print("\n❌ FAIL: Bill C-319 not found in results")

                    # Check for Hansard error
                    if "Error searching Hansard" in response_text:
                        print("❌ FAIL: Hansard error still present")
                    else:
                        print("✅ SUCCESS: No Hansard errors")
                else:
                    print("\n❌ FAIL: No response content")
            except Exception as e:
                print(f"\n❌ ERROR: {e}")

            # TEST 3: Hansard search (verify no attribute error)
            print("\n\n" + "=" * 70)
            print("TEST 3: Hansard Error Fix")
            print("=" * 70)
            try:
                print("\nCalling search_topic_across_sources with topic='climate'...")
                print("(Checking that Hansard section doesn't error)")
                result = await session.call_tool("search_topic_across_sources", arguments={
                    "topic": "climate",
                    "limit_per_source": 3
                })
                if result.content:
                    response_text = str(result.content[0].text)

                    if "'OurCommonsHansardClient' object has no attribute" in response_text:
                        print("❌ FAIL: Hansard attribute error still present")
                    elif "Error searching Hansard" in response_text:
                        print("⚠️  WARNING: Hansard error (but not attribute error)")
                        # Extract error message
                        if "HANSARD" in response_text:
                            hansard_section = response_text.split("HANSARD")[1][:200]
                            print(f"  Error: {hansard_section}")
                    else:
                        print("✅ SUCCESS: No Hansard errors")
                else:
                    print("\n❌ FAIL: No response content")
            except Exception as e:
                print(f"\n❌ ERROR: {e}")

            print("\n\n" + "=" * 70)
            print("Testing Complete!")
            print("=" * 70)
            print("\nSummary:")
            print("  • Multi-session bill search (TEST 1)")
            print("  • Improved bill detection in multi-source search (TEST 2)")
            print("  • Hansard method fix (TEST 3)")
            print("\nIf all tests passed, the bugs are fixed!")
            print("\nNext step: Test in Claude Desktop with:")
            print("  - 'Tell me about Bill C-319'")
            print("  - 'Search for Bill C-319 across all sources'")
            print("  - 'What is the legislative progress of C-319?'")

if __name__ == "__main__":
    asyncio.run(test_c319_fixes())
