"""
APScheduler job definitions for Mandle backend.

This module defines all scheduled jobs for the content pipeline.
"""

import logging
from typing import Any

from apscheduler.triggers.interval import IntervalTrigger
from apscheduler.triggers.cron import CronTrigger

from app.config import get_settings
from app.services import ingestion_service, extractor_service, reply_service, poster_service
from app.convex_client import queries as convex_queries


logger = logging.getLogger(__name__)


async def ingestion_job() -> dict[str, Any]:
    """
    Scheduled job to run ingestion (fetch RSS and YouTube content).

    Runs every 60 minutes.
    """
    logger.info("Starting scheduled ingestion job")
    try:
        result = await ingestion_service.run_ingestion()
        logger.info(f"Ingestion job completed: {result}")
        return result
    except Exception as e:
        logger.error(f"Ingestion job failed: {e}")
        return {"error": str(e)}


async def extraction_job() -> dict[str, Any]:
    """
    Scheduled job to run extraction (extract brand-relevant points).

    Runs every 30 minutes.
    """
    logger.info("Starting scheduled extraction job")
    try:
        result = await extractor_service.run_extraction()
        logger.info(f"Extraction job completed: {result}")
        return result
    except Exception as e:
        logger.error(f"Extraction job failed: {e}")
        return {"error": str(e)}


async def reply_check_job() -> dict[str, Any]:
    """
    Scheduled job to check target accounts for new tweets.

    Runs every 2 hours.
    """
    logger.info("Starting scheduled reply check job")
    
    try:
        # Check if reply system is enabled
        config = convex_queries.get_system_config("REPLIES_ENABLED")
        if config and config.get("value") == "false":
            logger.info("Reply system paused (REPLIES_ENABLED = false)")
            return {"status": "paused", "reason": "REPLIES_ENABLED is false"}
        
        # Continue with normal execution
        result = await reply_service.check_target_accounts()
        logger.info(f"Reply check job completed: {result}")
        return result
    except Exception as e:
        logger.error(f"Reply check job failed: {e}")
        return {"error": str(e)}


async def post_job() -> dict[str, Any]:
    """
    Scheduled job to process due posts from the queue.

    Runs every 5 minutes.
    """
    logger.info("Starting scheduled post job")
    try:
        result = await poster_service.process_due_posts()
        logger.info(f"Post job completed: {result}")
        return result
    except Exception as e:
        logger.error(f"Post job failed: {e}")
        return {"error": str(e)}


async def daily_counter_reset_job() -> dict[str, Any]:
    """
    Scheduled job to reset the daily post counter.

    Runs daily at midnight in the configured timezone.
    """
    logger.info("Starting scheduled daily counter reset")
    try:
        settings = get_settings()
        logger.info(
            f"Daily counter reset at midnight in timezone {settings.timezone}"
        )
        return {"status": "reset", "timezone": settings.timezone}
    except Exception as e:
        logger.error(f"Daily counter reset failed: {e}")
        return {"error": str(e)}


def get_job_definitions() -> list[dict[str, Any]]:
    """
    Get all job definitions for registration.

    Returns:
        List of job config dicts with id, func, and trigger.
    """
    return [
        {
            "id": "ingestion_job",
            "func": ingestion_job,
            "trigger": IntervalTrigger(minutes=60),
            "name": "RSS and YouTube ingestion",
        },
        {
            "id": "extraction_job",
            "func": extraction_job,
            "trigger": IntervalTrigger(minutes=30),
            "name": "Brand-relevant point extraction",
        },
        {
            "id": "reply_check_job",
            "func": reply_check_job,
            "trigger": IntervalTrigger(hours=2),
            "name": "Target account reply check",
        },
        {
            "id": "post_job",
            "func": post_job,
            "trigger": IntervalTrigger(minutes=5),
            "name": "Process queued posts",
        },
        {
            "id": "daily_counter_reset",
            "func": daily_counter_reset_job,
            "trigger": CronTrigger(hour=0, minute=0),
            "name": "Daily post counter reset",
        },
    ]