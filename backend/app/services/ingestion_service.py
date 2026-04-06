"""
Ingestion Service - RSS and YouTube content fetching.

This service implements Stage 1 of the pipeline: fetching content from
active feed sources and storing raw items in Convex.
"""

import logging
from typing import Any, Optional
from datetime import datetime, timezone, timedelta

import feedparser
import httpx
from youtube_transcript_api import YouTubeTranscriptApi, TranscriptsDisabled
from googleapiclient.discovery import build

from app.config import get_settings
from app.convex_client import queries
from app.utils.helpers import utc_now


logger = logging.getLogger(__name__)


class IngestionError(Exception):
    """Base exception for ingestion errors."""

    pass


def _should_fetch(source: dict[str, Any]) -> bool:
    """Check if a source should be fetched based on its interval."""
    last_fetched = source.get("lastFetchedAt")
    interval = source.get("fetchIntervalMinutes", 60)

    if last_fetched is None:
        return True

    now = utc_now()
    threshold = now - (interval * 60 * 1000)
    return last_fetched < threshold


async def _fetch_rss_entry_content(url: str) -> Optional[str]:
    """Fetch the full content of an RSS entry using httpx."""
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.get(url)
            response.raise_for_status()
            return response.text
    except Exception as e:
        logger.warning(f"Failed to fetch RSS content from {url}: {e}")
        return None


async def _ingest_rss(source: dict[str, Any]) -> int:
    """Ingest RSS feed entries."""
    url = source.get("url", "")
    source_id = source.get("id", "")
    ingested_count = 0

    logger.info(f"Fetching RSS feed: {url}")

    try:
        feed = feedparser.parse(url)
    except Exception as e:
        logger.error(f"Failed to parse RSS feed {url}: {e}")
        return 0

    for entry in feed.entries:
        external_id = entry.get("link", "")

        if not external_id:
            continue

        existing = queries.get_item_by_external_id(external_id)
        if existing:
            logger.debug(f"Skipping duplicate RSS entry: {external_id}")
            continue

        title = entry.get("title", "Untitled")

        content_html = entry.get("content", entry.get("summary", ""))
        if isinstance(content_html, list):
            content_html = content_html[0].get("value", "") if content_html else ""

        raw_text = content_html or title

        published_ts = 0
        if hasattr(entry, "published_parsed") and entry.published_parsed:
            dt = datetime(*entry.published_parsed[:6], tzinfo=timezone.utc)
            published_ts = int(dt.timestamp() * 1000)
        else:
            published_ts = utc_now()

        try:
            queries.create_raw_item(
                source_id=source_id,
                external_id=external_id,
                title=title,
                raw_text=raw_text,
                published_at=published_ts,
            )
            ingested_count += 1
            logger.info(f"Created raw item: {title[:50]}...")
        except Exception as e:
            logger.error(f"Failed to create raw item: {e}")

    return ingested_count


