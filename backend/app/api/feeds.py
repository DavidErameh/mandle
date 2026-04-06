"""
Feeds API routes - /api/v1/feeds

Endpoints for managing RSS and YouTube feed sources.
"""

import logging
import time
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import APIKeyHeader

from app.config import get_settings
from app.convex_client import queries
from app.models.api_models import FeedCreate, FeedUpdate, FeedResponse
from app.services import ingestion_service


logger = logging.getLogger(__name__)

router = APIRouter(prefix="/feeds", tags=["feeds"])

api_key_header = APIKeyHeader(name="X-API-Key")


async def verify_api_key(api_key: str = Depends(api_key_header)) -> str:
    """Verify the API key from the request header."""
    settings = get_settings()
    if not settings.internal_api_key:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="API key not configured on server",
        )
    if api_key != settings.internal_api_key:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid API key",
        )
    return api_key


@router.get("", response_model=list[FeedResponse])
async def list_feeds(api_key: str = Depends(verify_api_key)) -> list[dict]:
    """List all feed sources."""
    feeds = queries.get_all_feeds()
    return [FeedResponse(**f) for f in feeds]


@router.post("", response_model=FeedResponse, status_code=status.HTTP_201_CREATED)
async def create_feed(
    feed: FeedCreate,
    api_key: str = Depends(verify_api_key),
) -> dict:
    """Create a new feed source."""
    try:
        result = queries.create_feed(
            feed_name=feed.name,
            feed_type=feed.feed_type,
            url=feed.url,
            is_active=feed.is_active,
            fetch_interval_minutes=feed.fetch_interval_minutes,
        )
        return result
    except Exception as e:
        logger.error(f"Failed to create feed: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to create feed: {str(e)}",
        )


@router.patch("/{feed_id}", response_model=FeedResponse)
async def update_feed(
    feed_id: str,
    feed_update: FeedUpdate,
    api_key: str = Depends(verify_api_key),
) -> dict:
    """Update a feed source."""
    all_feeds = queries.get_all_feeds()
    feed = next((f for f in all_feeds if f.get("id") == feed_id), None)

    if not feed:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Feed {feed_id} not found",
        )

    try:
        queries.update_feed(
            id=feed_id,
            name=feed_update.name,
            feed_type=feed_update.feed_type,
            url=feed_update.url,
            is_active=feed_update.is_active,
            fetch_interval_minutes=feed_update.fetch_interval_minutes,
        )

        updated = queries.get_all_feeds()
        return next(f for f in updated if f.get("id") == feed_id)
    except Exception as e:
        logger.error(f"Failed to update feed: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to update feed: {str(e)}",
        )


@router.delete("/{feed_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_feed(
    feed_id: str,
    api_key: str = Depends(verify_api_key),
) -> None:
    """Delete a feed source."""
    all_feeds = queries.get_all_feeds()
    feed = next((f for f in all_feeds if f.get("id") == feed_id), None)

    if not feed:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Feed {feed_id} not found",
        )

    try:
        queries.remove_feed(feed_id)
    except Exception as e:
        logger.error(f"Failed to delete feed: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to delete feed: {str(e)}",
        )


@router.post("/{feed_id}/fetch-now", status_code=status.HTTP_202_ACCEPTED)
async def fetch_feed_now(
    feed_id: str,
    api_key: str = Depends(verify_api_key),
) -> dict:
    """Manually trigger a fetch for a specific feed source."""
    all_feeds = queries.get_all_feeds()
    feed = next((f for f in all_feeds if f.get("id") == feed_id), None)

    if not feed:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Feed {feed_id} not found",
        )

    try:
        if feed.get("type") == "rss":
            count = await ingestion_service._ingest_rss(feed)
        elif feed.get("type") == "youtube":
            count = await ingestion_service._ingest_youtube(feed)
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Unknown feed type: {feed.get('type')}",
            )

        import time
        queries.update_feed_last_fetched(
            id=feed_id,
            last_fetched_at=int(time.time() * 1000),
        )

        return {
            "status": "accepted",
            "feed_id": feed_id,
            "items_ingested": count,
        }
    except Exception as e:
        logger.error(f"Failed to fetch feed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch feed: {str(e)}",
        )