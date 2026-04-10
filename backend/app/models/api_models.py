"""
Pydantic API models for Mandle FastAPI endpoints.

These models define request/response shapes for the REST API.
They mirror the Convex schema but are separate from it.
"""

from datetime import datetime
from typing import Optional, Any

from pydantic import BaseModel, Field, field_validator, field_validator


# ============================================================================
# FEEDS
# ============================================================================


class FeedCreate(BaseModel):
    """Request model for creating a feed source."""

    name: str = Field(description="Display name for the feed")
    feed_type: str = Field(description="Type of feed: 'rss' or 'youtube'")
    url: str = Field(description="URL of the RSS feed or YouTube channel URL")
    is_active: bool = Field(default=True, description="Whether the feed is active")
    fetch_interval_minutes: int = Field(default=60, description="How often to fetch in minutes")


class FeedUpdate(BaseModel):
    """Request model for updating a feed source."""

    name: Optional[str] = None
    feed_type: Optional[str] = None
    url: Optional[str] = None
    is_active: Optional[bool] = None
    fetch_interval_minutes: Optional[int] = None


class FeedResponse(BaseModel):
    """Response model for a feed source."""

    id: str
    name: str
    feed_type: str
    url: str
    is_active: bool
    fetch_interval_minutes: int
    last_fetched_at: Optional[int] = None
    created_at: Optional[int] = None

    model_config = {"from_attributes": True}


# ============================================================================
# RAW ITEMS
# ============================================================================


class RawItemResponse(BaseModel):
    """Response model for a raw item."""

    id: str
    source_id: str
    external_id: str
    title: str
    raw_text: str
    published_at: int
    ingested_at: int
    processed: bool

    model_config = {"from_attributes": True}


# ============================================================================
# EXTRACTED POINTS
# ============================================================================


class ExtractedPointResponse(BaseModel):
    """Response model for an extracted point."""

    id: str
    raw_item_id: str = Field(alias="rawItemId")
    text: str
    point_type: str = Field(alias="type", description="Type: mechanism, intersection, data, failure, gap, translation, or contrarian")
    source_lens: Optional[str] = Field(default=None, alias="sourceLens", description="Lens: trending_tech, design_craft, raw_practitioner, unfiltered_opinion, or general")
    translation_path: Optional[str] = Field(default=None, alias="translationPath")
    relevance_score: int = Field(alias="relevanceScore", ge=1, le=10, description="Relevance score 1-10")
    suggested_angle: str = Field(alias="suggestedAngle")
    used_in_generation: bool = Field(alias="usedInGeneration")
    created_at: int = Field(alias="createdAt")

    model_config = {"from_attributes": True, "populate_by_name": True}


# ============================================================================
# CONTENT DRAFTS
# ============================================================================


class DraftResponse(BaseModel):
    """Response model for a content draft."""

    id: str
    extracted_point_id: str
    variation_number: int = Field(ge=1, le=3)
    content_text: str
    hook_used: str
    format_used: str
    char_count: int
    brand_score: Optional[int] = Field(default=None, ge=1, le=10)
    reviewer_approved: Optional[bool] = None
    rule_violations: Optional[list[str]] = None
    suggested_edits: Optional[list[str]] = None
    human_status: str = Field(description="pending, approved, rejected, or edited")
    final_content: Optional[str] = None
    media_asset_id: Optional[str] = None
    created_at: int

    model_config = {"from_attributes": True}


class DraftUpdateRequest(BaseModel):
    """Request model for updating draft content."""

    content_text: Optional[str] = None
    final_content: Optional[str] = None


class DraftApproveRequest(BaseModel):
    """Request model for approving a draft and scheduling it."""

    scheduled_at: int = Field(description="Unix timestamp in milliseconds")
    post_type: str = Field(description="'feed' or 'community'")
    community_id: Optional[str] = Field(default=None, description="X Community ID if community post")
    media_asset_id: Optional[str] = None


# ============================================================================
# POST QUEUE
# ============================================================================


class QueueItemResponse(BaseModel):
    """Response model for a queue item."""

    id: str
    draft_id: str
    scheduled_at: int
    post_type: str
    community_id: Optional[str] = None
    status: str = Field(description="queued, posted, failed, or cancelled")
    x_post_id: Optional[str] = None
    posted_at: Optional[int] = None
    error_message: Optional[str] = None
    created_at: int

    model_config = {"from_attributes": True}


class QueueRescheduleRequest(BaseModel):
    """Request model for rescheduling a queued post."""

    scheduled_at: int = Field(description="New scheduled time in milliseconds")


class QueueStatsResponse(BaseModel):
    """Response model for queue statistics."""

    daily_count: int
    daily_limit: int
    next_available_slot: Optional[int] = None


# ============================================================================
# MEDIA ASSETS
# ============================================================================


class MediaAssetResponse(BaseModel):
    """Response model for a media asset."""

    id: str
    cloudinary_public_id: str
    url: str
    tags: list[str]
    width: int
    height: int
    uploaded_at: int

    model_config = {"from_attributes": True}


class MediaUploadRequest(BaseModel):
    """Request model for uploading a media asset."""

    tags: list[str] = Field(description="Tags for the image")


# ============================================================================
# REPLY DRAFTS
# ============================================================================


