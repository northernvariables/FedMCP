"""Test MCP communication directly."""
import asyncio
import json
from mcp import ClientSession, StdioServerParameters
from mcp.client.stdio import stdio_client

async def test_mcp():
    """Test MCP server communication."""
    server_params = StdioServerParameters(
        command="/Users/matthewdufresne/FedMCP/venv/bin/python",
        args=["-m", "fedmcp.server"],
    )

    async with stdio_client(server_params) as (read, write):
        async with ClientSession(read, write) as session:
            # Initialize
            await session.initialize()
            print("✓ Server initialized successfully")

            # List tools
            tools = await session.list_tools()
            print(f"\n✓ Found {len(tools.tools)} tools:")
            for tool in tools.tools:
                print(f"  - {tool.name}: {tool.description[:60]}...")

            # Test a tool call
            print("\n✓ Testing list_votes tool...")
            result = await session.call_tool("list_votes", arguments={"limit": 3})

            if result.content:
                preview = str(result.content[0])[:200]
                print(f"  Response: {preview}...")
                print("\n🎉 MCP server is working perfectly!")
            else:
                print("  ⚠ Empty response")

if __name__ == "__main__":
    asyncio.run(test_mcp())
