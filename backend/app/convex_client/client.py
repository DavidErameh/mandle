"""
ConvexClient singleton wrapper for Mandle backend.

This module provides a lazily-initialized singleton ConvexClient instance.
The client is configured with CONVEX_URL from environment variables and
used by all services to read/write data from Convex.

Usage:
    from convex_client.client import get_client
    
    client = get_client()
    result = client.query("feeds:getAll")
"""

from typing import Any, Optional

from app.config import get_settings


class ConvexClientWrapper:
    """Wrapper around ConvexClient providing query and mutation methods."""

    def __init__(self, url: str) -> None:
        """
        Initialize the Convex client wrapper.

        Args:
            url: The Convex deployment URL.
        """
        self._url = url
        self._client: Optional[Any] = None

    def _get_client(self) -> Any:
        """Lazily initialize and return the underlying Convex client."""
        if self._client is None:
            from convex import ConvexClient
            self._client = ConvexClient(self._url)
        return self._client

    def query(self, function_name: str, *args: Any, **kwargs: Any) -> Any:
        """
        Execute a Convex query function.

        Args:
            function_name: The name of the Convex function (e.g., "feeds:getAll").
            *args: Positional arguments to pass to the function.
            **kwargs: Keyword arguments to pass to the function.

        Returns:
            The result from the Convex function.
        """
        client = self._get_client()
        return client.query(function_name, *args, **kwargs)

    def mutation(self, function_name: str, *args: Any, **kwargs: Any) -> Any:
        """
        Execute a Convex mutation function.

        Args:
            function_name: The name of the Convex function (e.g., "feeds:create").
            *args: Positional arguments to pass to the function.
            **kwargs: Keyword arguments to pass to the function.

        Returns:
            The result from the Convex function.
        """
        client = self._get_client()
        return client.mutation(function_name, *args, **kwargs)

    @property
    def url(self) -> str:
        """Get the Convex deployment URL."""
        return self._url


_client_instance: Optional[ConvexClientWrapper] = None


def get_client() -> ConvexClientWrapper:
    """
    Get the singleton ConvexClient instance.

    Returns:
        A ConvexClientWrapper instance configured with CONVEX_URL.

    Raises:
        ValueError: If CONVEX_URL is not set in environment.
    """
    global _client_instance

    if _client_instance is not None:
        return _client_instance

    settings = get_settings()
    if not settings.convex_url:
        raise ValueError(
            "CONVEX_URL not set in environment. "
            "Please set the CONVEX_URL environment variable."
        )

    _client_instance = ConvexClientWrapper(settings.convex_url)
    return _client_instance


def reset_client() -> None:
    """Reset the singleton client instance. Useful for testing."""
    global _client_instance
    _client_instance = None