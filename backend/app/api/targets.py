"""
Targets API routes - /api/v1/targets

Endpoints for managing target accounts for the reply system.
"""

import logging

from fastapi import APIRouter, Depends, HTTPException, status, Query
from fastapi.security import APIKeyHeader
from typing import Optional

import tweepy

from app.config import get_settings
from app.convex_client import queries
from app.models.api_models import TargetAccountCreate, TargetAccountUpdate, TargetAccountResponse


logger = logging.getLogger(__name__)

router = APIRouter(prefix="/targets", tags=["targets"])

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


def _resolve_username_to_id(username: str) -> Optional[str]:
    """Resolve a Twitter username to their user ID."""
    settings = get_settings()

    try:
        auth = tweepy.OAuthHandler(settings.x_api_key, settings.x_api_secret)
        auth.set_access_token(settings.x_access_token, settings.x_access_token_secret)
        api = tweepy.API(auth)

        user = api.get_user(screen_name=username)
        return str(user.id)
    except Exception as e:
        logger.warning(f"Failed to resolve username {username}: {e}")
        return None


@router.get("", response_model=list[TargetAccountResponse])
async def list_targets(
    is_active: Optional[bool] = Query(default=None, description="Filter by active status"),
    category: Optional[str] = Query(default=None, description="Filter by category"),
    limit: int = Query(default=50, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    api_key: str = Depends(verify_api_key),
) -> list[dict]:
    """List target accounts, optionally filtered."""
    if is_active is True:
        targets = queries.get_active_targets()
    else:
        targets = queries.get_all_targets()

    if category:
        targets = [t for t in targets if t.get("category") == category]

    targets.sort(key=lambda x: x.get("createdAt", 0), reverse=True)

    paginated = targets[offset : offset + limit]
    return [TargetAccountResponse(**t) for t in paginated]


@router.post("", response_model=TargetAccountResponse, status_code=status.HTTP_201_CREATED)
async def create_target(
    target: TargetAccountCreate,
    api_key: str = Depends(verify_api_key),
) -> dict:
    """Create a new target account."""
    valid_categories = ["thought_leader", "competitor", "potential_client", "community"]
    valid_engagement = ["high", "medium", "low"]

    if target.category not in valid_categories:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Invalid category. Must be one of: {valid_categories}",
        )

    if target.engagement_level not in valid_engagement:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Invalid engagement level. Must be one of: {valid_engagement}",
        )

    x_user_id = target.x_user_id

    if not x_user_id or x_user_id == "auto":
        resolved_id = _resolve_username_to_id(target.x_username)
        if not resolved_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Could not resolve username {target.x_username} to user ID",
            )
        x_user_id = resolved_id

    try:
        result = queries.create_target(
            x_username=target.x_username,
            x_user_id=x_user_id,
            category=target.category,
            engagement_level=target.engagement_level,
        )
        return TargetAccountResponse(**result)
    except Exception as e:
        logger.error(f"Failed to create target: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to create target: {str(e)}",
        )


@router.patch("/{target_id}", response_model=TargetAccountResponse)
async def update_target(
    target_id: str,
    update: TargetAccountUpdate,
    api_key: str = Depends(verify_api_key),
) -> dict:
    """Update a target account."""
    all_targets = queries.get_all_targets()
    target = next((t for t in all_targets if t.get("id") == target_id), None)

    if not target:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Target account {target_id} not found",
        )

    valid_categories = ["thought_leader", "competitor", "potential_client", "community"]
    valid_engagement = ["high", "medium", "low"]

    if update.category and update.category not in valid_categories:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Invalid category. Must be one of: {valid_categories}",
        )

    if update.engagement_level and update.engagement_level not in valid_engagement:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Invalid engagement level. Must be one of: {valid_engagement}",
        )

    try:
        queries.update_target(
            id=target_id,
            category=update.category,
            engagement_level=update.engagement_level,
            is_active=update.is_active,
        )

        updated = queries.get_all_targets()
        return TargetAccountResponse(**next(t for t in updated if t.get("id") == target_id))
    except Exception as e:
        logger.error(f"Failed to update target: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to update target: {str(e)}",
        )


@router.delete("/{target_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_target(
    target_id: str,
    api_key: str = Depends(verify_api_key),
) -> None:
    """Delete a target account."""
    all_targets = queries.get_all_targets()
    target = next((t for t in all_targets if t.get("id") == target_id), None)

    if not target:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Target account {target_id} not found",
        )

    try:
        queries.remove_target(target_id)
    except Exception as e:
        logger.error(f"Failed to delete target: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to delete target: {str(e)}",
        )