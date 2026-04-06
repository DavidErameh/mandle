"""
PromptLoader - Loads individual prompt files from disk based on the prompt registry.

The PromptLoader reads the prompt_registry.json to discover available prompt files,
then provides methods to load them by name or category. This is the foundation
of the prompt engine that powers the content generation pipeline.
"""

import json
from pathlib import Path
from typing import Dict


class PromptLoader:
    """Loads prompt markdown files from disk based on the registry."""

    def __init__(self, prompts_dir: Path) -> None:
        """
        Initialize the PromptLoader.

        Args:
            prompts_dir: Path to the prompts/ folder containing prompt files.
        """
        self._prompts_dir = prompts_dir
        self._registry = self._load_registry()

    def _load_registry(self) -> Dict:
        """Load and parse the prompt_registry.json file."""
        registry_path = self._prompts_dir / "meta" / "prompt_registry.json"
        try:
            with open(registry_path, "r", encoding="utf-8") as f:
                return json.load(f)
        except FileNotFoundError:
            raise FileNotFoundError(
                f"Prompt registry not found at {registry_path}. "
                "Ensure prompts/meta/prompt_registry.json exists."
            )
        except json.JSONDecodeError as e:
            raise ValueError(f"Invalid JSON in prompt registry: {e}")

    def _resolve_path(self, relative_path: str) -> Path:
        """Resolve the prompt file path, handling the prompts_dir as the base."""
        # The registry paths are relative to prompts folder, e.g., "prompts/brand/brand_voice.md"
        # We need to strip the "prompts/" prefix since prompts_dir already points to prompts/
        if relative_path.startswith("prompts/"):
            relative_path = relative_path[8:]  # Remove "prompts/" (8 chars)
        return self._prompts_dir / relative_path

    def load(self, name: str) -> str:
        """
        Load a single prompt file by name.

        Args:
            name: The prompt name (e.g., "brand_voice").

        Returns:
            The content of the prompt file as a string.

        Raises:
            ValueError: If the prompt name doesn't exist in the registry.
            FileNotFoundError: If the prompt file doesn't exist on disk.
        """
        prompts = self._registry.get("prompts", {})
        if name not in prompts:
            raise ValueError(
                f"Prompt '{name}' not found in registry. "
                f"Available prompts: {list(prompts.keys())}"
            )

        prompt_path = self._resolve_path(prompts[name]["path"])
        try:
            with open(prompt_path, "r", encoding="utf-8") as f:
                return f.read()
        except FileNotFoundError:
            raise FileNotFoundError(
                f"Prompt file not found at {prompt_path}. "
                f"Check that the file exists at the path specified in the registry."
            )

    def load_all(self, category: str) -> Dict[str, str]:
        """
        Load all prompt files in a given category.

        Args:
            category: The category name (e.g., "brand", "system", "guidelines").

        Returns:
            A dict mapping prompt names to their contents.
        """
        result = {}
        prompts = self._registry.get("prompts", {})

        for name, info in prompts.items():
            if info.get("category") == category:
                result[name] = self.load(name)

        return result

    def exists(self, name: str) -> bool:
        """
        Check if a prompt exists in the registry.

        Args:
            name: The prompt name to check.

        Returns:
            True if the prompt exists in the registry, False otherwise.
        """
        return name in self._registry.get("prompts", {})