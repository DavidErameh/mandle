"""
PromptRegistry - Reads and validates prompt_registry.json metadata.

The PromptRegistry provides access to prompt file metadata including paths,
categories, required flags, and last_updated timestamps. It also validates
that referenced files exist on disk.
"""

import json
import warnings
from pathlib import Path
from typing import Any


class PromptRegistry:
    """Manages prompt registry metadata and validation."""

    def __init__(self, registry_path: Path) -> None:
        """
        Initialize the PromptRegistry.

        Args:
            registry_path: Path to the prompt_registry.json file.

        Raises:
            FileNotFoundError: If the registry file doesn't exist.
            ValueError: If the registry JSON is invalid.
        """
        self._registry_path = registry_path
        self._data = self._load_registry()

    def _load_registry(self) -> dict[str, Any]:
        """Load and parse the registry JSON file."""
        try:
            with open(self._registry_path, "r", encoding="utf-8") as f:
                data = json.load(f)
        except FileNotFoundError:
            raise FileNotFoundError(f"Prompt registry not found at {self._registry_path}")
        except json.JSONDecodeError as e:
            raise ValueError(f"Invalid JSON in prompt registry: {e}")

        self._validate_files(data)
        return data

    def _validate_files(self, data: dict[str, Any]) -> None:
        """Check that all referenced prompt files exist, warn on missing."""
        prompts = data.get("prompts", {})
        prompts_dir = self._registry_path.parent.parent

        for name, info in prompts.items():
            path = info.get("path", "")
            if path.startswith("prompts/"):
                path = path[8:]

            full_path = prompts_dir / path
            if not full_path.exists():
                warnings.warn(
                    f"Prompt '{name}' references missing file: {full_path}",
                    UserWarning
                )

    def get(self, name: str) -> dict[str, Any]:
        """
        Get metadata for a specific prompt by name.

        Args:
            name: The prompt name (e.g., "brand_voice").

        Returns:
            A dict with path, category, required, and last_updated.

        Raises:
            KeyError: If the prompt name doesn't exist in the registry.
        """
        prompts = self._data.get("prompts", {})
        if name not in prompts:
            raise KeyError(f"Prompt '{name}' not found in registry")
        return prompts[name]

    def get_all(self) -> dict[str, Any]:
        """
        Get all prompts from the registry.

        Returns:
            A dict mapping prompt names to their metadata.
        """
        return self._data.get("prompts", {})

    def get_by_category(self, category: str) -> dict[str, Any]:
        """
        Get all prompts in a specific category.

        Args:
            category: The category name (e.g., "brand", "system").

        Returns:
            A dict mapping prompt names to their metadata, filtered by category.
        """
        prompts = self._data.get("prompts", {})
        return {
            name: info
            for name, info in prompts.items()
            if info.get("category") == category
        }

    def get_required(self) -> list[str]:
        """
        Get names of all prompts marked as required.

        Returns:
            A list of prompt names where required=true.
        """
        prompts = self._data.get("prompts", {})
        return [
            name
            for name, info in prompts.items()
            if info.get("required", False) is True
        ]

    @property
    def version(self) -> str:
        """Get the registry version string."""
        return self._data.get("version", "unknown")