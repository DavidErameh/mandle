"""
Ingestion Service - RSS and YouTube content fetching.

This service implements Stage 1 of the pipeline: fetching content from
active feed sources and storing raw items in Convex.
"""

import logging
import re
from typing import Any, Optional
from datetime import datetime, timezone
import asyncio
import hashlib

import feedparser
import httpx
from youtube_transcript_api import YouTubeTranscriptApi, TranscriptsDisabled
import trafilatura
from pydantic import BaseModel

from app.config import get_settings
from app.convex_client import queries
from app.utils.helpers import utc_now
from app.models.api_models import ImportResult, DraftPreview
from app.services import extractor_service, generator_service

logger = logging.getLogger(__name__)

YT_RSS_BASE = "https://www.youtube.com/feeds/videos.xml?channel_id={channel_id}"
JINA_BASE = "https://r.jina.ai/"
MAX_CHUNK_TOKENS = 900


class IngestionError(Exception):
    """Base exception for ingestion errors."""
    pass


class RawItemData(BaseModel):
    """Intermediate data model for a raw item before Convex insertion."""
    external_id: str
    title: str
    raw_text: str


def detect_url_type(url: str) -> str:
    """Detect URL type. Returns: 'youtube_video' | 'x_thread' | 'article'."""
    if "youtube.com/watch" in url or "youtu.be/" in url:
        return "youtube_video"
    if "twitter.com/" in url or "x.com/" in url:
        return "x_thread"
    return "article"


def _should_fetch(source: dict[str, Any]) -> bool:
    """Check if a source should be fetched based on its interval."""
    interval = source.get("fetchIntervalMinutes", 60)
    if interval == 0:
        return False  # Manual Import source — never polled

    last_fetched = source.get("lastFetchedAt")
    if last_fetched is None:
        return True

    now = utc_now()
    threshold = now - (interval * 60 * 1000)
    return last_fetched < threshold


async def fetch_article_content(url: str) -> str | None:
    """
    Fetch and extract full article text from a URL using trafilatura.
    Returns clean body text, or None if extraction fails (JS-rendered, paywalled, blocked).
    Used by both Flow A (RSS polling) and Flow B (Quick Import).
    """
    try:
        html = trafilatura.fetch_url(url)
        if html is None:
            logger.warning(f"trafilatura could not fetch URL: {url}")
            return None
        text = trafilatura.extract(html, include_comments=False, include_tables=False)
        if not text or len(text.strip()) < 50:
            logger.warning(f"trafilatura extracted insufficient content from: {url}")
            return None
        return text
    except Exception as e:
        logger.warning(f"trafilatura extraction failed for {url}: {e}")
        return None


