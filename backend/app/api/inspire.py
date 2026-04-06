"""
Inspiration API routes - /api/v1/inspire

Endpoints for browsing raw items and extracted points, and triggering
manual content generation.
"""

import logging

from fastapi import APIRouter, Depends, HTTPException, status, Query
from fastapi.security import APIKeyHeader

from app.config import get_settings
from app.convex_client import queries
from app.models.api_models import RawItemResponse, ExtractedPointResponse, ImportRequest, ImportResponse, ImportItemResult
from app.services import generator_service, ingestion_service


logger = logging.getLogger(__name__)

router = APIRouter(prefix="/inspire", tags=["inspiration"])

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


@router.get("", response_model=list[RawItemResponse])
async def list_raw_items(
    limit: int = Query(default=20, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    processed: bool = Query(default=None, description="Filter by processed status"),
    api_key: str = Depends(verify_api_key),
) -> list[dict]:
    """List recent raw items with pagination."""
    all_items = queries.get_unprocessed_items() if processed is False else queries.get_all_feeds()

    raw_items = []
    all_feeds = queries.get_all_feeds()
    for feed in all_feeds:
        items = queries.get_items_by_source(feed.get("id"))
        raw_items.extend(items)

    if processed is not None:
        raw_items = [item for item in raw_items if item.get("processed") == processed]

    raw_items.sort(key=lambda x: x.get("publishedAt", 0), reverse=True)

    paginated = raw_items[offset : offset + limit]
    return [RawItemResponse(**item) for item in paginated]


@router.post("/import", response_model=ImportResponse)
async def quick_import(
    request: ImportRequest,
    api_key: str = Depends(verify_api_key),
) -> ImportResponse:
    """
    Import one or more URLs or X thread text into the pipeline.
    Each URL is processed concurrently. Per-item errors are returned
    in the response — the endpoint always returns 200.
    """
    results = await ingestion_service.run_quick_import(
        urls=request.urls,
        x_text=request.x_text,
        note=request.note,
    )

    items = [ImportItemResult(**r.model_dump()) for r in results]

    return ImportResponse(
        results=items,
        success_count=sum(1 for r in items if r.status == "success"),
        failed_count=sum(1 for r in items if r.status == "failed"),
        duplicate_count=sum(1 for r in items if r.status == "duplicate"),
    )


@router.get("/points")
async def list_extracted_points(
    limit: int = Query(default=20, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    min_score: int = Query(default=1, ge=1, le=10, description="Minimum relevance score"),
    unused_only: bool = Query(default=False, description="Show only unused points"),
    api_key: str = Depends(verify_api_key),
):
    """List extracted points, optionally filtered."""
    if unused_only:
        points = queries.get_unused_points()
    else:
        points = queries.get_points_by_score(min_score)

    points.sort(key=lambda x: x.get("createdAt", 0), reverse=True)
    paginated = points[offset : offset + limit]
    
    # Return raw list without Pydantic model to avoid serialization issues
    return paginated


@router.post("/points/{point_id}/generate", status_code=status.HTTP_202_ACCEPTED)
async def generate_from_point(
    point_id: str,
    api_key: str = Depends(verify_api_key),
) -> dict:
    """Trigger content generation from a specific extracted point."""
    all_points = queries.get_points_by_score(1)
    point = next((p for p in all_points if p.get("id") == point_id), None)

    if not point:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Extracted point {point_id} not found",
        )

    try:
        result = await generator_service.generate_from_points(point_ids=[point_id])

        return {
            "status": "accepted",
            "point_id": point_id,
            "drafts_created": result.get("drafts_created", 0),
        }
    except Exception as e:
        logger.error(f"Failed to generate from point: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate: {str(e)}",
        )