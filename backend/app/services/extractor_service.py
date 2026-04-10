"""
Extractor Service - Point extraction from raw content.

This service implements Stage 2 of the pipeline: extracting brand-relevant
points from raw items using AI with the fast model.
"""

import logging
import json
import re
from typing import Any, Optional

from app.config import get_settings
from app.convex_client import queries
from app.prompt_engine.loader import PromptLoader
from app.prompt_engine.assembler import PromptAssembler
from app.utils.groq_client import (
    call_groq,
    FAST_MODEL,
    GroqAPIError,
    GroqJSONParseError,
)
from app.utils.helpers import utc_now


logger = logging.getLogger(__name__)


MAX_TOKENS = 4000


def _count_tokens(text: str) -> int:
    """Approximate token count (chars / 4)."""
    return len(text) // 4


def _truncate_to_tokens(text: str, max_tokens: int) -> str:
    """Truncate text to approximately max_tokens."""
    if _count_tokens(text) <= max_tokens:
        return text

    chars = max_tokens * 4
    return text[: chars - 100] + "\n\n[Truncated for processing]"


def _parse_extraction_response(content: str) -> list[dict[str, Any]]:
    """Parse the JSON extraction response."""
    content = content.strip()

    if content.startswith("```json"):
        content = content[7:]
    if content.startswith("```"):
        content = content[3:]
    if content.endswith("```"):
        content = content[:-3]
    content = content.strip()

    try:
        data = json.loads(content)
    except json.JSONDecodeError as e:
        logger.error(f"Failed to parse extraction JSON: {e}")
        return []

    if isinstance(data, dict):
        if "points" in data:
            return data["points"]
        elif "extracted_points" in data:
            return data["extracted_points"]
        elif "items" in data:
            return data["items"]
        return [data]
    elif isinstance(data, list):
        return data

    return []


def _assemble_prompt() -> str:
    """Assemble the extraction prompt using the prompt engine."""
    settings = get_settings()
    prompts_path = settings.get_prompts_path()

    loader = PromptLoader(prompts_path)
    assembler = PromptAssembler(loader)

    return assembler.assemble("extraction")


async def _extract_points(raw_item: dict[str, Any]) -> int:
    """Extract points from a single raw item."""
    raw_text = raw_item.get("rawText", "")
    raw_item_id = raw_item.get("id", "")

    if not raw_text:
        logger.warning(f"Raw item {raw_item_id} has no text, skipping")
        return 0

    truncated_text = _truncate_to_tokens(raw_text, MAX_TOKENS)

    system_prompt = _assemble_prompt()
    user_message = f"""Extract brand-relevant points from the following content:

{truncated_text}

Return a JSON array of extracted points, each with:
- text: The extracted text (1-3 sentences)
- type: "mechanism" | "intersection" | "data" | "failure" | "gap" | "translation" | "contrarian"
- source_lens: "trending_tech" | "design_craft" | "raw_practitioner" | "unfiltered_opinion" | "general"
- relevance_score: 1-10 (only include 7+)
- translation_path: One sentence describing the connection to Dave's window
- suggested_angle: A suggested content angle for this point
"""

    try:
        response = call_groq(
            model=FAST_MODEL,
            system_prompt=system_prompt,
            user_message=user_message,
            response_format={"type": "json_object"},
        )
    except GroqAPIError as e:
        logger.error(f"Groq API error during extraction: {e}")
        return 0
    except GroqJSONParseError as e:
        logger.error(f"JSON parse error during extraction: {e}")
        return 0
    except Exception as e:
        logger.error(f"Unexpected error during extraction: {e}")
        return 0

    points = _parse_extraction_response(response)
    if not points:
        logger.warning(f"No points parsed from raw item {raw_item_id}")
        return 0

    stored_count = 0
    for point in points:
        relevance_val = point.get("relevance_score", point.get("relevanceScore", 0))
        try:
            relevance = int(relevance_val)
        except (ValueError, TypeError):
            relevance = 0

        if relevance < 7:
            logger.debug(f"Skipping point with relevance {relevance} (< 7)")
            continue

        text = point.get("text", "")
        point_type = point.get("type", "mechanism")
        angle = point.get("suggested_angle", point.get("suggestedAngle", ""))
        source_lens = point.get("source_lens", point.get("sourceLens", "general"))
        translation_path = point.get("translation_path", point.get("translationPath", ""))

        if not text:
            continue

        try:
            queries.create_point(
                raw_item_id=raw_item_id,
                text=text,
                point_type=point_type,
                relevance_score=int(relevance),
                suggested_angle=angle,
                source_lens=source_lens,
                translation_path=translation_path,
            )
            stored_count += 1
        except Exception as e:
            logger.error(f"Failed to create extracted point: {e}")

    logger.info(f"Extracted {stored_count} points from raw item {raw_item_id}")
    return stored_count


async def run_extraction() -> dict[str, Any]:
    """
    Run the full extraction job for all unprocessed raw items.

    Returns:
        A dict with counts of items processed and points extracted.
    """
    logger.info("Starting extraction job")

    unprocessed_items = queries.get_unprocessed_items()

    if not unprocessed_items:
        logger.info("No unprocessed raw items to extract")
        return {"processed": 0, "points_extracted": 0}

    logger.info(f"Found {len(unprocessed_items)} unprocessed raw items")

    total_points = 0
    processed_count = 0

    for raw_item in unprocessed_items:
        try:
            points_count = await _extract_points(raw_item)
            total_points += points_count

            queries.mark_item_processed(raw_item.get("id"))
            processed_count += 1

        except Exception as e:
            logger.error(f"Failed to process raw item {raw_item.get('id')}: {e}")

    logger.info(
        f"Extraction job completed. Processed: {processed_count}, Points: {total_points}"
    )

    return {"processed": processed_count, "points_extracted": total_points}