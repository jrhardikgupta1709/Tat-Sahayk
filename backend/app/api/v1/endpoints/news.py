from fastapi import APIRouter, Query
from app.services.news_feed import fetch_news

router = APIRouter()


@router.get("/")
async def get_disaster_news(
    limit: int = Query(default=15, le=50),
    refresh: bool = Query(default=False),
):
    """
    Get live disaster-related news from aggregated RSS feeds.
    Results are cached for 10 minutes unless refresh=true.
    No API key required.
    """
    items = await fetch_news(limit=limit, force_refresh=refresh)
    return items
