"""
Replies API routes - /api/v1/replies

Endpoints for managing reply drafts and the reply approval workflow.
"""

import logging

from fastapi import APIRouter, Depends, HTTPException, status, Query
from fastapi.security import APIKeyHeader
from typing import Optional

from app.config import get_settings
from app.convex_client import queries
from app.models.api_models import ReplyDraftResponse, ReplyEditRequest, ReplyApproveRequest
from app.services import reply_service


logger = logging.getLogger(__name__)

router = APIRouter(prefix="/replies", tags=["replies"])

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


@router.get("/drafts", response_model=list[ReplyDraftResponse])
async def list_reply_drafts(
    human_status: Optional[str] = Query(default=None, description="Filter by human status"),
    limit: int = Query(default=20, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    api_key: str = Depends(verify_api_key),
) -> list[dict]:
    """List reply drafts, optionally filtered by human status."""
    if human_status == "pending":
        drafts = queries.get_pending_replies()
    else:
        drafts = queries.get_pending_replies()

    if human_status:
        drafts = [d for d in drafts if d.get("humanStatus") == human_status]

    drafts.sort(key=lambda x: x.get("createdAt", 0), reverse=True)

    paginated = drafts[offset : offset + limit]
    return [ReplyDraftResponse(**d) for d in paginated]


@router.patch("/drafts/{reply_id}")
async def edit_reply(
    reply_id: str,
    edit: ReplyEditRequest,
    api_key: str = Depends(verify_api_key),
) -> dict:
    """Edit a reply draft's selected reply text."""
    all_replies = queries.get_pending_replies()
    reply = next((r for r in all_replies if r.get("id") == reply_id), None)

    if not reply:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Reply draft {reply_id} not found",
        )

    try:
        queries.set_selected_reply(reply_id, edit.selected_reply)

        updated = queries.get_pending_replies()
        updated_reply = next((r for r in updated if r.get("id") == reply_id), None)

        return ReplyDraftResponse(**updated_reply)
    except Exception as e:
        logger.error(f"Failed to edit reply: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to edit reply: {str(e)}",
        )


@router.post("/drafts/{reply_id}/approve", status_code=status.HTTP_202_ACCEPTED)
async def approve_reply(
    reply_id: str,
    approval: ReplyApproveRequest,
    api_key: str = Depends(verify_api_key),
) -> dict:
    """Approve a reply and trigger delayed posting."""
    all_replies = queries.get_pending_replies()
    reply = next((r for r in all_replies if r.get("id") == reply_id), None)

    if not reply:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Reply draft {reply_id} not found",
        )

    try:
        selected = approval.selected_reply or reply.get("replyAgreeExtend", "")
        queries.set_selected_reply(reply_id, selected)
        queries.update_reply_status(reply_id, "approved")

        return {
            "status": "approved",
            "reply_id": reply_id,
            "message": "Reply will be posted with a random delay",
        }
    except Exception as e:
        logger.error(f"Failed to approve reply: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to approve reply: {str(e)}",
        )


@router.post("/drafts/{reply_id}/reject")
async def reject_reply(
    reply_id: str,
    api_key: str = Depends(verify_api_key),
) -> dict:
    """Reject a reply draft."""
    all_replies = queries.get_pending_replies()
    reply = next((r for r in all_replies if r.get("id") == reply_id), None)

    if not reply:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Reply draft {reply_id} not found",
        )

    try:
        queries.update_reply_status(reply_id, "rejected")

        return {
            "status": "rejected",
            "reply_id": reply_id,
        }
    except Exception as e:
        logger.error(f"Failed to reject reply: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to reject reply: {str(e)}",
        )