async def fetch_and_chunk_transcript(video_id: str, title: str) -> list[RawItemData]:
    """
    Fetch transcript for a YouTube video. If total tokens <= MAX_CHUNK_TOKENS,
    return one item. If longer, split at timestamp boundaries into multiple items.
    Each chunk: title = "[Title] [Part N/Total]", externalId = "yt:{video_id}-chunk-{N}".
    Returns empty list if no transcript available.
    """
    try:
        ytt_api = YouTubeTranscriptApi()
        transcript_list = ytt_api.list(video_id)
        transcript = transcript_list.find_transcript(["en"]).fetch()
    except TranscriptsDisabled:
        logger.info(f"No transcript for video {video_id}")
        return []
    except Exception as e:
        logger.warning(f"Failed to fetch transcript for {video_id}: {e}")
        return []

    full_text = " ".join([t["text"] if isinstance(t, dict) else t.text for t in transcript])
    token_count = len(full_text.split())  # rough word-based token estimate

    if token_count <= MAX_CHUNK_TOKENS:
        return [RawItemData(
            external_id=f"yt:{video_id}",
            title=f"Title: {title}",
            raw_text=f"Title: {title}\n\nTranscript:\n{full_text}",
        )]

    # Chunk by timestamp boundaries
    chunks = []
    current_chunk: list[str] = []
    current_tokens = 0
    chunk_boundaries: list[list[str]] = []

    for segment in transcript:
        text = segment["text"] if isinstance(segment, dict) else segment.text
        words = text.split()
        if current_tokens + len(words) > MAX_CHUNK_TOKENS and current_chunk:
            chunk_boundaries.append(current_chunk)
            current_chunk = []
            current_tokens = 0
        current_chunk.extend(words)
        current_tokens += len(words)

    if current_chunk:
        chunk_boundaries.append(current_chunk)

    total = len(chunk_boundaries)
    for i, chunk_words in enumerate(chunk_boundaries, 1):
        chunk_text = " ".join(chunk_words)
        chunks.append(RawItemData(
            external_id=f"yt:{video_id}-chunk-{i}",
            title=f"{title} [Part {i}/{total}]",
            raw_text=f"Title: {title} [Part {i}/{total}]\n\nTranscript:\n{chunk_text}",
        ))

    return chunks


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

        if queries.raw_item_exists_by_external_id(external_id):
            logger.debug(f"Skipping duplicate RSS entry: {external_id}")
            continue

        title = entry.get("title", "Untitled")

        content_html = entry.get("content", entry.get("summary", ""))
        if isinstance(content_html, list):
            content_html = content_html[0].get("value", "") if content_html else ""

        # Use trafilatura if content is short (likely a truncated summary)
        if not content_html or len(content_html.split()) < 300:
            full_text = await fetch_article_content(external_id)
            if full_text:
                raw_text = full_text
            else:
                raw_text = content_html or title
        else:
            raw_text = content_html

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


def _extract_channel_id(url: str) -> Optional[str]:
    """Extract channel ID from various YouTube URL formats."""
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


def _extract_video_id_from_url(url: str) -> str:
    """Extract video id from YouTube URLs (both formats)."""
    # Handle youtube.com/watch?v= format
    match = re.search(r"youtube\.com/watch\?v=([a-zA-Z0-9_-]{11})", url)
    if match:
        return match.group(1)
    
    # Handle youtu.be/ format
    match = re.search(r"youtu\.be/([a-zA-Z0-9_-]{11})", url)
    if match:
        return match.group(1)
    
    return ""


def _parse_published_date(entry: Any) -> int:
    """Fallback published date parser for feed entries."""
    if hasattr(entry, "published_parsed") and entry.published_parsed:
        dt = datetime(*entry.published_parsed[:6], tzinfo=timezone.utc)
        return int(dt.timestamp() * 1000)
    return utc_now()


async def _ingest_youtube(source: dict[str, Any]) -> int:
    """Ingest YouTube channel videos via native RSS feed (no Data API)."""
    url = source.get("url", "")
    source_id = source.get("id", "")
    ingested_count = 0

    channel_id = _extract_channel_id(url)
    if not channel_id:
        logger.warning(f"Could not extract channel ID from URL: {url}")
        return 0

    feed_url = YT_RSS_BASE.format(channel_id=channel_id)
    logger.info(f"Fetching YouTube RSS feed: {feed_url}")

    try:
        feed = feedparser.parse(feed_url)
    except Exception as e:
        logger.error(f"Failed to parse YouTube RSS feed: {e}")
        return 0

    for entry in feed.entries[:15]:  # RSS returns up to 15
        video_id = _extract_video_id_from_url(entry.link)
        if not video_id:
            continue
            
        external_id = f"yt:{video_id}"

        if queries.raw_item_exists_by_external_id(external_id):
            continue

        title = entry.get("title", "Untitled")
        published_ts = _parse_published_date(entry)

        chunks = await fetch_and_chunk_transcript(video_id, title)
        for chunk in chunks:
            try:
                queries.create_raw_item(
                    source_id=source_id,
                    external_id=chunk.external_id,
                    title=chunk.title,
                    raw_text=chunk.raw_text,
                    published_at=published_ts,
                )
                ingested_count += 1
            except Exception as e:
                logger.error(f"Failed to create raw item: {e}")

    return ingested_count


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
            elif source_type == "youtube_channel":
                count = await _ingest_youtube(source)
            else:
                logger.warning(f"Unknown or non-pollable source type: {source_type}")
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


# ============================================================================
# QUICK IMPORT (FLOW B)
# ============================================================================