async def _ingest_youtube(source: dict[str, Any]) -> int:
    """Ingest YouTube channel videos."""
    url = source.get("url", "")
    source_id = source.get("id", "")
    ingested_count = 0

    settings = get_settings()
    if not settings.youtube_api_key:
        logger.warning("YouTube API key not configured, skipping YouTube ingestion")
        return 0

    channel_id = _extract_channel_id(url)
    if not channel_id:
        logger.warning(f"Could not extract channel ID from URL: {url}")
        return 0

    logger.info(f"Fetching YouTube channel: {channel_id}")

    try:
        youtube = build("youtube", "v3", developerKey=settings.youtube_api_key)
    except Exception as e:
        logger.error(f"Failed to build YouTube client: {e}")
        return 0

    try:
        response = (
            youtube.channels()
            .list(part="contentDetails", id=channel_id)
            .execute()
        )
        uploads_playlist_id = response["items"][0]["contentDetails"]["relatedPlaylists"]["uploads"]
    except Exception as e:
        logger.error(f"Failed to get uploads playlist: {e}")
        return 0

    try:
        playlist_response = (
            youtube.playlistItems()
            .list(part="snippet", playlistId=uploads_playlist_id, maxResults=5)
            .execute()
        )
    except Exception as e:
        logger.error(f"Failed to fetch playlist items: {e}")
        return 0

    for item in playlist_response.get("items", []):
        snippet = item.get("snippet", {})
        video_id = snippet.get("resourceId", {}).get("videoId", "")
        title = snippet.get("title", "Untitled")
        external_id = f"yt:{video_id}"

        existing = queries.get_item_by_external_id(external_id)
        if existing:
            logger.debug(f"Skipping duplicate YouTube video: {video_id}")
            continue

        raw_text = f"Title: {title}\n\n"

        published_ts = 0
        if snippet.get("publishedAt"):
            dt = datetime.fromisoformat(snippet["publishedAt"].replace("Z", "+00:00"))
            published_ts = int(dt.timestamp() * 1000)

        try:
            transcript = YouTubeTranscriptApi.get_transcript(video_id, languages=["en"])
            transcript_text = " ".join([t["text"] for t in transcript])
            raw_text += f"Transcript:\n{transcript_text}"
        except TranscriptsDisabled:
            raw_text += "Note: No transcript available for this video."
            logger.info(f"No transcript available for video: {video_id}")
        except Exception as e:
            raw_text += f"Note: Could not fetch transcript: {str(e)}"
            logger.warning(f"Failed to fetch transcript for {video_id}: {e}")

        try:
            queries.create_raw_item(
                source_id=source_id,
                external_id=external_id,
                title=title,
                raw_text=raw_text,
                published_at=published_ts,
            )
            ingested_count += 1
            logger.info(f"Created raw item from YouTube: {title[:50]}...")
        except Exception as e:
            logger.error(f"Failed to create raw item: {e}")

    return ingested_count


def _extract_channel_id(url: str) -> Optional[str]:
    """Extract channel ID from various YouTube URL formats."""
    import re

    patterns = [
        r"youtube\.com/channel/([a-zA-Z0-9_-]{22})",
        r"youtube\.com/@([a-zA-Z0-9_-]+)",
        r"youtube\.com/c/([a-zA-Z0-9_-]+)",
    ]

    for pattern in patterns:
        match = re.search(pattern, url)
        if match:
            return match.group(1)

    return None


async def run_ingestion() -> dict[str, Any]:
    """
    Run the full ingestion job for all active feed sources.

    Returns:
        A dict with counts of items ingested per source.
    """
    logger.info("Starting ingestion job")

    all_feeds = queries.get_all_feeds()
    active_feeds = [f for f in all_feeds if f.get("isActive", False)]

    if not active_feeds:
        logger.info("No active feeds to ingest")
        return {"total": 0, "sources": []}

    results = []
    total_ingested = 0

    for source in active_feeds:
        if not _should_fetch(source):
            logger.debug(f"Skipping source {source.get('name')} - not time to fetch")
            continue

        source_type = source.get("type", "rss")
        source_name = source.get("name", "Unknown")

        try:
            if source_type == "rss":
                count = await _ingest_rss(source)
            elif source_type == "youtube":
                count = await _ingest_youtube(source)
            else:
                logger.warning(f"Unknown source type: {source_type}")
                count = 0

            queries.update_feed_last_fetched(
                id=source.get("id"),
                last_fetched_at=utc_now(),
            )

            results.append({"source": source_name, "type": source_type, "count": count})
            total_ingested += count

        except Exception as e:
            logger.error(f"Failed to ingest from {source_name}: {e}")
            results.append({"source": source_name, "type": source_type, "count": 0, "error": str(e)})

    logger.info(f"Ingestion job completed. Total items: {total_ingested}")

    return {"total": total_ingested, "sources": results}