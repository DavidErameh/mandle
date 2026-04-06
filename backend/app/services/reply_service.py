"""
Reply Service - Reply generation for target account tweets.

This service monitors target accounts, generates reply options, and handles
the approval-to-posting flow with rate limiting.
"""

import logging
import json
import random
import re
from datetime import datetime, timedelta
from typing import Any, Optional

import httpx
import tweepy

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

REPLY_DELAY_MIN = 10
REPLY_DELAY_MAX = 45
MAX_REPLIES_PER_DAY = 2
MIN_ENGAGEMENT_THRESHOLD = 5
TWITTERAPI_BASE_URL = "https://api.twitterapi.io/v1"


def _get_tweepy_client() -> tweepy.API:
    """Get an authenticated Tweepy API client."""
    settings = get_settings()

    auth = tweepy.OAuthHandler(settings.x_api_key, settings.x_api_secret)
    auth.set_access_token(settings.x_access_token, settings.x_access_token_secret)

    return tweepy.API(auth)


def _fetch_user_tweets_twitterapi(user_id: str) -> list[dict[str, Any]]:
    """
    Fetch tweets for a user using TwitterAPI.io.
    
    Returns list of tweet dicts with 'id', 'text', 'created_at', 
    'favorite_count', 'retweet_count', 'in_reply_to_screen_name', 'retweeted' fields.
    """
    settings = get_settings()
    api_key = settings.twitterapi_io_key
    
    if not api_key:
        logger.warning("TWITTERAPI_IO_KEY not configured")
        return []
    
    url = f"{TWITTERAPI_BASE_URL}/user_tweets"
    headers = {"x-api-key": api_key}
    params = {"user_id": user_id}
    
    try:
        with httpx.Client(timeout=10.0) as client:
            response = client.get(url, headers=headers, params=params)
            
            if response.status_code == 429:
                logger.warning(f"Rate limited by TwitterAPI.io for user {user_id}")
                return []
            
            if response.status_code != 200:
                logger.warning(f"TwitterAPI.io error for user {user_id}: {response.status_code}")
                return []
            
            data = response.json()
            tweets = data.get("tweets", [])
            
            return [
                {
                    "id": str(t.get("id", "")),
                    "text": t.get("text", ""),
                    "created_at": t.get("created_at", ""),
                    "favorite_count": t.get("favorite_count", 0),
                    "retweet_count": t.get("retweet_count", 0),
                    "in_reply_to_screen_name": t.get("in_reply_to_screen_name"),
                    "retweeted": t.get("retweeted", False),
                }
                for t in tweets
            ]
            
    except httpx.TimeoutException:
        logger.warning(f"Timeout fetching tweets from TwitterAPI.io for user {user_id}")
        return []
    except Exception as e:
        logger.warning(f"Error fetching tweets from TwitterAPI.io for user {user_id}: {e}")
        return []


def _load_niche_keywords() -> set[str]:
    """Load niche keywords from prompt files for filtering."""
    settings = get_settings()
    prompts_path = settings.get_prompts_path()

    try:
        loader = PromptLoader(prompts_path)
        niche_content = loader.load("niche_context")

        keywords = set()
        for line in niche_content.split("\n"):
            line = line.strip()
            if line and not line.startswith("#") and not line.startswith(">"):
                words = re.findall(r"\b\w+\b", line)
                keywords.update(w.lower() for w in words if len(w) > 2)

        return keywords
    except Exception as e:
        logger.warning(f"Failed to load niche keywords: {e}")
        return set()


def _contains_niche_keywords(text: str, keywords: set[str]) -> bool:
    """Check if text contains any niche keywords."""
    text_lower = text.lower()
    return any(kw in text_lower for kw in keywords)


def _check_reply_rate_limit(target_id: str) -> bool:
    """Check if we can reply to this account (max 2 per day)."""
    yesterday = datetime.now() - timedelta(days=1)
    yesterday_ts = int(yesterday.timestamp() * 1000)

    replies = queries.get_replies_by_account(target_id)

    posted_recently = 0
    for reply in replies:
        if reply.get("postedAt", 0) > yesterday_ts:
            posted_recently += 1

    return posted_recently < MAX_REPLIES_PER_DAY


def _assemble_prompt() -> str:
    """Assemble the reply prompt using the prompt engine."""
    settings = get_settings()
    prompts_path = settings.get_prompts_path()

    loader = PromptLoader(prompts_path)
    assembler = PromptAssembler(loader)

    return assembler.assemble("reply")


def _parse_reply_response(content: str) -> dict[str, str]:
    """Parse the JSON reply response."""
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
        logger.error(f"Failed to parse reply JSON: {e}")
        return {}

    return {
        "agree_extend": data.get("agree_extend", data.get("agreeExtend", ""))[:280],
        "contrarian": data.get("contrarian", "")[:280],
        "curiosity_hook": data.get("curiosity_hook", data.get("curiosityHook", ""))[:280],
    }


