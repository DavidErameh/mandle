"""
Mandle API - FastAPI application entry point.

This module initializes the FastAPI application, configures middleware,
and defines the health check endpoint.
"""

from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import get_settings


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan handler for startup and shutdown events."""
    from app.scheduler import scheduler as sched
    from app.scheduler.jobs import get_job_definitions

    sched.start_scheduler()

    for job in get_job_definitions():
        sched.add_job(
            job["func"],
            trigger=job["trigger"],
            id=job["id"],
            name=job["name"],
            replace=True,
        )

    yield
    sched.stop_scheduler()


app = FastAPI(
    title="Mandle API",
    version="1.0",
    description="X Content Automation System",
    lifespan=lifespan,
)

settings = get_settings()
frontend_url = "http://localhost:3000"

app.add_middleware(
    CORSMiddleware,
    allow_origins=[frontend_url, "https://*"],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)

from app.api import feeds, inspire, content, queue, media, replies, targets, pipeline

app.include_router(feeds.router, prefix="/api/v1")
app.include_router(inspire.router, prefix="/api/v1")
app.include_router(content.router, prefix="/api/v1")
app.include_router(queue.router, prefix="/api/v1")
app.include_router(media.router, prefix="/api/v1")
app.include_router(replies.router, prefix="/api/v1")
app.include_router(targets.router, prefix="/api/v1")
app.include_router(pipeline.router, prefix="/api/v1")


@app.get("/api/v1/prompts/registry")
async def get_prompts_registry():
    """Get the prompt registry."""
    import json

    prompts_path = settings.get_prompts_path()
    registry_path = prompts_path / "meta" / "prompt_registry.json"

    result = {
        "prompts_path": str(prompts_path),
        "registry_path": str(registry_path),
        "exists": registry_path.exists()
    }

    if not registry_path.exists():
        return {"version": "unknown", "prompts": {}, "debug": result}

    with open(registry_path, "r", encoding="utf-8") as f:
        return json.load(f)


@app.get("/api/v1/prompts/changelog")
async def get_prompts_changelog():
    """Get the prompts changelog."""
    prompts_path = settings.get_prompts_path()
    changelog_path = prompts_path / "meta" / "changelog.md"

    if not changelog_path.exists():
        return {"content": "No changelog available"}

    with open(changelog_path, "r", encoding="utf-8") as f:
        return {"content": f.read()}


@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "healthy", "service": "mandle-api"}


@app.get("/")
async def root():
    """Root endpoint."""
    return {"message": "Mandle API", "version": "1.0", "docs": "/docs"}