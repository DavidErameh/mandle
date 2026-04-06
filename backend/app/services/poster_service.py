"""
Poster Service - X API posting logic for scheduled posts.

This service implements Stage 6 of the pipeline: posting scheduled
content to X via the API, enforcing daily limits and posting windows.
"""

import logging
import random
from datetime import datetime, time
from typing import Any, Optional

import tweepy

from app.config import get_settings
from app.convex_client import queries
from app.utils.helpers import utc_now


logger = logging.getLogger(__name__)


def _get_tweepy_client() -> tweepy.API:
    """Get an authenticated Tweepy API client."""
    settings = get_settings()

    auth = tweepy.OAuthHandler(settings.x_api_key, settings.x_api_secret)
    auth.set_access_token(settings.x_access_token, settings.x_access_token_secret)

    return tweepy.API(auth)


def _is_within_posting_window() -> bool:
    """Check if current time is within the configured posting window."""
    settings = get_settings()

    now = datetime.now()
    current_time = now.time()

    start_time = time.fromisoformat(settings.posting_window_start)
    end_time = time.fromisoformat(settings.posting_window_end)

    if start_time <= end_time:
        return start_time <= current_time <= end_time
    else:
        return current_time >= start_time or current_time <= end_time


def _check_daily_limit() -> bool:
    """Check if we're under the daily post limit."""
    settings = get_settings()
    today = datetime.now().date()
    today_start = int(datetime(today.year, today.month, today.day).timestamp() * 1000)

    count = queries.get_daily_post_count(today_start)
    return count < settings.max_daily_posts


async def _post_to_x(queue_item: dict[str, Any]) -> bool:
    """Post a single queue item to X."""
    queue_id = queue_item.get("id", "")
    draft_id = queue_item.get("draftId", "")

    try:
        draft = queries.get_draft_by_id(draft_id)
        if not draft:
            logger.error(f"Draft {draft_id} not found for queue item {queue_id}")
            queries.update_queue_status(
                id=queue_id,
                status="failed",
                error_message="Draft not found",
            )
            return False

        content = draft.get("finalContent") or draft.get("contentText", "")
        if not content:
            logger.error(f"Draft {draft_id} has no content")
            queries.update_queue_status(
                id=queue_id,
                status="failed",
                error_message="No content",
            )
            return False

        media_asset_id = draft.get("mediaAssetId")
        media_urls = []

        if media_asset_id:
            media = queries.get_all_media()
            for m in media:
                if m.get("id") == media_asset_id:
                    media_urls.append(m.get("url"))
                    break

        post_type = queue_item.get("postType", "feed")
        community_id = queue_item.get("communityId")

        client = _get_tweepy_client()

        media_ids = []
        if media_urls:
            for url in media_urls:
                try:
                    response = client.media_upload(url)
                    media_ids.append(response.media_id)
                except Exception as e:
                    logger.warning(f"Failed to upload media: {e}")

        if post_type == "community" and community_id:
            tweet = client.create_tweet(
                text=content,
                media_ids=media_ids if media_ids else None,
            )
        else:
            tweet = client.update_status(
                status=content,
                media_ids=media_ids if media_ids else None,
            )

        x_post_id = str(tweet.id)
        posted_at = utc_now()

        queries.update_queue_status(
            id=queue_id,
            status="posted",
            x_post_id=x_post_id,
            posted_at=posted_at,
        )

        logger.info(f"Successfully posted tweet {x_post_id} from queue {queue_id}")
        return True

    except tweepy.Forbidden as e:
        error_msg = f"Twitter API forbidden: {e}"
        logger.error(error_msg)
        queries.update_queue_status(
            id=queue_id,
            status="failed",
            error_message=error_msg,
        )
        return False

    except tweepy.TooManyRequests as e:
        error_msg = f"Rate limit hit: {e}"
        logger.error(error_msg)
        queries.update_queue_status(
            id=queue_id,
            status="failed",
            error_message=error_msg,
        )
        return False

    except Exception as e:
        error_msg = f"Failed to post: {e}"
        logger.error(error_msg)
        queries.update_queue_status(
            id=queue_id,
            status="failed",
            error_message=error_msg,
        )
        return False


async def process_due_posts() -> dict[str, Any]:
    """
    Process all due posts in the queue.

    Returns:
        A dict with posting statistics.
    """
    logger.info("Starting post processing job")

    if not _is_within_posting_window():
        logger.info("Outside of posting window, skipping post processing")
        return {"processed": 0, "posted": 0, "failed": 0, "skipped": "outside_window"}

    if not _check_daily_limit():
        logger.info("Daily post limit reached, skipping post processing")
        return {"processed": 0, "posted": 0, "failed": 0, "skipped": "daily_limit"}

    now = utc_now()
    due_posts = queries.get_due_posts(now)

    if not due_posts:
        logger.info("No due posts to process")
        return {"processed": 0, "posted": 0, "failed": 0}

    logger.info(f"Found {len(due_posts)} due posts")

    processed_count = 0
    posted_count = 0
    failed_count = 0

    for queue_item in due_posts:
        if not _check_daily_limit():
            logger.info("Daily limit reached during processing")
            break

        success = await _post_to_x(queue_item)

        if success:
            posted_count += 1
        else:
            failed_count += 1
        processed_count += 1

        delay = random.randint(2, 5)
        logger.debug(f"Waiting {delay}s between posts to avoid rate limits")
        import asyncio
        await asyncio.sleep(delay)

    logger.info(
        f"Post processing completed. Processed: {processed_count}, Posted: {posted_count}, Failed: {failed_count}"
    )

    return {
        "processed": processed_count,
        "posted": posted_count,
        "failed": failed_count,
    }