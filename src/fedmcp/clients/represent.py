"""Client for the Represent API by Open North."""
from __future__ import annotations

from typing import Any, Dict, List, Optional

from fedmcp.http import RateLimitedSession


DEFAULT_BASE_URL = "https://represent.opennorth.ca"
DEFAULT_HEADERS = {
    "Accept": "application/json",
}


class RepresentClient:
    """A client for the Represent API by Open North.

    Provides access to Canadian representative and electoral district information.

    The Represent API provides:
    - Postal code to representative lookup
    - Electoral district boundaries
    - Representative contact information

    API Documentation: https://represent.opennorth.ca/api/

    Rate Limits:
    - Free tier: 60 requests/minute, 86,400 requests/day
    - No API key required
    """

    def __init__(
        self,
        *,
        base_url: str = DEFAULT_BASE_URL,
        headers: Optional[Dict[str, str]] = None,
        session: Optional[RateLimitedSession] = None,
    ) -> None:
        """Initialize the Represent client.

        Args:
            base_url: Base URL for the Represent API
            headers: Optional additional headers
            session: Optional shared RateLimitedSession instance

        Note:
            Represent API rate limit: 60 requests/minute
            We use 1 request/second (60 req/min) to be safe
        """
        self.base_url = base_url.rstrip("/")
        # Rate limiting: 60 requests/minute = 1 request/second
        self.session = session or RateLimitedSession(min_request_interval=1.0)
        self.headers = {**DEFAULT_HEADERS, **(headers or {})}

    # ------------------------------------------------------------------
    # Low-level request helpers
    # ------------------------------------------------------------------
    def _request(
        self, endpoint: str, *, params: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any] | List[Dict[str, Any]]:
        """Make a request to the Represent API.

        Args:
            endpoint: API endpoint path
            params: Optional query parameters

        Returns:
            Parsed JSON response
        """
        url = self._build_url(endpoint)
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
    # Postal Code Lookup
    # ------------------------------------------------------------------
    def get_representatives_by_postal_code(
        self, postal_code: str, *, sets: Optional[str] = None
    ) -> Dict[str, Any]:
        """Get representatives for a given postal code.

        Args:
            postal_code: Canadian postal code (e.g., 'K1A 0A9', 'k1a0a9')
            sets: Optional filter for representative sets (e.g., 'federal-representatives')

        Returns:
            Dictionary containing representatives and boundary information

        Example:
            >>> client.get_representatives_by_postal_code('K1A 0A9')
            {
                'representatives_centroid': [...],
                'representatives_concordance': [...],
                'boundaries_centroid': [...],
                'boundaries_concordance': [...]
            }
        """
        # Normalize postal code (remove spaces, uppercase)
        postal_code = postal_code.replace(" ", "").upper()

        params = {}
        if sets:
            params['sets'] = sets

        return self._request(f"/postcodes/{postal_code}/", params=params)

    def get_federal_mp_by_postal_code(self, postal_code: str) -> Optional[Dict[str, Any]]:
        """Get the federal MP for a given postal code.

        This is a convenience method that filters for federal representatives only.

        Args:
            postal_code: Canadian postal code

        Returns:
            Dictionary with MP information, or None if not found

        Example:
            >>> client.get_federal_mp_by_postal_code('K1A 0A9')
            {
                'name': 'Justin Trudeau',
                'district_name': 'Papineau',
                'elected_office': 'MP',
                'party_name': 'Liberal',
                'email': 'justin.trudeau@parl.gc.ca',
                ...
            }
        """
        # Normalize postal code
        postal_code = postal_code.replace(" ", "").upper()

        # Get all representatives, filtered to federal
        result = self._request(
            f"/postcodes/{postal_code}/",
            params={'sets': 'federal-representatives'}
        )

        # Extract federal MP from centroid results (most accurate)
        if 'representatives_centroid' in result and result['representatives_centroid']:
            # Federal MPs should be in the results
            for rep in result['representatives_centroid']:
                if rep.get('elected_office') == 'MP':
                    return rep

        # Fallback to concordance if centroid didn't work
        if 'representatives_concordance' in result and result['representatives_concordance']:
            for rep in result['representatives_concordance']:
                if rep.get('elected_office') == 'MP':
                    return rep

        return None

    # ------------------------------------------------------------------
    # Boundary Lookup
    # ------------------------------------------------------------------
    def get_boundaries_by_postal_code(
        self, postal_code: str, *, sets: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """Get electoral boundaries for a given postal code.

        Args:
            postal_code: Canadian postal code
            sets: Optional filter for boundary sets (e.g., 'federal-electoral-districts')

        Returns:
            List of boundary information dictionaries
        """
        postal_code = postal_code.replace(" ", "").upper()

        params = {}
        if sets:
            params['sets'] = sets

        result = self._request(f"/postcodes/{postal_code}/", params=params)

        # Return centroid boundaries (most accurate)
        return result.get('boundaries_centroid', [])

    # ------------------------------------------------------------------
    # Representative Lookup
    # ------------------------------------------------------------------
    def get_representatives_by_boundary(
        self, boundary_url: str
    ) -> List[Dict[str, Any]]:
        """Get all representatives for a specific electoral boundary.

        Args:
            boundary_url: Boundary URL from boundary lookup (e.g., '/boundaries/federal-electoral-districts/35001/')

        Returns:
            List of representative dictionaries
        """
        # The boundary_url should be the path part only
        if boundary_url.startswith('http'):
            # Extract path from full URL
            from urllib.parse import urlparse
            boundary_url = urlparse(boundary_url).path

        return self._request(f"{boundary_url}representatives/")

    # ------------------------------------------------------------------
    # Representative Sets
    # ------------------------------------------------------------------
    def list_representative_sets(self) -> List[Dict[str, Any]]:
        """List all available representative sets.

        Returns:
            List of representative set dictionaries with metadata

        Example sets:
        - 'federal-representatives' - Federal MPs
        - 'provincial-representatives' - Provincial MLAs/MPPs
        - 'municipal-representatives' - Municipal councillors
        """
        result = self._request("/representative-sets/")
        return result.get('objects', []) if isinstance(result, dict) else result

    # ------------------------------------------------------------------
    # Boundary Sets
    # ------------------------------------------------------------------
    def list_boundary_sets(self) -> List[Dict[str, Any]]:
        """List all available boundary sets.

        Returns:
            List of boundary set dictionaries with metadata

        Example sets:
        - 'federal-electoral-districts' - Federal ridings
        - 'census-subdivisions' - Census subdivisions
        """
        result = self._request("/boundary-sets/")
        return result.get('objects', []) if isinstance(result, dict) else result
