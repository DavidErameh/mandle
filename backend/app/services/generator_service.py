"""
Generator Service - Content generation from extracted points.

This service implements Stage 3 of the pipeline: generating 3 content
variations per extracted point using the writing model.
"""

import logging
import json
from typing import Any, Optional

from app.config import get_settings
from app.convex_client import queries
from app.prompt_engine.loader import PromptLoader
from app.prompt_engine.assembler import PromptAssembler
from app.utils.groq_client import (
    call_groq,
    WRITING_MODEL,
    GroqAPIError,
    GroqJSONParseError,
)
from app.utils.helpers import utc_now


logger = logging.getLogger(__name__)


def _parse_generation_response(content: str) -> list[dict[str, Any]]:
    """Parse the JSON generation response with 3 variations."""
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
        logger.error(f"Failed to parse generation JSON: {e}")
        return []

    if isinstance(data, dict):
        if "variations" in data:
            return data["variations"]
        elif "options" in data:
            return data["options"]
        return []
    elif isinstance(data, list):
        return data[:3]

    return []


def _assemble_prompt() -> str:
    """Assemble the generation prompt using the prompt engine."""
    settings = get_settings()
    prompts_path = settings.get_prompts_path()

    loader = PromptLoader(prompts_path)
    assembler = PromptAssembler(loader)

    return assembler.assemble("generation")


async def _generate_content(point: dict[str, Any]) -> int:
    """Generate 3 content variations from a single extracted point."""
    point_text = point.get("text", "")
    point_id = point.get("id", "")
    suggested_angle = point.get("suggestedAngle", "")

    if not point_text:
        logger.warning(f"Extracted point {point_id} has no text, skipping")
        return 0

    system_prompt = _assemble_prompt()
    user_message = f"""Generate 3 X (Twitter) post variations from the following extracted point:

Point: {point_text}
Suggested Angle: {suggested_angle}

Return a JSON array with 3 variations, each containing:
- variation_number: 1, 2, or 3
- hook_used: The hook template used
- format_used: The format template used
- content_text: The full post content
- suggested_cta: A suggested call-to-action
- char_count: Character count of the content
"""

    try:
        response = call_groq(
            model=WRITING_MODEL,
            system_prompt=system_prompt,
            user_message=user_message,
            response_format={"type": "json_object"},
            temperature=0.8,
            max_tokens=3000,
        )
    except GroqAPIError as e:
        logger.error(f"Groq API error during generation: {e}")
        return 0
    except GroqJSONParseError as e:
        logger.error(f"JSON parse error during generation: {e}")
        return 0
    except Exception as e:
        logger.error(f"Unexpected error during generation: {e}")
        return 0

    variations = _parse_generation_response(response)
    if not variations:
        logger.warning(f"No variations parsed from point {point_id}")
        return 0

    created_count = 0
    for var in variations[:3]:
        variation_number = var.get("variation_number", var.get("variationNumber", 1))
        if isinstance(variation_number, str):
            variation_number = int(variation_number)

        hook_used = var.get("hook_used", var.get("hookUsed", ""))
        format_used = var.get("format_used", var.get("formatUsed", ""))
        content_text = var.get("content_text", var.get("contentText", ""))
        suggested_cta = var.get("suggested_cta", var.get("suggestedCta", ""))
        char_count = var.get("char_count", var.get("charCount", len(content_text)))

        if not content_text:
            continue

        try:
            queries.create_draft(
                extracted_point_id=point_id,
                variation_number=variation_number,
                content_text=content_text,
                hook_used=hook_used,
                format_used=format_used,
                char_count=int(char_count),
            )
            created_count += 1
        except Exception as e:
            logger.error(f"Failed to create draft: {e}")

    logger.info(f"Generated {created_count} drafts from point {point_id}")
    return created_count


async def generate_from_points(point_ids: Optional[list[str]] = None) -> dict[str, Any]:
    """
    Generate content from extracted points.

    Args:
        point_ids: Optional list of specific point IDs. If None, uses all unused points.

    Returns:
        A dict with counts of points processed and drafts created.
    """
    logger.info("Starting generation job")

    if point_ids:
        points = []
        for pid in point_ids:
            pt = queries.get_points_by_score(1)
            for p in pt:
                if p.get("id") == pid:
                    points.append(p)
    else:
        points = queries.get_unused_points()

    if not points:
        logger.info("No unused extracted points to generate from")
        return {"points_processed": 0, "drafts_created": 0}

    logger.info(f"Found {len(points)} extracted points to generate from")

    total_drafts = 0
    processed_count = 0

    for point in points:
        point_id = point.get("id", "")

        try:
            drafts_count = await _generate_content(point)

            if drafts_count > 0:
                queries.mark_point_used(point_id)
                processed_count += 1
                total_drafts += drafts_count

        except Exception as e:
            logger.error(f"Failed to generate from point {point_id}: {e}")

    logger.info(
        f"Generation job completed. Points processed: {processed_count}, Drafts: {total_drafts}"
    )

    return {"points_processed": processed_count, "drafts_created": total_drafts}