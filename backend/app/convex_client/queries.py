"""
Convex query and mutation wrappers for Mandle backend.

This module provides named wrapper functions for all Convex query and mutation
calls, centralized in one place with proper type hints. Services should import
from this module rather than calling raw Convex function strings.
"""

from typing import Any, Optional

from .client import get_client


# ============================================================================
# FEEDS
# ============================================================================

def get_all_feeds() -> list[dict[str, Any]]:
    """Get all feed sources."""
    return get_client().query("feeds:getAll")


def get_active_feeds() -> list[dict[str, Any]]:
    """Get all active feed sources."""
    return get_client().query("feeds:getActive")


def create_feed(
    feed_name: str,
    feed_type: str,
    url: str,
    is_active: bool,
    fetch_interval_minutes: int
) -> Any:
    """Create a new feed source."""
    return get_client().mutation(
        "feeds:create",
        name=feed_name,
        type=feed_type,
        url=url,
        isActive=is_active,
        fetchIntervalMinutes=fetch_interval_minutes
    )


def update_feed(
    id: str,
    name: Optional[str] = None,
    feed_type: Optional[str] = None,
    url: Optional[str] = None,
    is_active: Optional[bool] = None,
    fetch_interval_minutes: Optional[int] = None
) -> None:
    """Update an existing feed source."""
    updates: dict[str, Any] = {"id": id}
    if name is not None:
        updates["name"] = name
    if feed_type is not None:
        updates["type"] = feed_type
    if url is not None:
        updates["url"] = url
    if is_active is not None:
        updates["isActive"] = is_active
    if fetch_interval_minutes is not None:
        updates["fetchIntervalMinutes"] = fetch_interval_minutes
    get_client().mutation("feeds:update", **updates)


def remove_feed(id: str) -> None:
    """Remove a feed source."""
    get_client().mutation("feeds:remove", id=id)


def update_feed_last_fetched(id: str, last_fetched_at: int) -> None:
    """Update the last fetched timestamp for a feed."""
    get_client().mutation("feeds:updateLastFetched", id=id, lastFetchedAt=last_fetched_at)


def get_manual_source_id() -> Optional[str]:
    """Get the Convex ID of the static Manual Import feedSource."""
    return get_client().query("feeds:getManualSourceId")


# ============================================================================
# RAW ITEMS
# ============================================================================

def get_unprocessed_items() -> list[dict[str, Any]]:
    """Get all unprocessed raw items."""
    return get_client().query("rawItems:getUnprocessed")


def create_raw_item(
    source_id: str,
    external_id: str,
    title: str,
    raw_text: str,
    published_at: int,
    import_note: Optional[str] = None
) -> Any:
    """Create a new raw item."""
    from datetime import datetime, timezone
    args = {
        "sourceId": source_id,
        "externalId": external_id,
        "title": title,
        "rawText": raw_text,
        "publishedAt": published_at,
        "ingestedAt": int(datetime.now(timezone.utc).timestamp() * 1000)
    }
    if import_note is not None:
        args["importNote"] = import_note
    return get_client().mutation("rawItems:create", **args)


def mark_item_processed(id: str) -> None:
    """Mark a raw item as processed."""
    get_client().mutation("rawItems:markProcessed", id=id)


def get_items_by_source(source_id: str) -> list[dict[str, Any]]:
    """Get all raw items for a specific source."""
    return get_client().query("rawItems:getBySource", sourceId=source_id)


def get_item_by_external_id(external_id: str) -> Optional[dict[str, Any]]:
    """Get a raw item by external ID."""
    return get_client().query("rawItems:getByExternalId", externalId=external_id)


def raw_item_exists_by_external_id(external_id: str) -> bool:
    """Check if a raw item with this externalId already exists."""
    return get_client().query("rawItems:existsByExternalId", externalId=external_id)


# ============================================================================
# EXTRACTED POINTS
# ============================================================================

def get_unused_points() -> list[dict[str, Any]]:
    """Get all unused extracted points."""
    return get_client().query("extractedPoints:getUnused")


def create_point(
    raw_item_id: str,
    text: str,
    point_type: str,
    relevance_score: int,
    suggested_angle: str
) -> Any:
    """Create a new extracted point."""
    return get_client().mutation(
        "extractedPoints:create",
        rawItemId=raw_item_id,
        text=text,
        type=point_type,
        relevanceScore=relevance_score,
        suggestedAngle=suggested_angle
    )


def mark_point_used(id: str) -> None:
    """Mark an extracted point as used in generation."""
    get_client().mutation("extractedPoints:markUsed", id=id)


