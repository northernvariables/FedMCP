"""Client for the CanLII (Canadian Legal Information Institute) API."""
from __future__ import annotations

from typing import Any, Dict, Iterator, List, Optional

from fedmcp.http import RateLimitedSession, merge_params


DEFAULT_BASE_URL = "https://api.canlii.org/v1"
DEFAULT_HEADERS = {
    "Accept": "application/json",
}


class CanLIIClient:
    """A client for the CanLII REST API.

    Provides access to Canadian case law and legislation through the CanLII API.
    Requires an API key obtained from https://www.canlii.org/en/feedback/feedback.html

    The API supports:
    - Browsing courts and tribunals
    - Searching case law with date filters
    - Retrieving case metadata and citations
    - Browsing legislation databases
    - Retrieving legislation metadata
    """

    def __init__(
        self,
        *,
        api_key: str,
        base_url: str = DEFAULT_BASE_URL,
        headers: Optional[Dict[str, str]] = None,
        session: Optional[RateLimitedSession] = None,
    ) -> None:
        """Initialize the CanLII client.

        Args:
            api_key: Your CanLII API key (required)
            base_url: Base URL for the CanLII API (default: https://api.canlii.org/v1)
            headers: Optional additional headers
            session: Optional shared RateLimitedSession instance

        Note:
            CanLII API has rate limits:
            - 5,000 queries per day
            - 2 requests per second (enforced with 0.5s minimum interval)
            - 1 concurrent request (enforced by synchronous execution)
        """
        if not api_key:
            raise ValueError("CanLII API key is required")

        self.api_key = api_key
        self.base_url = base_url.rstrip("/")
        # Create session with CanLII rate limiting: 2 requests/second = 0.5s interval
        self.session = session or RateLimitedSession(min_request_interval=0.5)
        self.headers = {**DEFAULT_HEADERS, **(headers or {})}

    # ------------------------------------------------------------------
    # Low-level request helpers
    # ------------------------------------------------------------------
    def _request(
        self, endpoint: str, *, params: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """Make a request to the CanLII API.

        Args:
            endpoint: API endpoint path
            params: Optional query parameters

        Returns:
            Parsed JSON response
        """
        url = self._build_url(endpoint)
        # Always include API key in parameters
        params = merge_params({"api_key": self.api_key}, params)
        response = self.session.get(url, headers=self.headers, params=params)
        response.raise_for_status()
        return response.json()

    def _build_url(self, endpoint: str) -> str:
        """Build a full URL from an endpoint path.

        Args:
            endpoint: API endpoint path

        Returns:
            Full URL
        """
        endpoint = endpoint.lstrip("/")
        return f"{self.base_url}/{endpoint}"

    # ------------------------------------------------------------------
    # Case Browse API
    # ------------------------------------------------------------------
    def list_databases(self, language: str = "en") -> Dict[str, Any]:
        """List all available court and tribunal databases.

        Args:
            language: Language code ('en' or 'fr')

        Returns:
            Dictionary containing available databases organized by jurisdiction
        """
        return self._request(f"caseBrowse/{language}/")

    def browse_cases(
        self,
        database_id: str,
        *,
        language: str = "en",
        offset: int = 0,
        result_count: int = 10,
        published_before: Optional[str] = None,
        published_after: Optional[str] = None,
        modified_before: Optional[str] = None,
        modified_after: Optional[str] = None,
        changed_before: Optional[str] = None,
        changed_after: Optional[str] = None,
        decision_date_before: Optional[str] = None,
        decision_date_after: Optional[str] = None,
        **extra_params: Any,
    ) -> Dict[str, Any]:
        """Browse cases from a specific court or tribunal database.

        Args:
            database_id: Database identifier (e.g., 'csc-scc' for Supreme Court)
            language: Language code ('en' or 'fr')
            offset: Starting record number (default: 0)
            result_count: Number of results to return (max 10,000)
            published_before: Filter by publish date (ISO-8601 format: YYYY-MM-DD)
            published_after: Filter by publish date (ISO-8601 format: YYYY-MM-DD)
            modified_before: Filter by modification date (ISO-8601 format: YYYY-MM-DD)
            modified_after: Filter by modification date (ISO-8601 format: YYYY-MM-DD)
            changed_before: Filter by change date (ISO-8601 format: YYYY-MM-DD)
            changed_after: Filter by change date (ISO-8601 format: YYYY-MM-DD)
            decision_date_before: Filter by decision date (ISO-8601 format: YYYY-MM-DD)
            decision_date_after: Filter by decision date (ISO-8601 format: YYYY-MM-DD)
            **extra_params: Additional query parameters

        Returns:
            Dictionary containing cases and metadata
        """
        params = {
            "offset": offset,
            "resultCount": result_count,
            "publishedBefore": published_before,
            "publishedAfter": published_after,
            "modifiedBefore": modified_before,
            "modifiedAfter": modified_after,
            "changedBefore": changed_before,
            "changedAfter": changed_after,
            "decisionDateBefore": decision_date_before,
            "decisionDateAfter": decision_date_after,
            **extra_params,
        }
        return self._request(f"caseBrowse/{language}/{database_id}/", params=params)

    def get_case(
        self, database_id: str, case_id: str, *, language: str = "en"
    ) -> Dict[str, Any]:
        """Get metadata for a specific case.

        Args:
            database_id: Database identifier (e.g., 'csc-scc')
            case_id: Case identifier
            language: Language code ('en' or 'fr')

        Returns:
            Dictionary containing case metadata (title, citation, docket, keywords, etc.)
        """
        return self._request(f"caseBrowse/{language}/{database_id}/{case_id}/")

    # ------------------------------------------------------------------
    # Case Citator API
    # ------------------------------------------------------------------
    def get_cited_cases(self, database_id: str, case_id: str) -> Dict[str, Any]:
        """Get cases cited by a specific case.

        Note: Citator API only supports English ('en').

        Args:
            database_id: Database identifier
            case_id: Case identifier

        Returns:
            Dictionary containing cited cases
        """
        return self._request(f"caseCitator/en/{database_id}/{case_id}/citedCases")

    def get_citing_cases(self, database_id: str, case_id: str) -> Dict[str, Any]:
        """Get cases that cite a specific case.

        Note: Citator API only supports English ('en').

        Args:
            database_id: Database identifier
            case_id: Case identifier

        Returns:
            Dictionary containing citing cases
        """
        return self._request(f"caseCitator/en/{database_id}/{case_id}/citingCases")

    def get_cited_legislations(self, database_id: str, case_id: str) -> Dict[str, Any]:
        """Get legislation cited by a specific case.

        Note: Citator API only supports English ('en').

        Args:
            database_id: Database identifier
            case_id: Case identifier

        Returns:
            Dictionary containing cited legislation
        """
        return self._request(f"caseCitator/en/{database_id}/{case_id}/citedLegislations")

    # ------------------------------------------------------------------
    # Legislation Browse API
    # ------------------------------------------------------------------
    def list_legislation_databases(self, language: str = "en") -> Dict[str, Any]:
        """List all available legislation and regulation databases.

        Args:
            language: Language code ('en' or 'fr')

        Returns:
            Dictionary containing available legislation databases by jurisdiction
        """
        return self._request(f"legislationBrowse/{language}/")

    def browse_legislation(
        self, database_id: str, *, language: str = "en", **params: Any
    ) -> Dict[str, Any]:
        """Browse legislation or regulations from a specific database.

        Args:
            database_id: Database identifier (e.g., 'ca' for federal acts)
            language: Language code ('en' or 'fr')
            **params: Additional query parameters

        Returns:
            Dictionary containing legislation items
        """
        return self._request(f"legislationBrowse/{language}/{database_id}/", params=params)

    def get_legislation(
        self, database_id: str, legislation_id: str, *, language: str = "en"
    ) -> Dict[str, Any]:
        """Get metadata for specific legislation.

        Args:
            database_id: Database identifier
            legislation_id: Legislation identifier
            language: Language code ('en' or 'fr')

        Returns:
            Dictionary containing legislation metadata (title, status, dates, etc.)
        """
        return self._request(f"legislationBrowse/{language}/{database_id}/{legislation_id}/")

    # ------------------------------------------------------------------
    # Helper methods
    # ------------------------------------------------------------------
    def search_cases_by_keyword(
        self,
        database_id: str,
        query: str,
        *,
        language: str = "en",
        limit: int = 10,
        **filters: Any,
    ) -> List[Dict[str, Any]]:
        """Search cases by keyword in a specific database.

        Note: CanLII API doesn't have a native full-text search endpoint.
        This method fetches recent cases and filters client-side.
        For true full-text search, consider using the CanLII website search.

        Args:
            database_id: Database identifier
            query: Search query (used for client-side filtering)
            language: Language code ('en' or 'fr')
            limit: Maximum number of results
            **filters: Date filters (published_after, decision_date_before, etc.)

        Returns:
            List of matching cases
        """
        # Fetch cases with filters
        result = self.browse_cases(
            database_id,
            language=language,
            result_count=min(limit * 3, 100),  # Fetch more than needed for filtering
            **filters,
        )

        cases = result.get("cases", [])

        # Simple keyword matching (case-insensitive)
        query_lower = query.lower()
        matching_cases = []

        for case in cases:
            # Search in title, citation, and keywords
            title = case.get("title", "").lower()
            citation = case.get("citation", "").lower()
            keywords = " ".join(case.get("keywords", [])).lower()

            if query_lower in title or query_lower in citation or query_lower in keywords:
                matching_cases.append(case)
                if len(matching_cases) >= limit:
                    break

        return matching_cases

    def build_params(
        self, base_params: Optional[Dict[str, Any]] = None, **overrides: Any
    ) -> Dict[str, Any]:
        """Combine default parameters with per-request overrides.

        Args:
            base_params: Base parameters dictionary
            **overrides: Override parameters

        Returns:
            Merged parameters dictionary
        """
        return merge_params(base_params, overrides)
