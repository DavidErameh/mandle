"""
Queue API routes - /api/v1/queue

Endpoints for managing the post queue and scheduled posts.
"""

import logging
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, status, Query
from fastapi.security import APIKeyHeader
from typing import Optional

from app.config import get_settings
from app.convex_client import queries
from app.models.api_models import QueueItemResponse, QueueRescheduleRequest, QueueStatsResponse
from app.utils.helpers import utc_now


logger = logging.getLogger(__name__)

router = APIRouter(prefix="/queue", tags=["queue"])

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


@router.get("", response_model=list[QueueItemResponse])
async def list_queue_items(
    status_filter: Optional[str] = Query(default=None, description="Filter by status"),
    limit: int = Query(default=50, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    api_key: str = Depends(verify_api_key),
) -> list[dict]:
    """List queued and upcoming posts."""
    all_items = queries.get_queued_posts()

    if status_filter:
        all_items = [item for item in all_items if item.get("status") == status_filter]

    all_items.sort(key=lambda x: x.get("scheduledAt", 0))

    paginated = all_items[offset : offset + limit]
    return [QueueItemResponse(**item) for item in paginated]


@router.patch("/{queue_id}", response_model=QueueItemResponse)
async def reschedule_post(
    queue_id: str,
    reschedule: QueueRescheduleRequest,
    api_key: str = Depends(verify_api_key),
) -> dict:
    """Reschedule a queued post."""
    queue_item = queries.get_queue_item_by_id(queue_id)

    if not queue_item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Queue item {queue_id} not found",
        )

    current_status = queue_item.get("status")
    if current_status not in ["queued", "scheduled"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot reschedule a post with status: {current_status}",
        )

    try:
        queries.update_queue_status(
            id=queue_id,
            status="queued",
            posted_at=None,
        )

        from convex_client.queries import create_queue_item
        new_item = create_queue_item(
            draft_id=queue_item.get("draftId"),
            scheduled_at=reschedule.scheduled_at,
            post_type=queue_item.get("postType", "feed"),
            community_id=queue_item.get("communityId"),
        )

        queries.cancel_queue_item(queue_id)

        updated = queries.get_queue_item_by_id(new_item.get("id") if new_item else queue_id)
        return QueueItemResponse(**updated)
    except Exception as e:
        logger.error(f"Failed to reschedule post: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to reschedule: {str(e)}",
        )


@router.delete("/{queue_id}", status_code=status.HTTP_204_NO_CONTENT)
async def cancel_post(
    queue_id: str,
    api_key: str = Depends(verify_api_key),
) -> None:
    """Cancel a queued post."""
    queue_item = queries.get_queue_item_by_id(queue_id)

    if not queue_item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Queue item {queue_id} not found",
        )

    try:
        queries.cancel_queue_item(queue_id)
    except Exception as e:
        logger.error(f"Failed to cancel post: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to cancel: {str(e)}",
        )


@router.get("/stats", response_model=QueueStatsResponse)
async def get_queue_stats(
    api_key: str = Depends(verify_api_key),
) -> dict:
    """Get queue statistics including daily count and limits."""
    settings = get_settings()

    today = datetime.now().date()
    today_start = int(datetime(today.year, today.month, today.day).timestamp() * 1000)

    daily_count = queries.get_daily_post_count(today_start)

    queued_items = queries.get_queued_posts()
    posted_today = len([i for i in queued_items if i.get("status") == "posted"])
    daily_count = posted_today

    start_time = settings.posting_window_start
    end_time = settings.posting_window_end

    return {
        "daily_count": daily_count,
        "daily_limit": settings.max_daily_posts,
        "posting_window": {
            "start": start_time,
            "end": end_time,
        },
    }