def get_points_by_score(min_score: int) -> list[dict[str, Any]]:
    """Get extracted points by minimum relevance score."""
    return get_client().query("extractedPoints:getByScore", {"minScore": min_score})


# ============================================================================
# CONTENT DRAFTS
# ============================================================================

def get_pending_drafts() -> list[dict[str, Any]]:
    """Get all drafts pending human review."""
    return get_client().query("contentDrafts:getPending")


def create_draft(
    extracted_point_id: str,
    variation_number: int,
    content_text: str,
    hook_used: str,
    format_used: str,
    char_count: int
) -> Any:
    """Create a new content draft."""
    return get_client().mutation(
        "contentDrafts:create",
        extractedPointId=extracted_point_id,
        variationNumber=variation_number,
        contentText=content_text,
        hookUsed=hook_used,
        formatUsed=format_used,
        charCount=char_count
    )


def update_draft_review(
    id: str,
    brand_score: int,
    reviewer_approved: bool,
    rule_violations: list[str],
    suggested_edits: list[str]
) -> None:
    """Update draft with AI review results."""
    get_client().mutation(
        "contentDrafts:updateReview",
        id=id,
        brandScore=brand_score,
        reviewerApproved=reviewer_approved,
        ruleViolations=rule_violations,
        suggestedEdits=suggested_edits
    )


def update_draft_human_status(
    id: str,
    status: str,
    final_content: Optional[str] = None
) -> None:
    """Update draft human review status."""
    get_client().mutation(
        "contentDrafts:updateHumanStatus",
        id=id,
        humanStatus=status,
        finalContent=final_content
    )


def set_draft_media(id: str, media_asset_id: str) -> None:
    """Attach a media asset to a draft."""
    get_client().mutation("contentDrafts:setMedia", id=id, mediaAssetId=media_asset_id)


def set_draft_final_content(id: str, final_content: str) -> None:
    """Set the final content for a draft after human editing."""
    get_client().mutation("contentDrafts:setFinalContent", id=id, finalContent=final_content)


def get_drafts_by_point(extracted_point_id: str) -> list[dict[str, Any]]:
    """Get all drafts for a specific extracted point."""
    return get_client().query("contentDrafts:getByPoint", extractedPointId=extracted_point_id)


def get_draft_by_id(id: str) -> Optional[dict[str, Any]]:
    """Get a single draft by ID."""
    return get_client().query("contentDrafts:getById", id=id)


# ============================================================================
# POST QUEUE
# ============================================================================

def get_due_posts(before_timestamp: int) -> list[dict[str, Any]]:
    """Get posts due to be posted before the given timestamp."""
    return get_client().query("postQueue:getDue", beforeTimestamp=before_timestamp)


def get_queued_posts() -> list[dict[str, Any]]:
    """Get all queued posts."""
    return get_client().query("postQueue:getQueued")


def create_queue_item(
    draft_id: str,
    scheduled_at: int,
    post_type: str,
    community_id: Optional[str] = None
) -> Any:
    """Create a new queue item."""
    return get_client().mutation(
        "postQueue:create",
        draftId=draft_id,
        scheduledAt=scheduled_at,
        postType=post_type,
        communityId=community_id
    )


def update_queue_status(
    id: str,
    status: str,
    x_post_id: Optional[str] = None,
    posted_at: Optional[int] = None,
    error_message: Optional[str] = None
) -> None:
    """Update queue item status."""
    get_client().mutation(
        "postQueue:updateStatus",
        id=id,
        status=status,
        xPostId=x_post_id,
        postedAt=posted_at,
        errorMessage=error_message
    )


def get_daily_post_count(date: int) -> int:
    """Get the number of posts for a given date."""
    return get_client().query("postQueue:getDailyCount", date=date)


def cancel_queue_item(id: str) -> None:
    """Cancel a queued post."""
    get_client().mutation("postQueue:cancel", id=id)


def get_queue_item_by_id(id: str) -> Optional[dict[str, Any]]:
    """Get a single queue item by ID."""
    return get_client().query("postQueue:getById", id=id)


# ============================================================================
# MEDIA ASSETS
# ============================================================================

def get_all_media() -> list[dict[str, Any]]:
    """Get all media assets."""
    return get_client().query("mediaAssets:getAll")


def get_media_by_tag(tag: str) -> list[dict[str, Any]]:
    """Get media assets by tag."""
    return get_client().query("mediaAssets:getByTag", tag=tag)


