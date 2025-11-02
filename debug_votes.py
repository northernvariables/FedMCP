"""Debug script to test list_votes functionality."""

import os
from dotenv import load_dotenv

load_dotenv()

from fedmcp import OpenParliamentClient

def test_list_votes():
    """Test the list_votes method."""
    print("Testing OpenParliament list_votes...")
    client = OpenParliamentClient()

    try:
        print("Fetching votes (this may take a moment)...")
        votes = []
        for i, vote in enumerate(client.list_votes(limit=3)):
            votes.append(vote)
            print(f"Vote {i+1}: {vote.get('date')} - {vote.get('number')}")
            if i >= 2:  # Only get first 3
                break

        print(f"\n✓ Retrieved {len(votes)} votes")

        if votes:
            print("\nFirst vote details:")
            import json
            print(json.dumps(votes[0], indent=2))

    except Exception as e:
        print(f"✗ Error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    test_list_votes()
