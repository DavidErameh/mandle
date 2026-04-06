"""
APScheduler configuration for Mandle backend.

This module configures and manages the APScheduler instance for running
background pipeline jobs (ingestion, extraction, reply checking, posting).
"""

import logging
from typing import Optional

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.schedulers.base import STATE_STOPPED


logger = logging.getLogger(__name__)

_scheduler: Optional[AsyncIOScheduler] = None


def get_scheduler() -> AsyncIOScheduler:
    """Get the global scheduler instance."""
    global _scheduler
    if _scheduler is None:
        _scheduler = AsyncIOScheduler(
            job_defaults={
                "coalesce": True,
                "max_instances": 1,
                "misfire_grace_time": 60,
            },
        )
    return _scheduler


def start_scheduler() -> None:
    """Start the APScheduler."""
    scheduler = get_scheduler()

    if scheduler.state == STATE_STOPPED:
        scheduler.start()
        logger.info("APScheduler started successfully")
    else:
        logger.warning("APScheduler is already running")


def stop_scheduler() -> None:
    """Stop the APScheduler gracefully."""
    scheduler = get_scheduler()

    if scheduler.state != STATE_STOPPED:
        scheduler.shutdown(wait=True)
        logger.info("APScheduler stopped successfully")
    else:
        logger.debug("APScheduler was not running")


def add_job(
    func,
    trigger: str,
    **kwargs,
) -> Optional[str]:
    """
    Add a job to the scheduler.

    Args:
        func: The function to execute.
        trigger: The trigger type ('interval', 'cron', 'date').
        **kwargs: Additional trigger arguments.

    Returns:
        The job ID, or None if failed.
    """
    scheduler = get_scheduler()

    try:
        job = scheduler.add_job(func, trigger=trigger, **kwargs)
        logger.info(f"Added job: {job.id}")
        return job.id
    except Exception as e:
        logger.error(f"Failed to add job: {e}")
        return None


def remove_job(job_id: str) -> bool:
    """
    Remove a job from the scheduler.

    Args:
        job_id: The ID of the job to remove.

    Returns:
        True if removed, False if not found.
    """
    scheduler = get_scheduler()

    try:
        scheduler.remove_job(job_id)
        logger.info(f"Removed job: {job_id}")
        return True
    except Exception as e:
        logger.warning(f"Failed to remove job {job_id}: {e}")
        return False