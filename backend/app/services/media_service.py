"""
Media Service - Cloudinary image management.

This service handles all interaction with Cloudinary for image upload,
tagging, retrieval, and deletion.
"""

import logging
import io
from typing import Optional

import cloudinary
import cloudinary.uploader

from app.config import get_settings
from app.convex_client import queries
from app.utils.helpers import utc_now


logger = logging.getLogger(__name__)


def _configure_cloudinary() -> None:
    """Configure Cloudinary SDK with credentials from settings."""
    settings = get_settings()

    cloudinary.config(
        cloud_name=settings.cloudinary_cloud_name,
        api_key=settings.cloudinary_api_key,
        api_secret=settings.cloudinary_api_secret,
        secure=True,
    )


async def upload_image(
    file_data: bytes,
    filename: str,
    tags: list[str],
) -> dict:
    """
    Upload an image to Cloudinary and register it in Convex.

    Args:
        file_data: The image file data.
        filename: The original filename.
        tags: List of tags for the image.

    Returns:
        The created media asset dict.

    Raises:
        Exception: If upload fails.
    """
    _configure_cloudinary()

    try:
        result = cloudinary.uploader.upload(
            file_data,
            public_id=f"mandle_{utc_now()}",
            tags=tags,
        )
    except Exception as e:
        logger.error(f"Cloudinary upload failed: {e}")
        raise

    public_id = result.get("public_id", "")
    url = result.get("secure_url", "")
    width = result.get("width", 0)
    height = result.get("height", 0)

    try:
        asset = queries.create_media(
            cloudinary_public_id=public_id,
            url=url,
            tags=tags,
            width=width,
            height=height,
        )
        logger.info(f"Uploaded image: {public_id}")
        return asset
    except Exception as e:
        logger.error(f"Failed to create media asset in Convex: {e}")
        raise


async def upload_image_from_url(url: str, tags: list[str]) -> dict:
    """
    Upload an image to Cloudinary from a URL and register it in Convex.

    Args:
        url: The URL of the image to upload.
        tags: List of tags for the image.

    Returns:
        The created media asset dict.
    """
    _configure_cloudinary()

    try:
        result = cloudinary.uploader.upload(
            url,
            public_id=f"mandle_{utc_now()}",
            tags=tags,
        )
    except Exception as e:
        logger.error(f"Cloudinary upload from URL failed: {e}")
        raise

    public_id = result.get("public_id", "")
    delivery_url = result.get("secure_url", "")
    width = result.get("width", 0)
    height = result.get("height", 0)

    try:
        asset = queries.create_media(
            cloudinary_public_id=public_id,
            url=delivery_url,
            tags=tags,
            width=width,
            height=height,
        )
        logger.info(f"Uploaded image from URL: {public_id}")
        return asset
    except Exception as e:
        logger.error(f"Failed to create media asset in Convex: {e}")
        raise


async def get_images(tag: Optional[str] = None) -> list[dict]:
    """
    Get all media assets, optionally filtered by tag.

    Args:
        tag: Optional tag to filter by.

    Returns:
        List of media asset dicts.
    """
    if tag:
        return queries.get_media_by_tag(tag)
    return queries.get_all_media()


async def delete_image(asset_id: str) -> bool:
    """
    Delete an image from Cloudinary and Convex.

    Args:
        asset_id: The Convex ID of the media asset.

    Returns:
        True if deletion succeeded.

    Raises:
        Exception: If deletion fails.
    """
    all_media = queries.get_all_media()

    asset = None
    for m in all_media:
        if m.get("id") == asset_id:
            asset = m
            break

    if not asset:
        logger.warning(f"Media asset {asset_id} not found")
        return False

    public_id = asset.get("cloudinaryPublicId", "")

    _configure_cloudinary()

    try:
        cloudinary.uploader.destroy(public_id)
        logger.info(f"Deleted image from Cloudinary: {public_id}")
    except Exception as e:
        logger.error(f"Failed to delete from Cloudinary: {e}")
        raise

    try:
        queries.remove_media(asset_id)
        logger.info(f"Deleted media asset from Convex: {asset_id}")
        return True
    except Exception as e:
        logger.error(f"Failed to delete from Convex: {e}")
        raise


async def get_cloudinary_url(asset_id: str) -> Optional[str]:
    """
    Get the Cloudinary delivery URL for a media asset.

    Args:
        asset_id: The Convex ID of the media asset.

    Returns:
        The Cloudinary URL, or None if not found.
    """
    all_media = queries.get_all_media()

    for asset in all_media:
        if asset.get("id") == asset_id:
            return asset.get("url")

    return None


async def get_asset_by_id(asset_id: str) -> Optional[dict]:
    """
    Get a media asset by its Convex ID.

    Args:
        asset_id: The Convex ID of the media asset.

    Returns:
        The media asset dict, or None if not found.
    """
    all_media = queries.get_all_media()

    for asset in all_media:
        if asset.get("id") == asset_id:
            return asset

    return None