def create_media(
    cloudinary_public_id: str,
    url: str,
    tags: list[str],
    width: int,
    height: int
) -> Any:
    """Create a new media asset."""
    return get_client().mutation(
        "mediaAssets:create",
        cloudinaryPublicId=cloudinary_public_id,
        url=url,
        tags=tags,
        width=width,
        height=height
    )


def remove_media(id: str) -> None:
    """Remove a media asset."""
    get_client().mutation("mediaAssets:remove", id=id)


# ============================================================================
# TARGET ACCOUNTS
# ============================================================================

def get_active_targets() -> list[dict[str, Any]]:
    """Get all active target accounts."""
    return get_client().query("targetAccounts:getActive")


def create_target(
    x_username: str,
    x_user_id: str,
    category: str,
    engagement_level: str
) -> Any:
    """Create a new target account."""
    return get_client().mutation(
        "targetAccounts:create",
        xUsername=x_username,
        xUserId=x_user_id,
        category=category,
        engagementLevel=engagement_level
    )


def update_target(
    id: str,
    category: Optional[str] = None,
    engagement_level: Optional[str] = None,
    is_active: Optional[bool] = None
) -> None:
    """Update a target account."""
    updates: dict[str, Any] = {"id": id}
    if category is not None:
        updates["category"] = category
    if engagement_level is not None:
        updates["engagementLevel"] = engagement_level
    if is_active is not None:
        updates["isActive"] = is_active
    get_client().mutation("targetAccounts:update", **updates)


def remove_target(id: str) -> None:
    """Remove a target account."""
    get_client().mutation("targetAccounts:remove", id=id)


def update_target_last_checked(id: str, last_checked_at: int) -> None:
    """Update the last checked timestamp for a target."""
    get_client().mutation("targetAccounts:updateLastChecked", id=id, lastCheckedAt=last_checked_at)


def get_all_targets() -> list[dict[str, Any]]:
    """Get all target accounts (active and inactive)."""
    return get_client().query("targetAccounts:getAll")


# ============================================================================
# REPLY DRAFTS
# ============================================================================

def get_pending_replies() -> list[dict[str, Any]]:
    """Get all reply drafts pending human review."""
    return get_client().query("replyDrafts:getPending")


def create_reply(
    target_account_id: str,
    source_tweet_id: str,
    source_tweet_text: str,
    reply_agree_extend: str,
    reply_contrarian: str,
    reply_curiosity_hook: str
) -> Any:
    """Create a new reply draft."""
    return get_client().mutation(
        "replyDrafts:create",
        targetAccountId=target_account_id,
        sourceTweetId=source_tweet_id,
        sourceTweetText=source_tweet_text,
        replyAgreeExtend=reply_agree_extend,
        replyContrarian=reply_contrarian,
        replyCuriosityHook=reply_curiosity_hook
    )


def update_reply_status(id: str, status: str) -> None:
    """Update reply draft status."""
    get_client().mutation("replyDrafts:updateStatus", id=id, humanStatus=status)


def set_selected_reply(id: str, selected_reply: str) -> None:
    """Set the selected reply text for a draft."""
    get_client().mutation("replyDrafts:setSelected", id=id, selectedReply=selected_reply)


def get_replies_by_account(target_account_id: str) -> list[dict[str, Any]]:
    """Get all reply drafts for a specific target account."""
    return get_client().query("replyDrafts:getByAccount", targetAccountId=target_account_id)


# ============================================================================
# POST PERFORMANCE
# ============================================================================

def create_performance(
    queue_id: str,
    x_post_id: str,
    impressions: Optional[int] = None,
    likes: Optional[int] = None,
    reposts: Optional[int] = None,
    replies_count: Optional[int] = None
) -> Any:
    """Create a new performance record."""
    return get_client().mutation(
        "postPerformance:create",
        queueId=queue_id,
        xPostId=x_post_id,
        impressions=impressions,
        likes=likes,
        reposts=reposts,
        repliesCount=replies_count
    )


def get_performance_by_queue(queue_id: str) -> Optional[dict[str, Any]]:
    """Get performance data for a specific queue item."""
    return get_client().query("postPerformance:getByQueue", queueId=queue_id)


# ============================================================================
# SYSTEM CONFIG
# ============================================================================

def get_system_config(key: str) -> Optional[dict[str, Any]]:
    """Get a system config value by key."""
    return get_client().query("systemConfig:get", key=key)


def set_system_config(key: str, value: str) -> None:
    """Set a system config value."""
    get_client().mutation("systemConfig:set", key=key, value=value)


def get_all_system_config() -> list[dict[str, Any]]:
    """Get all system config entries."""
    return get_client().query("systemConfig:getAll")