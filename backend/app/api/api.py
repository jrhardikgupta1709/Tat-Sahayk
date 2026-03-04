from fastapi import APIRouter
from app.api.v1.endpoints import auth, reports, media, social, zones, notifications, news

api_router = APIRouter()

# Auth Routes
api_router.include_router(auth.router, prefix="/auth", tags=["auth"])

# Reports Routes
api_router.include_router(reports.router, prefix="/reports", tags=["reports"])

# Media Routes
api_router.include_router(media.router, prefix="/media", tags=["media"])

# Social Post
api_router.include_router(social.router, prefix="/social", tags=["social"])

# Zones — location-based admin areas
api_router.include_router(zones.router, prefix="/zones", tags=["zones"])

# Notifications — push alerts with geo-targeting
api_router.include_router(notifications.router, prefix="/notifications", tags=["notifications"])

# News — live disaster news feed
api_router.include_router(news.router, prefix="/news", tags=["news"])