async def import_youtube_video(url: str, note: str | None) -> ImportResult:
    """Import a single YouTube video by URL."""
    video_id = _extract_video_id_from_url(url)
    if not video_id:
        return ImportResult(input=url, status="failed", type="youtube_video",
                           reason="Could not parse video ID from URL.")

    external_id = f"yt:{video_id}"
    if queries.raw_item_exists_by_external_id(external_id):
        return ImportResult(input=url, status="duplicate", type="youtube_video")

    chunks = await fetch_and_chunk_transcript(video_id, title="Imported Video")
    if not chunks:
        return ImportResult(input=url, status="failed", type="youtube_video",
                           reason="No transcript available for this video.")

    source_id = get_settings().manual_source_id
    if not source_id:
        return ImportResult(input=url, status="failed", type="youtube_video",
                           reason="System configuration error: manual_source_id not set.")

    first_id = None
    for chunk in chunks:
        result = queries.create_raw_item(
            source_id=source_id,
            external_id=chunk.external_id,
            title=chunk.title,
            raw_text=chunk.raw_text,
            published_at=utc_now(),
            import_note=note,
        )
        if first_id is None:
            first_id = result

    return ImportResult(
        input=url, status="success", type="youtube_video",
        raw_item_id=str(first_id), title=chunks[0].title,
    )


async def import_article(url: str, note: str | None) -> ImportResult:
    """Import an article by URL via trafilatura."""
    if queries.raw_item_exists_by_external_id(url):
        return ImportResult(input=url, status="duplicate", type="article")

    content = await fetch_article_content(url)
    if content is None:
        return ImportResult(input=url, status="failed", type="article",
                           reason="Could not extract content from this URL.")

    title = content.split("\n")[0][:80] or url
    source_id = get_settings().manual_source_id
    if not source_id:
        return ImportResult(input=url, status="failed", type="article",
                           reason="System configuration error: manual_source_id not set.")

    result = queries.create_raw_item(
        source_id=source_id,
        external_id=url,
        title=title,
        raw_text=content,
        published_at=utc_now(),
        import_note=note,
    )

    return ImportResult(
        input=url, status="success", type="article",
        raw_item_id=str(result), title=title,
    )


async def import_x_via_url(url: str, note: str | None) -> ImportResult:
    """Import an X/Twitter thread by URL via Jina AI Reader."""
    if queries.raw_item_exists_by_external_id(url):
        return ImportResult(input=url, status="duplicate", type="x_thread")

    jina_url = f"{JINA_BASE}{url}"
    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            response = await client.get(jina_url)
        if response.status_code != 200 or len(response.text.strip()) < 50:
            return ImportResult(
                input=url, status="failed", type="x_thread",
                reason="Could not fetch this X post. Paste the text instead.",
            )
    except Exception as e:
        logger.warning(f"Jina fetch failed for {url}: {e}")
        return ImportResult(
            input=url, status="failed", type="x_thread",
            reason="Could not fetch this X post. Paste the text instead.",
        )

    content = response.text.strip()
    title = content.split("\n")[0][:80] or "X Thread"

    source_id = get_settings().manual_source_id
    if not source_id:
        return ImportResult(input=url, status="failed", type="x_thread",
                           reason="System configuration error: manual_source_id not set.")

    result = queries.create_raw_item(
        source_id=source_id,
        external_id=url,
        title=title,
        raw_text=content,
        published_at=utc_now(),
        import_note=note,
    )

    return ImportResult(
        input=url, status="success", type="x_thread",
        raw_item_id=str(result), title=title,
    )


