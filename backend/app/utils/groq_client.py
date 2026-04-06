"""
Groq API client wrapper for Mandle backend.

This module provides a unified interface for calling Groq's inference API
with the appropriate models for different pipeline stages.
"""

import logging
import time
from typing import Any, Optional

from groq import Groq, RateLimitError, APIError

from app.config import get_settings


logger = logging.getLogger(__name__)


WRITING_MODEL = "moonshotai/kimi-k2-instruct"
FAST_MODEL = "llama-3.3-70b-versatile"


class GroqAPIError(Exception):
    """Base exception for Groq API errors."""

    pass


class GroqRateLimitError(GroqAPIError):
    """Exception for rate limit errors."""

    pass


class GroqJSONParseError(GroqAPIError):
    """Exception for JSON parsing errors."""

    pass


_client: Optional[Groq] = None


def _get_client() -> Groq:
    """Get or create the Groq client singleton."""
    global _client

    if _client is None:
        settings = get_settings()
        if not settings.groq_api_key:
            raise GroqAPIError(
                "GROQ_API_KEY not set in environment. "
                "Please set the GROQ_API_KEY environment variable."
            )
        _client = Groq(api_key=settings.groq_api_key)

    return _client


def call_groq(
    model: str,
    system_prompt: str,
    user_message: str,
    response_format: Optional[dict[str, Any]] = None,
    temperature: float = 0.7,
    max_tokens: int = 4000,
) -> dict[str, Any]:
    """
    Call the Groq API with a system prompt and user message.

    Args:
        model: The model identifier to use (e.g., WRITING_MODEL or FAST_MODEL).
        system_prompt: The system prompt to set context.
        user_message: The user's message/query.
        response_format: Optional dict to specify response format (e.g., {"type": "json_object"}).
        temperature: Sampling temperature (default 0.7).
        max_tokens: Maximum tokens in the response (default 4000).

    Returns:
        A dictionary with the parsed response.

    Raises:
        GroqAPIError: If the API call fails.
        GroqRateLimitError: If rate limit is hit.
        GroqJSONParseError: If JSON parsing fails.
    """
    client = _get_client()
    start_time = time.time()

    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": user_message},
    ]

    kwargs: dict[str, Any] = {
        "model": model,
        "messages": messages,
        "temperature": temperature,
        "max_tokens": max_tokens,
    }

    if response_format:
        kwargs["response_format"] = response_format

    try:
        response = client.chat.completions.create(**kwargs)
        elapsed = time.time() - start_time
        logger.info(f"Groq API call completed in {elapsed:.2f}s using model {model}")

        content = response.choices[0].message.content

        if content is None:
            raise GroqAPIError("Empty response from Groq API")

        if response_format and response_format.get("type") == "json_object":
            import json
            import re

            content = content.strip()
            if content.startswith("```json"):
                content = content[7:]
            if content.startswith("```"):
                content = content[3:]
            if content.endswith("```"):
                content = content[:-3]
            content = content.strip()

            try:
                return json.loads(content)
            except json.JSONDecodeError as e:
                raise GroqJSONParseError(
                    f"Failed to parse JSON response: {e}. Raw content: {content[:200]}"
                )

        return {"content": content}

    except RateLimitError as e:
        logger.error(f"Groq rate limit hit: {e}")
        raise GroqRateLimitError(
            f"Rate limit exceeded. Please wait before retrying. Details: {e}"
        ) from e

    except APIError as e:
        logger.error(f"Groq API error: {e}")
        raise GroqAPIError(f"Groq API error: {e}") from e

    except Exception as e:
        logger.error(f"Unexpected error calling Groq API: {e}")
        raise GroqAPIError(f"Unexpected error: {e}") from e


def get_client() -> Groq:
    """Get the underlying Groq client for advanced usage."""
    return _get_client()