"""
Configuration module for Mandle backend.

Loads environment variables using Pydantic Settings and provides them to the application.
"""

from functools import lru_cache
from pathlib import Path

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    model_config = SettingsConfigDict(
        env_file=str(Path(__file__).parent.parent / ".env"),
        env_file_encoding="utf-8"
    )

    convex_url: str = Field(default="")
    convex_deploy_key: str = Field(default="")
    groq_api_key: str = Field(default="")
    x_api_key: str = Field(default="")
    x_api_secret: str = Field(default="")
    x_access_token: str = Field(default="")
    x_access_token_secret: str = Field(default="")
    x_bearer_token: str = Field(default="")
    cloudinary_cloud_name: str = Field(default="")
    cloudinary_api_key: str = Field(default="")
    cloudinary_api_secret: str = Field(default="")
    youtube_api_key: str = Field(default="")
    twitterapi_io_key: str = Field(default="")
    internal_api_key: str = Field(default="")
    prompts_dir: str = Field(default="./prompts")
    max_daily_posts: int = Field(default=20)
    posting_window_start: str = Field(default="07:00")
    posting_window_end: str = Field(default="22:00")
    timezone: str = Field(default="Africa/Lagos")
    min_post_gap_minutes: int = Field(default=30)
    min_reply_engagement: int = Field(default=5)

    def get_prompts_path(self) -> Path:
        """Get the prompts directory as an absolute path."""
        return Path(__file__).parent.parent.parent / "prompts"


@lru_cache
def get_settings() -> Settings:
    """Get cached settings instance."""
    return Settings()