class ReplyDraftResponse(BaseModel):
    """Response model for a reply draft."""

    id: str
    target_account_id: str
    source_tweet_id: str
    source_tweet_text: str
    reply_agree_extend: str
    reply_contrarian: str
    reply_curiosity_hook: str
    human_status: str = Field(description="pending, approved, or rejected")
    selected_reply: Optional[str] = None
    x_reply_id: Optional[str] = None
    posted_at: Optional[int] = None
    created_at: int

    model_config = {"from_attributes": True}


class ReplyEditRequest(BaseModel):
    """Request model for editing a reply draft."""

    selected_reply: str = Field(description="The selected reply text")


class ReplyApproveRequest(BaseModel):
    """Request model for approving a reply to post."""

    selected_reply: str = Field(description="The reply text to post")


# ============================================================================
# TARGET ACCOUNTS
# ============================================================================


class TargetAccountCreate(BaseModel):
    """Request model for creating a target account."""

    x_username: str = Field(description="Twitter username without @")
    x_user_id: str = Field(description="X platform user ID")
    category: str = Field(
        description="Category: thought_leader, competitor, potential_client, or community"
    )
    engagement_level: str = Field(description="Engagement level: high, medium, or low")


class TargetAccountUpdate(BaseModel):
    """Request model for updating a target account."""

    category: Optional[str] = None
    engagement_level: Optional[str] = None
    is_active: Optional[bool] = None


class TargetAccountResponse(BaseModel):
    """Response model for a target account."""

    id: str
    x_username: str
    x_user_id: str
    category: str
    engagement_level: str
    is_active: bool
    last_checked_at: Optional[int] = None
    created_at: int

    model_config = {"from_attributes": True}


# ============================================================================
# PROMPTS
# ============================================================================


class PromptRegistryEntry(BaseModel):
    """Response model for a prompt registry entry."""

    path: str
    category: str
    required: bool
    last_updated: str
    selection: Optional[str] = None


class PromptRegistryResponse(BaseModel):
    """Response model for the prompt registry."""

    version: str
    prompts: dict[str, PromptRegistryEntry]


# ============================================================================
# PAGINATION
# ============================================================================


class PaginatedResponse(BaseModel):
    """Generic paginated response wrapper."""

    items: list[Any]
    total: int
    page: int
    page_size: int
    has_more: bool


# ============================================================================
# INGESTION
# ============================================================================


from typing import Literal

class ImportResult(BaseModel):
    """Result of importing a single item via Quick Import."""
    input: str
    status: Literal["success", "failed", "duplicate"]
    raw_item_id: Optional[str] = None
    title: Optional[str] = None
    type: Optional[Literal["youtube_video", "article", "x_thread"]] = None
    reason: Optional[str] = None


class ImportRequest(BaseModel):
    """Request body for POST /api/v1/inspire/import."""
    urls: list[str] = []
    x_text: Optional[str] = None
    note: Optional[str] = None

    @field_validator("urls")
    @classmethod
    def validate_urls(cls, v: list[str]) -> list[str]:
        if len(v) > 10:
            raise ValueError("Maximum 10 URLs per request.")
        for url in v:
            if not url.startswith(("http://", "https://")):
                raise ValueError(f"Invalid URL: {url}")
        return v

    @field_validator("x_text")
    @classmethod
    def validate_x_text(cls, v: Optional[str]) -> Optional[str]:
        if v is not None and len(v.strip()) < 20:
            raise ValueError("X text must be at least 20 characters.")
        return v

    def model_post_init(self, __context) -> None:
        if not self.urls and not self.x_text:
            raise ValueError("At least one of 'urls' or 'x_text' must be provided.")


class ImportItemResult(BaseModel):
    """Result for a single imported item."""
    input: str
    status: Literal["success", "failed", "duplicate"]
    raw_item_id: Optional[str] = None
    title: Optional[str] = None
    type: Optional[Literal["youtube_video", "article", "x_thread"]] = None
    reason: Optional[str] = None


class ImportResponse(BaseModel):
    """Response body for POST /api/v1/inspire/import."""
    results: list[ImportItemResult]
    success_count: int
    failed_count: int
    duplicate_count: int


class ImportRequest(BaseModel):
    """Request body for POST /api/v1/inspire/import."""
    urls: list[str] = []
    x_text: Optional[str] = None
    note: Optional[str] = None

    @field_validator("urls")
    @classmethod
    def validate_urls(cls, v: list[str]) -> list[str]:
        if len(v) > 10:
            raise ValueError("Maximum 10 URLs per request.")
        for url in v:
            if not url.startswith(("http://", "https://")):
                raise ValueError(f"Invalid URL: {url}")
        return v

    @field_validator("x_text")
    @classmethod
    def validate_x_text(cls, v: Optional[str]) -> Optional[str]:
        if v is not None and len(v.strip()) < 20:
            raise ValueError("X text must be at least 20 characters.")
        return v

    def model_post_init(self, __context) -> None:
        if not self.urls and not self.x_text:
            raise ValueError("At least one of 'urls' or 'x_text' must be provided.")


class ImportItemResult(BaseModel):
    """Result for a single imported item."""
    input: str
    status: Literal["success", "failed", "duplicate"]
    raw_item_id: Optional[str] = None
    title: Optional[str] = None
    type: Optional[Literal["youtube_video", "article", "x_thread"]] = None
    reason: Optional[str] = None


class ImportResponse(BaseModel):
    """Response body for POST /api/v1/inspire/import."""
    results: list[ImportItemResult]
    success_count: int
    failed_count: int
    duplicate_count: int