async def _generate_replies(tweet_text: str, account: dict[str, Any]) -> int:
    """Generate 3 reply options for a tweet."""
    account_id = account.get("id", "")
    category = account.get("category", "")

    system_prompt = _assemble_prompt()
    user_message = f"""Generate 3 reply options for the following tweet:

Tweet: {tweet_text}
Account Category: {category}

Return a JSON object with:
- agree_extend: Agree with the tweet and add value (under 280 chars)
- contrarian: Respectful pushback or alternative perspective (under 280 chars)
- curiosity_hook: Ask a question to spark engagement (under 280 chars)

All replies must be under 280 characters and match the brand voice.
"""

    try:
        response = call_groq(
            model=WRITING_MODEL,
            system_prompt=system_prompt,
            user_message=user_message,
            response_format={"type": "json_object"},
            temperature=0.7,
            max_tokens=1000,
        )
    except (GroqAPIError, GroqJSONParseError) as e:
        logger.error(f"Groq error generating replies: {e}")
        return 0
    except Exception as e:
        logger.error(f"Unexpected error generating replies: {e}")
        return 0

    replies = _parse_reply_response(response)
    if not all(replies.values()):
        logger.warning("Not all reply options were generated")
        return 0

    try:
        queries.create_reply(
            target_account_id=account_id,
            source_tweet_id="",
            source_tweet_text=tweet_text,
            reply_agree_extend=replies["agree_extend"],
            reply_contrarian=replies["contrarian"],
            reply_curiosity_hook=replies["curiosity_hook"],
        )
        logger.info(f"Created reply draft for account {account_id}")
        return 1
    except Exception as e:
        logger.error(f"Failed to create reply draft: {e}")
        return 0


async def check_target_accounts() -> dict[str, Any]:
    """
    Check all active target accounts for new tweets to generate replies for.

    Returns:
        A dict with check statistics.
    """
    logger.info("Starting target account check")

    settings = get_settings()
    niche_keywords = _load_niche_keywords()

    active_targets = queries.get_active_targets()

    if not active_targets:
        logger.info("No active target accounts")
        return {"checked": 0, "generated": 0}

    logger.info(f"Checking {len(active_targets)} active target accounts")

    generated_count = 0
    checked_count = 0

    for account in active_targets:
        x_username = account.get("xUsername", "")
        x_user_id = account.get("xUserId", "")
        account_id = account.get("id", "")

        if not x_user_id:
            logger.debug(f"No X user ID for {x_username}, skipping")
            continue

        if not _check_reply_rate_limit(account_id):
            logger.debug(f"Rate limit reached for {x_username}, skipping")
            continue

        try:
            tweets = _fetch_user_tweets_twitterapi(x_user_id)
        except Exception as e:
            logger.warning(f"Failed to fetch tweets for {x_username}: {e}")
            queries.update_target_last_checked(
                id=account_id,
                last_checked_at=utc_now(),
            )
            continue

        if not tweets:
            queries.update_target_last_checked(
                id=account_id,
                last_checked_at=utc_now(),
            )
            continue

        tweet = tweets[0]
        tweet_text = tweet.get("text", "")

        if tweet.get("in_reply_to_screen_name") or tweet.get("retweeted"):
            logger.debug(f"Skipping non-original tweet from {x_username}")
            queries.update_target_last_checked(
                id=account_id,
                last_checked_at=utc_now(),
            )
            continue

        if niche_keywords and not _contains_niche_keywords(tweet_text, niche_keywords):
            logger.debug(f"Tweet from {x_username} doesn't match niche keywords")
            queries.update_target_last_checked(
                id=account_id,
                last_checked_at=utc_now(),
            )
            continue

        engagement = tweet.get("favorite_count", 0) + tweet.get("retweet_count", 0)
        if engagement < settings.min_reply_engagement:
            logger.debug(f"Tweet from {x_username} below engagement threshold")
            queries.update_target_last_checked(
                id=account_id,
                last_checked_at=utc_now(),
            )
            continue

        checked_count += 1

        generated = await _generate_replies(tweet_text, account)
        generated_count += generated

        queries.update_target_last_checked(
            id=account_id,
            last_checked_at=utc_now(),
        )

    logger.info(f"Target check completed. Checked: {checked_count}, Generated: {generated_count}")

    return {"checked": checked_count, "generated": generated_count}


async def post_approved_reply(reply_id: str) -> dict[str, Any]:
    """
    Post an approved reply with a random delay.

    Args:
        reply_id: The ID of the reply draft to post.

    Returns:
        A dict with posting result.
    """
    logger.info(f"Posting approved reply {reply_id}")

    replies = queries.get_pending_replies()
    reply = None
    for r in replies:
        if r.get("id") == reply_id:
            reply = r
            break

    if not reply:
        logger.error(f"Reply {reply_id} not found")
        return {"success": False, "error": "Reply not found"}

    selected_reply = reply.get("selectedReply") or reply.get("replyAgreeExtend", "")
    source_tweet_id = reply.get("sourceTweetId", "")

    if not source_tweet_id:
        logger.error(f"Reply {reply_id} has no source tweet ID")
        return {"success": False, "error": "No source tweet ID"}

    delay_minutes = random.randint(REPLY_DELAY_MIN, REPLY_DELAY_MAX)
    logger.info(f"Waiting {delay_minutes} minutes before posting")

    import asyncio
    await asyncio.sleep(delay_minutes * 60)

    try:
        client = _get_tweepy_client()

        result = client.update_status(
            status=selected_reply,
            in_reply_to_status_id=source_tweet_id,
        )

        x_reply_id = str(result.id)
        posted_at = utc_now()

        queries.update_reply_status(id=reply_id, status="approved")
        queries.set_selected_reply(id=reply_id, selected_reply=selected_reply)

        logger.info(f"Successfully posted reply {x_reply_id}")

        return {"success": True, "x_reply_id": x_reply_id}

    except Exception as e:
        logger.error(f"Failed to post reply: {e}")
        return {"success": False, "error": str(e)}