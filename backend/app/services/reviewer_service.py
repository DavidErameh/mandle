"""
Reviewer Service - Brand review of generated content drafts.

This service implements Stage 4 of the pipeline: scoring content drafts
against brand guidelines using the fast model.
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
    FAST_MODEL,
    GroqAPIError,
    GroqJSONParseError,
)


logger = logging.getLogger(__name__)


def _parse_review_response(content: str) -> dict[str, Any]:
    """Parse the JSON review response."""
    content = content.strip()

    if content.startswith("```json"):
        content = content[7:]
    if content.startswith("```"):
        content = content[3:]
    if content.endswith("```"):
        content = content[:-3]
    content = content.strip()

    try:
        return json.loads(content)
    except json.JSONDecodeError as e:
        logger.error(f"Failed to parse review JSON: {e}")
        return {}


def _assemble_prompt() -> str:
    """Assemble the review prompt using the prompt engine."""
    settings = get_settings()
    prompts_path = settings.get_prompts_path()

    loader = PromptLoader(prompts_path)
    assembler = PromptAssembler(loader)

    return assembler.assemble("review")


async def _review_single_draft(draft: dict[str, Any]) -> bool:
    """Review a single draft and update it in Convex."""
    draft_id = draft.get("id", "")
    content_text = draft.get("contentText", "")

    if not content_text:
        logger.warning(f"Draft {draft_id} has no content to review")
        return False

    system_prompt = _assemble_prompt()
    user_message = f"""Review the following X (Twitter) post for brand compliance:

---
{content_text}
---

Return a JSON object with:
- score: 1-10 overall brand score
- voice_match: true/false - does it match the brand voice?
- rule_violations: array of rule violations (empty if none)
- suggested_edits: array of suggested improvements
- approved: true/false - should this be approved for posting?
"""

    try:
        response = call_groq(
            model=FAST_MODEL,
            system_prompt=system_prompt,
            user_message=user_message,
            response_format={"type": "json_object"},
            temperature=0.3,
        )
    except (GroqAPIError, GroqJSONParseError) as e:
        logger.error(f"Groq error reviewing draft {draft_id}: {e}")
        return False
    except Exception as e:
        logger.error(f"Unexpected error reviewing draft {draft_id}: {e}")
        return False

    review = _parse_review_response(response)
    if not review:
        logger.warning(f"No review parsed for draft {draft_id}")
        return False

    score = review.get("score", review.get("score", 5))
    if isinstance(score, str):
        try:
            score = int(score)
        except (ValueError, TypeError):
            score = 5

    voice_match = review.get("voice_match", review.get("voiceMatch", False))
    if isinstance(voice_match, str):
        voice_match = voice_match.lower() == "true"

    rule_violations = review.get("rule_violations", review.get("ruleViolations", []))
    if not isinstance(rule_violations, list):
        rule_violations = []

    suggested_edits = review.get("suggested_edits", review.get("suggestedEdits", []))
    if not isinstance(suggested_edits, list):
        suggested_edits = []

    approved = review.get("approved", False)
    if isinstance(approved, str):
        approved = approved.lower() == "true"

    if not approved:
        if score >= 7 and len(rule_violations) == 0:
            approved = True

    try:
        queries.update_draft_review(
            id=draft_id,
            brand_score=int(score),
            reviewer_approved=approved,
            rule_violations=rule_violations,
            suggested_edits=suggested_edits,
        )
        logger.info(
            f"Draft {draft_id} reviewed: score={score}, approved={approved}, violations={len(rule_violations)}"
        )
        return True
    except Exception as e:
        logger.error(f"Failed to update draft {draft_id}: {e}")
        return False


async def review_drafts(draft_ids: list[str]) -> dict[str, Any]:
    """
    Review multiple drafts by ID.

    Args:
        draft_ids: List of draft IDs to review.

    Returns:
        A dict with review statistics.
    """
    logger.info(f"Starting review job for {len(draft_ids)} drafts")

    if not draft_ids:
        return {"reviewed": 0, "approved": 0, "rejected": 0}

    reviewed_count = 0
    approved_count = 0
    failed_count = 0

    for draft_id in draft_ids:
        try:
            draft = queries.get_draft_by_id(draft_id)
            if not draft:
                logger.warning(f"Draft {draft_id} not found")
                continue

            success = await _review_single_draft(draft)

            if success:
                reviewed_count += 1
                if draft.get("reviewerApproved", False):
                    approved_count += 1
            else:
                failed_count += 1

        except Exception as e:
            logger.error(f"Failed to review draft {draft_id}: {e}")
            failed_count += 1

    logger.info(
        f"Review job completed. Reviewed: {reviewed_count}, Approved: {approved_count}, Failed: {failed_count}"
    )

    return {"reviewed": reviewed_count, "approved": approved_count, "rejected": failed_count}


async def review_all_pending() -> dict[str, Any]:
    """
    Review all pending drafts that haven't been reviewed yet.

    Returns:
        A dict with review statistics.
    """
    logger.info("Starting review for all pending drafts")

    pending_drafts = queries.get_pending_drafts()

    if not pending_drafts:
        logger.info("No pending drafts to review")
        return {"reviewed": 0, "approved": 0, "rejected": 0}

    draft_ids = [d.get("id") for d in pending_drafts]
    return await review_drafts(draft_ids)