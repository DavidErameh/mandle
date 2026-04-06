"""
Media API routes - /api/v1/media

Endpoints for managing media assets in Cloudinary.
"""

import logging
from typing import Optional, List

from fastapi import APIRouter, Depends, HTTPException, status, Query, UploadFile, File, Form
from fastapi.security import APIKeyHeader

from app.config import get_settings
from app.models.api_models import MediaAssetResponse
from app.services import media_service


logger = logging.getLogger(__name__)

router = APIRouter(prefix="/media", tags=["media"])

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


@router.get("", response_model=List[MediaAssetResponse])
async def list_media(
    tag: Optional[str] = Query(default=None, description="Filter by tag"),
    limit: int = Query(default=50, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    api_key: str = Depends(verify_api_key),
) -> list[dict]:
    """List media assets, optionally filtered by tag."""
    try:
        assets = await media_service.get_images(tag=tag)

        assets.sort(key=lambda x: x.get("uploadedAt", 0), reverse=True)

        paginated = assets[offset : offset + limit]
        return [MediaAssetResponse(**asset) for asset in paginated]
    except Exception as e:
        logger.error(f"Failed to list media: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to list media: {str(e)}",
        )


@router.post("", response_model=MediaAssetResponse, status_code=status.HTTP_201_CREATED)
async def upload_media(
    file: UploadFile = File(..., description="Image file to upload"),
    tags: Optional[str] = Form(default="", description="Comma-separated tags"),
    api_key: str = Depends(verify_api_key),
) -> dict:
    """Upload a new image to Cloudinary."""
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File must be an image",
        )

    try:
        file_data = await file.read()

        tag_list = [t.strip() for t in tags.split(",") if t.strip()]

        asset = await media_service.upload_image(
            file_data=file_data,
            filename=file.filename or "upload.jpg",
            tags=tag_list,
        )

        return MediaAssetResponse(**asset)
    except Exception as e:
        logger.error(f"Failed to upload media: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to upload media: {str(e)}",
        )


@router.delete("/{asset_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_media(
    asset_id: str,
    api_key: str = Depends(verify_api_key),
) -> None:
    """Delete a media asset from Cloudinary and Convex."""
    try:
        success = await media_service.delete_image(asset_id)

        if not success:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Media asset {asset_id} not found",
            )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to delete media: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to delete media: {str(e)}",
        )