"""
News feed service — fetches disaster-related news from free RSS/API sources.
No API key required; uses GDACS, ReliefWeb, and NDTV RSS feeds.
"""

import httpx
import feedparser
from datetime import datetime, timedelta
from typing import Optional

# Free disaster-related RSS feeds (no API key needed)
RSS_FEEDS = [
    {
        "name": "GDACS",
        "url": "https://www.gdacs.org/xml/rss.xml",
        "category": "global-disasters",
    },
    {
        "name": "ReliefWeb",
        "url": "https://reliefweb.int/updates/rss.xml",
        "category": "humanitarian",
    },
    {
        "name": "NDTV Disasters",
        "url": "https://feeds.feedburner.com/ndtvnews-latest",
        "category": "india-news",
    },
    {
        "name": "India Met Dept",
        "url": "https://mausam.imd.gov.in/imd_latest/rss/rss_current.xml",
        "category": "weather-india",
    },
]

# Disaster-related keywords for filtering general feeds
DISASTER_KEYWORDS = [
    "tsunami", "cyclone", "flood", "earthquake", "storm", "hurricane",
    "typhoon", "disaster", "landslide", "coastal", "erosion", "wave",
    "surge", "pollution", "oil spill", "sea level", "climate",
    "warning", "alert", "evacuation", "rescue", "relief", "hazard",
    "drought", "wildfire", "volcanic", "tidal", "monsoon", "rainfall",
]

_news_cache: dict = {"items": [], "fetched_at": None}
CACHE_TTL_MINUTES = 10


def _is_disaster_related(text: str) -> bool:
    """Check if text contains disaster-related keywords."""
    lower = text.lower()
    return any(kw in lower for kw in DISASTER_KEYWORDS)


def _parse_date(entry) -> Optional[str]:
    """Try to extract a date from feed entry."""
    for field in ("published_parsed", "updated_parsed"):
        val = getattr(entry, field, None)
        if val:
            try:
                return datetime(*val[:6]).isoformat()
            except Exception:
                pass
    for field in ("published", "updated"):
        val = getattr(entry, field, None)
        if val:
            return val
    return None


async def fetch_news(limit: int = 20, force_refresh: bool = False) -> list[dict]:
    """Fetch and aggregate disaster-related news from RSS feeds."""
    global _news_cache

    # Return cached if fresh
    if (
        not force_refresh
        and _news_cache["fetched_at"]
        and (datetime.utcnow() - _news_cache["fetched_at"]).total_seconds() < CACHE_TTL_MINUTES * 60
        and _news_cache["items"]
    ):
        return _news_cache["items"][:limit]

    all_items = []

    async with httpx.AsyncClient(timeout=10.0, follow_redirects=True) as client:
        for feed_info in RSS_FEEDS:
            try:
                resp = await client.get(feed_info["url"])
                if resp.status_code != 200:
                    continue

                parsed = feedparser.parse(resp.text)
                for entry in parsed.entries[:15]:
                    title = getattr(entry, "title", "")
                    summary = getattr(entry, "summary", getattr(entry, "description", ""))
                    link = getattr(entry, "link", "")

                    # Filter ALL feeds by disaster keywords for relevance
                    if not _is_disaster_related(f"{title} {summary}"):
                        continue

                    # Clean summary (strip HTML tags roughly)
                    import re
                    clean_summary = re.sub(r"<[^>]+>", "", summary).strip()
                    if len(clean_summary) > 300:
                        clean_summary = clean_summary[:297] + "..."

                    all_items.append({
                        "title": title,
                        "summary": clean_summary,
                        "link": link,
                        "source": feed_info["name"],
                        "category": feed_info["category"],
                        "published_at": _parse_date(entry),
                    })
            except Exception:
                # Individual feed failure is OK — continue with others
                continue

    # Sort by published date (newest first), fallback for missing dates
    all_items.sort(
        key=lambda x: x.get("published_at") or "1970-01-01",
        reverse=True,
    )

    # Deduplicate by title similarity
    seen = set()
    deduped = []
    for item in all_items:
        key = item["title"].lower().strip()[:60]
        if key not in seen:
            seen.add(key)
            deduped.append(item)

    _news_cache = {"items": deduped, "fetched_at": datetime.utcnow()}
    return deduped[:limit]
