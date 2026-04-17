"""
Pipeline API - Unified pipeline endpoints for the dashboard.

Provides a single source of truth for the pipeline flow:
Ingestion -> Extraction -> Generation -> Review -> Queue
"""

import logging
from typing import Optional, Literal

from fastapi import APIRouter, Depends, HTTPException, status, Query
from fastapi.security import APIKeyHeader

from app.config import get_settings
from app.convex_client import queries
from app.models.api_models import (
    DraftPreview,
    ImportRequest,
    ImportResponseWithDrafts,
    ImportItemResult,
)
from app.services import (
    ingestion_service,
    extractor_service,
    generator_service,
)


logger = logging.getLogger(__name__)

router = APIRouter(prefix="/pipeline", tags=["pipeline"])

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


PipelineStage = Literal["ingestion", "extraction", "generation", "review", "queue"]


@router.get("/stats")
async def get_pipeline_stats(api_key: str = Depends(verify_api_key)) -> dict:
    """
    Get counts for all pipeline stages.
    
    Returns:
        - ingestion: count of unprocessed raw items
        - extraction: count of unused extracted points
        - generation: count of pending review drafts
        - review: count of drafts pending human review (alias for generation)
        - queue: count of scheduled posts
    """
    # Ingestion: unprocessed raw items
    unprocessed_raw = queries.get_unprocessed_items()
    ingestion_count = len(unprocessed_raw)
    
    # Extraction: unused extracted points
    unused_points = queries.get_unused_points()
    extraction_count = len(unused_points)
    
    # Generation + Review: pending drafts
    pending_drafts = queries.get_pending_drafts()
    generation_count = len(pending_drafts)
    
    # Queue: queued posts
    queued_posts = queries.get_queued_posts()
    queue_count = len(queued_posts)
    
    return {
        "ingestion": ingestion_count,
        "extraction": extraction_count,
        "generation": generation_count,
        "review": generation_count,  # Same as generation - pending review
        "queue": queue_count,
    }


@router.get("/items")
async def get_pipeline_items(
    stage: PipelineStage = Query(..., description="Pipeline stage"),
    limit: int = Query(default=20, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    api_key: str = Depends(verify_api_key),
) -> list[dict]:
    """Get items at a specific pipeline stage."""
    
    if stage == "ingestion":
        items = queries.get_unprocessed_items()
    elif stage == "extraction":
        items = queries.get_unused_points()
    elif stage in ("generation", "review"):
        items = queries.get_pending_drafts()
    elif stage == "queue":
        items = queries.get_queued_posts()
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid stage: {stage}",
        )
    
    # Sort by most recent
    if stage in ("generation", "review"):
        items.sort(key=lambda x: x.get("createdAt", 0), reverse=True)
    elif stage == "queue":
        items.sort(key=lambda x: x.get("scheduledAt", 0), reverse=False)
    else:
        items.sort(key=lambda x: x.get("ingestedAt", 0) or x.get("createdAt", 0), reverse=True)
    
    return items[offset : offset + limit]


@router.post("/import")
async def pipeline_import(
    request: ImportRequest,
    api_key: str = Depends(verify_api_key),
) -> ImportResponseWithDrafts:
    """
    Import content into the pipeline.
    
    This triggers the full flow:
    1. Import creates raw item
    2. Immediate extraction creates points
    3. Immediate generation creates drafts
    4. Returns all generated drafts
    """
    import_results, generated_drafts = await ingestion_service.run_quick_import(
        urls=request.urls,
        x_text=request.x_text,
        note=request.note,
        auto_generate=True,
    )

    items = [ImportItemResult(**r.model_dump()) for r in import_results]
    drafts = [DraftPreview(**d.model_dump()) for d in generated_drafts]

    return ImportResponseWithDrafts(
        results=items,
        generated_drafts=drafts,
        success_count=sum(1 for r in items if r.status == "success"),
        failed_count=sum(1 for r in items if r.status == "failed"),
        duplicate_count=sum(1 for r in items if r.status == "duplicate"),
    )


@router.post("/extract/{raw_item_id}")
async def trigger_extraction(
    raw_item_id: str,
    api_key: str = Depends(verify_api_key),
) -> dict:
    """Manually trigger extraction for a raw item."""
    
    from app.convex_client.queries import get_all_feeds, get_items_by_source
    
    # Get all feeds and find the raw item
    raw_item = None
    feeds = get_all_feeds()
    for feed in feeds:
        items = get_items_by_source(feed.get("id"))
        raw_item = next((item for item in items if item.get("id") == raw_item_id), None)
        if raw_item:
            break
    
    if not raw_item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Raw item {raw_item_id} not found",
        )
    
    try:
        points = await extractor_service.extract_from_raw_item(raw_item)
        return {
            "status": "success",
            "raw_item_id": raw_item_id,
            "points_extracted": len(points),
        }
    except Exception as e:
        import traceback
        logger.error(f"Extraction failed for {raw_item_id}: {e}\n{traceback.format_exc()}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Extraction failed: {str(e)}",
        )


@router.post("/generate/{point_id}")
async def trigger_generation(
    point_id: str,
    api_key: str = Depends(verify_api_key),
) -> dict:
    """Manually trigger generation for an extracted point."""
    
    try:
        result = await generator_service.generate_from_points(point_ids=[point_id])
        return {
            "status": "success",
            "point_id": point_id,
            "drafts_created": result.get("drafts_created", 0),
        }
    except Exception as e:
        logger.error(f"Generation failed for {point_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Generation failed: {str(e)}",
        )
