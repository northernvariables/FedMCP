"""Client helpers for the OpenParliament API."""
from __future__ import annotations

from typing import Any, Dict, Iterator, Optional

from fedmcp.http import RateLimitedSession, merge_params, paginate


DEFAULT_BASE_URL = "https://api.openparliament.ca"
DEFAULT_HEADERS = {
    "User-Agent": "Connexxia-Agent (matt@thoughtforge.com)",
    "API-Version": "v1",
    "Accept": "application/json",
}


class OpenParliamentClient:
    """A minimal, pagination-aware OpenParliament API client.

    Note:
        OpenParliament API will return HTTP 429 if rate limits are exceeded.
        This client uses conservative rate limiting (10 requests/second) to be
        respectful of the service. Headers include User-Agent with email and
        API-Version as recommended by OpenParliament documentation.
    """

    def __init__(
        self,
        *,
        base_url: str = DEFAULT_BASE_URL,
        headers: Optional[Dict[str, str]] = None,
        session: Optional[RateLimitedSession] = None,
    ) -> None:
        self.base_url = base_url.rstrip("/")
        # Use conservative rate limiting: 10 requests/second = 0.1s interval
        self.session = session or RateLimitedSession(min_request_interval=0.1)
        self.headers = {**DEFAULT_HEADERS, **(headers or {})}

    # ------------------------------------------------------------------
    # Low-level request helpers
    # ------------------------------------------------------------------
    def _request(
        self, endpoint: str, *, params: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        url = self._build_url(endpoint)
        response = self.session.get(url, headers=self.headers, params=params)
        response.raise_for_status()
        return response.json()

    def _build_url(self, endpoint: str) -> str:
        endpoint = endpoint.lstrip("/")
        return f"{self.base_url}/{endpoint}"

    def _paginate(
        self, endpoint: str, *, params: Optional[Dict[str, Any]] = None
    ) -> Iterator[Dict[str, Any]]:
        first_page = self._request(endpoint, params=params)

        def fetcher(next_url: str) -> Dict[str, Any]:
            # Handle relative URLs from pagination
            if next_url.startswith('/'):
                next_url = f"{self.base_url}{next_url}"
            response = self.session.get(next_url, headers=self.headers)
            response.raise_for_status()
            return response.json()

        yield from paginate(first_page, fetcher)

    # ------------------------------------------------------------------
    # Debates
    # ------------------------------------------------------------------
    def list_debates(self, **params: Any) -> Iterator[Dict[str, Any]]:
        """Iterate through debate listings.

        ``params`` are forwarded as query parameters; useful ones include
        ``limit``, ``offset``, and filtering options documented by
        OpenParliament.
        """

        return self._paginate("/debates/", params=params)

    def get_debate(self, debate_path: str) -> Dict[str, Any]:
        """Fetch a specific debate resource given its path or identifier."""

        return self._request(debate_path)

    # ------------------------------------------------------------------
    # Bills
    # ------------------------------------------------------------------
    def list_bills(self, **params: Any) -> Iterator[Dict[str, Any]]:
        return self._paginate("/bills/", params=params)

    def get_bill(self, bill_path: str) -> Dict[str, Any]:
        return self._request(bill_path)

    # ------------------------------------------------------------------
    # Members of Parliament
    # ------------------------------------------------------------------
    def list_mps(self, **params: Any) -> Iterator[Dict[str, Any]]:
        return self._paginate("/mps/", params=params)

    def get_mp(self, mp_path: str) -> Dict[str, Any]:
        return self._request(mp_path)

    # ------------------------------------------------------------------
    # Votes and Committees
    # ------------------------------------------------------------------
    def list_votes(self, **params: Any) -> Iterator[Dict[str, Any]]:
        return self._paginate("/votes/", params=params)

    def get_vote(self, vote_path: str) -> Dict[str, Any]:
        return self._request(vote_path)

    def list_committees(self, **params: Any) -> Iterator[Dict[str, Any]]:
        return self._paginate("/committees/", params=params)

    def get_committee(self, committee_path: str) -> Dict[str, Any]:
        return self._request(committee_path)

    # ------------------------------------------------------------------
    # Politicians (MPs and Senators)
    # ------------------------------------------------------------------
    def search_politician(self, name: str, **params: Any) -> Iterator[Dict[str, Any]]:
        """Search for politicians by name.

        Args:
            name: Name to search for (case-insensitive partial match)
            **params: Additional query parameters
        """
        # OpenParliament doesn't have a search endpoint, so we filter client-side
        # This is acceptable since the total number of politicians is manageable
        all_politicians = self._paginate("/politicians/", params=params)

        name_lower = name.lower()
        for politician in all_politicians:
            politician_name = politician.get('name', '').lower()
            if name_lower in politician_name:
                yield politician

    def get_politician(self, politician_url: str) -> Dict[str, Any]:
        """Get detailed information about a specific politician."""
        return self._request(politician_url)

    def get_politician_ballots(self, politician_url: str, limit: int = 20) -> list[Dict[str, Any]]:
        """Get voting history (ballots) for a specific politician.

        Args:
            politician_url: The URL path for the politician (e.g., '/politicians/pierre-poilievre/')
            limit: Maximum number of ballots to return

        Returns:
            List of ballot records with vote information
        """
        params = {'politician': politician_url, 'limit': limit}
        response = self._request('/votes/ballots/', params=params)
        return response.get('objects', [])

    def get_vote_ballots(self, vote_url: str, limit: int = 350) -> list[Dict[str, Any]]:
        """Get individual MP ballots for a specific vote.

        Args:
            vote_url: The URL path for the vote (e.g., '/votes/45-1/43/')
            limit: Maximum number of ballots to return (default 350 covers all MPs)

        Returns:
            List of ballot records showing how each MP voted
        """
        # Pass vote URL as-is, requests library will handle URL encoding
        params = {'vote': vote_url, 'limit': limit}
        response = self._request('/votes/ballots/', params=params)
        return response.get('objects', [])

    # ------------------------------------------------------------------
    # Helper routines
    # ------------------------------------------------------------------
    def build_params(
        self, base_params: Optional[Dict[str, Any]] = None, **overrides: Any
    ) -> Dict[str, Any]:
        """Combine default parameters with per-request overrides."""

        return merge_params(base_params, overrides)
