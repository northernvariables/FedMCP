"""HTTP utility helpers shared across client implementations."""
from __future__ import annotations

import time
from typing import Any, Callable, Dict, Iterator, Optional

import requests


class RateLimitedSession:
    """A thin wrapper around :class:`requests.Session` with retry/backoff and rate limiting support.

    Provides both reactive retry logic (for 429/5xx errors) and proactive rate limiting
    (to prevent exceeding API rate limits).

    For CanLII API compliance:
    - Set min_request_interval=0.5 (enforces 2 requests per second limit)
    - Only 1 concurrent request is allowed (handled by synchronous execution)
    """

    def __init__(
        self,
        *,
        backoff_factor: float = 1.0,
        max_attempts: int = 5,
        min_request_interval: Optional[float] = None,
        default_timeout: float = 30.0,
        session: Optional[requests.Session] = None,
    ) -> None:
        """Initialize the rate-limited session.

        Args:
            backoff_factor: Multiplier for exponential backoff (default: 1.0)
            max_attempts: Maximum retry attempts for failed requests (default: 5)
            min_request_interval: Minimum seconds between requests for rate limiting (optional)
                For CanLII: use 0.5 (2 requests per second)
            default_timeout: Default timeout in seconds for all requests (default: 30.0)
            session: Optional existing requests.Session to wrap
        """
        self.session = session or requests.Session()
        self.backoff_factor = backoff_factor
        self.max_attempts = max_attempts
        self.min_request_interval = min_request_interval
        self.default_timeout = default_timeout
        self._last_request_time: Optional[float] = None

    def request(self, method: str, url: str, **kwargs: Any) -> requests.Response:
        """Perform a request with rate limiting and retry logic.

        Enforces minimum interval between requests if configured, then performs
        the request with automatic retry and exponential backoff for 429/5xx errors.

        The default timeout can be overridden by passing timeout= in kwargs.
        """
        # Proactive rate limiting: enforce minimum interval between requests
        if self.min_request_interval is not None and self._last_request_time is not None:
            time_since_last = time.time() - self._last_request_time
            if time_since_last < self.min_request_interval:
                sleep_time = self.min_request_interval - time_since_last
                time.sleep(sleep_time)

        # Update last request time
        self._last_request_time = time.time()

        # Set default timeout if not provided
        if 'timeout' not in kwargs:
            kwargs['timeout'] = self.default_timeout

        # Reactive retry logic: retry on 429/5xx with exponential backoff
        attempt = 0
        while True:
            attempt += 1
            response = self.session.request(method, url, **kwargs)
            if response.status_code not in {429, 500, 502, 503, 504}:
                return response

            if attempt >= self.max_attempts:
                response.raise_for_status()

            sleep_for = self.backoff_factor * 2 ** (attempt - 1)
            time.sleep(sleep_for)

    def get(self, url: str, **kwargs: Any) -> requests.Response:
        return self.request("GET", url, **kwargs)

    def post(self, url: str, **kwargs: Any) -> requests.Response:
        return self.request("POST", url, **kwargs)


def merge_params(*param_dicts: Optional[Dict[str, Any]]) -> Dict[str, Any]:
    """Merge dictionaries of query parameters, skipping ``None`` values."""

    merged: Dict[str, Any] = {}
    for param_dict in param_dicts:
        if not param_dict:
            continue
        for key, value in param_dict.items():
            if value is None:
                continue
            merged[key] = value
    return merged


def paginate(
    first_page: Optional[Dict[str, Any]],
    fetcher: Callable[[str], Dict[str, Any]],
    *,
    next_url_key: str = "pagination",
    objects_key: str = "objects",
) -> Iterator[Dict[str, Any]]:
    """Iterate over paginated responses in the OpenParliament format.

    ``first_page`` should be the decoded JSON payload of the first response.
    Each payload is expected to include an ``objects`` list and a mapping under
    ``next_url_key`` with a ``next_url`` entry. The helper yields each object and
    fetches additional pages until ``next_url`` is falsy.
    """

    page = first_page
    while page:
        for obj in page.get(objects_key, []):
            yield obj

        pagination = page.get(next_url_key)
        next_url = None
        if isinstance(pagination, dict):
            next_url = pagination.get("next_url")
        if not next_url:
            break
        page = fetcher(next_url)
