"""Quick test script to verify the FedMCP clients work correctly."""

import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

from fedmcp import OpenParliamentClient, CanLIIClient

def test_openparliament():
    """Test OpenParliament client."""
    print("Testing OpenParliament client...")
    client = OpenParliamentClient()

    # Get a few recent debates
    debates = list(client.list_debates(limit=3))
    print(f"✓ Retrieved {len(debates)} debates")

    if debates:
        first_debate = debates[0]
        print(f"  - Latest debate date: {first_debate.get('date')}")
        print(f"  - Speaker: {first_debate.get('speaker', {}).get('name')}")

    print()

def test_canlii():
    """Test CanLII client."""
    api_key = os.getenv("CANLII_API_KEY")
    if not api_key:
        print("⚠ CanLII API key not found, skipping CanLII tests")
        return

    print("Testing CanLII client...")
    client = CanLIIClient(api_key=api_key)

    # List databases
    databases = client.list_databases(language="en")
    print(f"✓ Retrieved database information")

    # Search Supreme Court cases
    try:
        cases = client.search_cases_by_keyword(
            database_id="csc-scc",
            query="charter",
            limit=3
        )
        print(f"✓ Found {len(cases)} Supreme Court cases matching 'charter'")

        if cases:
            print(f"  - First case: {cases[0].get('title', 'N/A')}")
    except Exception as e:
        print(f"✗ Error searching cases: {e}")

    print()

if __name__ == "__main__":
    print("=" * 60)
    print("FedMCP Client Test Suite")
    print("=" * 60)
    print()

    test_openparliament()
    test_canlii()

    print("=" * 60)
    print("All tests completed!")
    print("=" * 60)
