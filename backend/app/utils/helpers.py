"""
Utility helper functions for Mandle backend.
"""

from datetime import datetime, timezone
from typing import Any


def utc_now() -> int:
    """Get current UTC timestamp in milliseconds."""
    return int(datetime.now(timezone.utc).timestamp() * 1000)


def format_timestamp(timestamp: int) -> str:
    """Format a millisecond timestamp to ISO string."""
    return datetime.fromtimestamp(timestamp / 1000, tz=timezone.utc).isoformat()


def truncate_text(text: str, max_length: int) -> str:
    """Truncate text to a maximum length."""
    if len(text) <= max_length:
        return text
    return text[: max_length - 3] + "..."


def sanitize_for_json(data: dict[str, Any]) -> dict[str, Any]:
    """Remove None values from a dictionary."""
    return {k: v for k, v in data.items() if v is not None}