async def import_x_text(raw_text: str, note: str | None) -> ImportResult:
    """Import raw X thread text pasted by the user."""
    if len(raw_text.strip()) < 20:
        return ImportResult(
            input="x_text", status="failed", type="x_thread",
            reason="Text must be at least 20 characters.",
        )

    text_hash = hashlib.sha256(raw_text.encode()).hexdigest()[:12]
    external_id = f"x-manual-{text_hash}"

    if queries.raw_item_exists_by_external_id(external_id):
        return ImportResult(input="x_text", status="duplicate", type="x_thread")

    title = raw_text.strip()[:80] + ("..." if len(raw_text.strip()) > 80 else "")

    source_id = get_settings().manual_source_id
    if not source_id:
        return ImportResult(input="x_text", status="failed", type="x_thread",
                           reason="System configuration error: manual_source_id not set.")

    result = queries.create_raw_item(
        source_id=source_id,
        external_id=external_id,
        title=title,
        raw_text=raw_text,
        published_at=utc_now(),
        import_note=note,
    )

    return ImportResult(
        input="x_text", status="success", type="x_thread",
        raw_item_id=str(result), title=title,
    )


async def _safe_import(fn, input_val: str, note: str | None) -> ImportResult:
    """Wrapper that catches any unhandled exception from an import function."""
    try:
        return await fn(input_val, note)
    except Exception as e:
        logger.error(f"Unexpected error importing {input_val[:50]}: {e}")
        return ImportResult(
            input=input_val[:100], status="failed",
            reason=f"Unexpected error: {str(e)}",
        )


async def run_quick_import(urls: list[str], x_text: str | None, note: str | None, auto_generate: bool = True) -> tuple[list[ImportResult], list[DraftPreview]]:
    """
    Orchestrate Quick Import.
    
    Args:
        urls: List of URLs to import
        x_text: Raw X thread text
        note: Optional note for all items
        auto_generate: If True, run extraction + generation immediately
    
    Returns:
        Tuple of (import_results, generated_drafts)
    """
    tasks = []

    for url in urls:
        url_type = detect_url_type(url)
        if url_type == "youtube_video":
            tasks.append(asyncio.create_task(_safe_import(import_youtube_video, url, note)))
        elif url_type == "x_thread":
            tasks.append(asyncio.create_task(_safe_import(import_x_via_url, url, note)))
        else:
            tasks.append(asyncio.create_task(_safe_import(import_article, url, note)))

    if x_text and x_text.strip():
        tasks.append(asyncio.create_task(_safe_import(import_x_text, x_text, note)))

    if not tasks:
        return ([], [])

    results = await asyncio.gather(*tasks)
    import_results = list(results)

    # If auto_generate is True, run extraction + generation on newly imported items
    generated_drafts = []
    if auto_generate:
        for result in import_results:
            if result.status == "success" and result.raw_item_id:
                try:
                    drafts = await _generate_from_raw_item(result.raw_item_id)
                    generated_drafts.extend(drafts)
                except Exception as e:
                    logger.error(f"Failed to generate from raw item {result.raw_item_id}: {e}")

    return (import_results, generated_drafts)


async def _generate_from_raw_item(raw_item_id: str) -> list[DraftPreview]:
    """
    Extract points from a raw item and generate drafts.
    Returns list of generated draft previews.
    """
    # Get the raw item
    raw_items = queries.get_items_by_source(queries.get_manual_source_id() or "")
    raw_item = next((item for item in raw_items if item.get("id") == raw_item_id), None)
    
    if not raw_item:
        # Try getting from any source
        all_items = queries.get_unprocessed_items()
        raw_item = next((item for item in all_items if item.get("id") == raw_item_id), None)
    
    if not raw_item:
        return []

    # Extract points from this raw item
    points = await extractor_service.extract_from_raw_item(raw_item)
    
    if not points:
        return []

    # Generate drafts from extracted points
    point_ids = [p.get("id") for p in points if p.get("id")]
    if not point_ids:
        return []

    result = await generator_service.generate_from_points(point_ids)
    
    drafts_created = result.get("drafts_created", 0)
    
    # Get the created drafts
    all_drafts = []
    for point_id in point_ids:
        drafts = queries.get_drafts_by_point(point_id)
        all_drafts.extend(drafts)

    # Convert to DraftPreview
    return [
        DraftPreview(
            variation_id=f"v{d.get('variationNumber', 1)}",
            content_text=d.get("contentText", ""),
            hook_used=d.get("hookUsed", ""),
            format_used=d.get("formatUsed", ""),
            char_count=d.get("charCount", 0),
        )
        for d in all_drafts
    ]