"""
Tweepy client configuration for Mandle backend.

This module provides centralized Tweepy v1.1 and v2 client setup for X API access.
"""

import logging
from typing import Optional

import tweepy

from app.config import get_settings


logger = logging.getLogger(__name__)

_client_v1: Optional[tweepy.API] = None
_client_v2: Optional[tweepy.Client] = None


def _validate_credentials(
    consumer_key: str,
    consumer_secret: str,
    access_token: str,
    access_token_secret: str,
) -> bool:
    """Validate that credentials are not empty."""
    if not consumer_key:
        return False
    if not consumer_secret:
        return False
    if not access_token:
        return False
    if not access_token_secret:
        return False
    return True


def get_tweepy_client_v1() -> tweepy.API:
    """
    Get Tweepy v1.1 API client for media uploads and other v1.1 endpoints.

    Returns:
        Authenticated Tweepy API instance.

    Raises:
        ValueError: If credentials are not configured.
    """
    global _client_v1

    if _client_v1 is not None:
        return _client_v1

    settings = get_settings()

    if not _validate_credentials(
        settings.x_api_key,
        settings.x_api_secret,
        settings.x_access_token,
        settings.x_access_token_secret,
    ):
        raise ValueError(
            "X API credentials not configured. Please set X_API_KEY, "
            "X_API_SECRET, X_ACCESS_TOKEN, and X_ACCESS_TOKEN_SECRET."
        )

    auth = tweepy.OAuthHandler(settings.x_api_key, settings.x_api_secret)
    auth.set_access_token(settings.x_access_token, settings.x_access_token_secret)

    _client_v1 = tweepy.API(auth, wait_on_rate_limit=True)

    logger.info("Tweepy v1.1 client initialized successfully")
    return _client_v1


def get_tweepy_client_v2() -> tweepy.Client:
    """
    Get Tweepy v2 API client for posting tweets and replies.

    Returns:
        Authenticated Tweepy Client instance.

    Raises:
        ValueError: If credentials are not configured.
    """
    global _client_v2

    if _client_v2 is not None:
        return _client_v2

    settings = get_settings()

    if not _validate_credentials(
        settings.x_api_key,
        settings.x_api_secret,
        settings.x_access_token,
        settings.x_access_token_secret,
    ):
        raise ValueError(
            "X API credentials not configured. Please set X_API_KEY, "
            "X_API_SECRET, X_ACCESS_TOKEN, and X_ACCESS_TOKEN_SECRET."
        )

    _client_v2 = tweepy.Client(
        consumer_key=settings.x_api_key,
        consumer_secret=settings.x_api_secret,
        access_token=settings.x_access_token,
        access_token_secret=settings.x_access_token_secret,
        wait_on_rate_limit=True,
    )

    logger.info("Tweepy v2 client initialized successfully")
    return _client_v2


def reset_clients() -> None:
    """Reset the client singletons. Useful for testing."""
    global _client_v1, _client_v2
    _client_v1 = None
    _client_v2 = None
    logger.info("Tweepy clients reset")