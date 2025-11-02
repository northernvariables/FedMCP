"""Client for interacting with the Parliament of Canada's LEGISinfo data feeds."""
from __future__ import annotations

from typing import Any, Dict, Optional
from urllib.parse import urlencode, urljoin

from fedmcp.http import RateLimitedSession


LEGISINFO_BASE = "https://www.parl.ca/LegisInfo/en/"


class LegisInfoClient:
    """Fetch bill metadata and lists from LEGISinfo JSON/XML exports."""

    def __init__(
        self,
        *,
        session: Optional[RateLimitedSession] = None,
    ) -> None:
        self.session = session or RateLimitedSession()

    def _get(self, url: str, *, accept: str = "application/json") -> Dict[str, Any]:
        response = self.session.get(url, headers={"Accept": accept})
        response.raise_for_status()
        return response.json()

    # ------------------------------------------------------------------
    # Bill detail endpoints
    # ------------------------------------------------------------------
    def bill_detail_url(self, parliament_session: str, bill_code: str, *, fmt: str = "json") -> str:
        """Build the canonical LEGISinfo bill detail URL."""

        parliament_session = parliament_session.strip("/")
        bill_code = bill_code.strip("/")
        return urljoin(
            LEGISINFO_BASE,
            f"bill/{parliament_session}/{bill_code}/{fmt.lower()}",
        )

    def get_bill(self, parliament_session: str, bill_code: str, *, fmt: str = "json") -> Dict[str, Any]:
        url = self.bill_detail_url(parliament_session, bill_code, fmt=fmt)
        if fmt.lower() != "json":
            raise ValueError("Only JSON responses are supported by get_bill")
        return self._get(url)

    # ------------------------------------------------------------------
    # Overview exports
    # ------------------------------------------------------------------
    def overview_export_url(
        self,
        *,
        fmt: str = "json",
        chamber: Optional[str] = None,
        params: Optional[Dict[str, Any]] = None,
    ) -> str:
        fmt = fmt.lower()
        if fmt not in {"json", "xml"}:
            raise ValueError("format must be 'json' or 'xml'")

        path = f"overview/export"
        base_url = urljoin(LEGISINFO_BASE, path)
        query: Dict[str, Any] = {}
        if chamber:
            query["Chamber"] = chamber
        if params:
            query.update(params)
        if fmt == "json":
            query.setdefault("format", "json")
        else:
            query.setdefault("format", "xml")

        if not query:
            return base_url
        return f"{base_url}?{urlencode(query)}"

    def list_bills(
        self,
        *,
        fmt: str = "json",
        chamber: Optional[str] = None,
        params: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        url = self.overview_export_url(fmt=fmt, chamber=chamber, params=params)
        if fmt.lower() != "json":
            raise ValueError("Only JSON responses are supported by list_bills")
        return self._get(url)
