"""
PromptAssembler - Assembles stage-specific complete prompts from ordered file recipes.

The PromptAssembler uses the PromptLoader to fetch individual prompt files and
concatenates them in the correct order for each pipeline stage (extraction,
generation, review, reply). It also handles random sampling for example files
to ensure variety in generation.
"""

import random
import re
from typing import Protocol

from .loader import PromptLoader


class PromptLoaderProtocol(Protocol):
    """Protocol for PromptLoader to enable type hints without circular imports."""

    def load(self, name: str) -> str: ...
    def exists(self, name: str) -> bool: ...


class PromptAssembler:
    """Assembles complete prompts for each pipeline stage."""

    RECIPES: dict[str, list[str]] = {
        "extraction": [
            "extractor_system",
            "niche_context",
            "offer_context",
        ],
        "generation": [
            "generator_system",
            "brand_voice",
            "brand_rules",
            "hook_templates",
            "format_templates",
            "writing_guidelines",
            "structuring_guide",
            "cta_patterns",
            "user_stories",  # Random 2-3
            "best_posts",    # Random 2
        ],
        "review": [
            "reviewer_system",
            "brand_voice",
            "brand_rules",
            "bad_examples",
        ],
        "reply": [
            "reply_system",
            "brand_voice",
            "brand_rules",
            "cta_patterns",
        ],
    }

    RANDOM_COUNTS: dict[str, tuple[int, int]] = {
        "user_stories": (2, 3),
        "best_posts": (2, 2),
    }

    def __init__(self, loader: PromptLoaderProtocol) -> None:
        """
        Initialize the PromptAssembler.

        Args:
            loader: A PromptLoader instance for loading individual prompt files.
        """
        self._loader = loader
        self._random.seed(42)

    @property
    def _random(self) -> random.Random:
        if not hasattr(self, "_random_instance"):
            self._random_instance = random.Random()
        return self._random_instance

    @_random.setter
    def _random(self, value: random.Random) -> None:
        self._random_instance = value

    def _extract_entries(self, content: str) -> list[str]:
        """
        Extract individual entries from a prompt file separated by ## headers.

        Args:
            content: The full content of a prompt file.

        Returns:
            A list of individual entry strings.
        """
        pattern = r"(?=^##\s+.+$)"
        parts = re.split(pattern, content, flags=re.MULTILINE)
        entries = []
        for part in parts:
            stripped = part.strip()
            if stripped:
                entries.append(stripped)
        return entries

    def _load_with_random(self, name: str) -> str:
        """
        Load a prompt file, applying random sampling if configured.

        Args:
            name: The prompt name.

        Returns:
            The loaded content, possibly with random sampling applied.
        """
        if name not in self.RANDOM_COUNTS:
            return self._loader.load(name)

        min_count, max_count = self.RANDOM_COUNTS[name]
        content = self._loader.load(name)

        lines = content.split("\n")
        header_line_idx = None
        for i, line in enumerate(lines):
            if line.strip().startswith("#") and not line.strip().startswith("##"):
                header_line_idx = i
                break

        header = ""
        if header_line_idx is not None:
            header = "\n".join(lines[:header_line_idx]) + "\n\n"

        entries = self._extract_entries(content)
        num_to_select = self._random.randint(min_count, max_count)
        selected = self._random.sample(entries, min(num_to_select, len(entries)))

        return header + "\n\n---\n\n".join(selected)

    def assemble(self, stage: str) -> str:
        """
        Assemble a complete prompt for a given pipeline stage.

        Args:
            stage: The stage name (extraction, generation, review, reply).

        Returns:
            The assembled prompt string with all files concatenated.

        Raises:
            ValueError: If the stage is unknown.
        """
        if stage not in self.RECIPES:
            raise ValueError(
                f"Unknown stage '{stage}'. Available stages: {list(self.RECIPES.keys())}"
            )

        files = self.RECIPES[stage]
        parts = []

        for file_name in files:
            content = self._load_with_random(file_name)
            parts.append(content)

        return "\n\n---\n\n".join(parts)

    def get_recipe(self, stage: str) -> list[str]:
        """
        Get the list of files for a given stage.

        Args:
            stage: The stage name.

        Returns:
            A list of file names in the recipe order.

        Raises:
            ValueError: If the stage is unknown.
        """
        if stage not in self.RECIPES:
            raise ValueError(
                f"Unknown stage '{stage}'. Available stages: {list(self.RECIPES.keys())}"
            )
        return self.RECIPES[stage].copy()