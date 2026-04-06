"""
Content API routes - /api/v1/content

Endpoints for managing content drafts and the review workflow.
"""

import logging

from fastapi import APIRouter, Depends, HTTPException, status, Query
from fastapi.security import APIKeyHeader
from typing import Optional

from app.config import get_settings
from app.convex_client import queries
from app.models.api_models import DraftResponse, DraftUpdateRequest, DraftApproveRequest
from app.services import reviewer_service


logger = logging.getLogger(__name__)

router = APIRouter(prefix="/content", tags=["content"])

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


@router.get("/drafts", response_model=list[DraftResponse])
async def list_drafts(
    human_status: Optional[str] = Query(default=None, description="Filter by human status"),
    limit: int = Query(default=20, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    api_key: str = Depends(verify_api_key),
) -> list[dict]:
    """List all content drafts, optionally filtered by human status."""
    if human_status:
        all_drafts = queries.get_pending_drafts()
        drafts = [d for d in all_drafts if d.get("humanStatus") == human_status]
    else:
        drafts = queries.get_pending_drafts()

    drafts.sort(key=lambda x: x.get("createdAt", 0), reverse=True)

    paginated = drafts[offset : offset + limit]
    return [DraftResponse(**d) for d in paginated]


@router.get("/drafts/{draft_id}", response_model=DraftResponse)
async def get_draft(
    draft_id: str,
    api_key: str = Depends(verify_api_key),
) -> dict:
    """Get a single draft by ID."""
    draft = queries.get_draft_by_id(draft_id)

    if not draft:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Draft {draft_id} not found",
        )

    return DraftResponse(**draft)


@router.patch("/drafts/{draft_id}")
async def update_draft(
    draft_id: str,
    update: DraftUpdateRequest,
    api_key: str = Depends(verify_api_key),
) -> dict:
    """Update a draft's content or status."""
    draft = queries.get_draft_by_id(draft_id)

    if not draft:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Draft {draft_id} not found",
        )

    try:
        if update.final_content:
            queries.set_draft_final_content(draft_id, update.final_content)

        if update.content_text:
            queries.update_draft_human_status(
                id=draft_id,
                status="edited",
                final_content=update.content_text,
            )

        updated_draft = queries.get_draft_by_id(draft_id)
        return DraftResponse(**updated_draft)
    except Exception as e:
        logger.error(f"Failed to update draft: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to update draft: {str(e)}",
        )


@router.post("/drafts/{draft_id}/approve")
async def approve_draft(
    draft_id: str,
    approval: DraftApproveRequest,
    api_key: str = Depends(verify_api_key),
) -> dict:
    """Approve a draft and schedule it for posting."""
    draft = queries.get_draft_by_id(draft_id)

    if not draft:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Draft {draft_id} not found",
        )

    try:
        final_content = approval.final_content or draft.get("contentText", "")
        queries.update_draft_human_status(
            id=draft_id,
            status="approved",
            final_content=final_content,
        )

        if approval.media_asset_id:
            queries.set_draft_media(draft_id, approval.media_asset_id)

        queue_item = queries.create_queue_item(
            draft_id=draft_id,
            scheduled_at=approval.scheduled_at,
            post_type=approval.post_type,
            community_id=approval.community_id,
        )

        return {
            "status": "approved",
            "draft_id": draft_id,
            "queue_id": queue_item.get("id") if queue_item else None,
            "scheduled_at": approval.scheduled_at,
        }
    except Exception as e:
        logger.error(f"Failed to approve draft: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to approve draft: {str(e)}",
        )


@router.post("/drafts/{draft_id}/reject")
async def reject_draft(
    draft_id: str,
    api_key: str = Depends(verify_api_key),
) -> dict:
    """Reject a draft."""
    draft = queries.get_draft_by_id(draft_id)

    if not draft:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Draft {draft_id} not found",
        )

    try:
        queries.update_draft_human_status(
            id=draft_id,
            status="rejected",
        )

        return {
            "status": "rejected",
            "draft_id": draft_id,
        }
    except Exception as e:
        logger.error(f"Failed to reject draft: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to reject draft: {str(e)}",
        )


@router.post("/drafts/{draft_id}/review")
async def review_draft(
    draft_id: str,
    api_key: str = Depends(verify_api_key),
) -> dict:
    """Trigger brand review for a draft."""
    result = await reviewer_service.review_drafts([draft_id])
    return {
        "status": "reviewed",
        "draft_id": draft_id,
        "result": result,
    }