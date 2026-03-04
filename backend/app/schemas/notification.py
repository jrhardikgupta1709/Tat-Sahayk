from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class NotificationBase(BaseModel):
    title: str
    message: str
    severity: str = "info"
    category: str = "general"
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    radius_km: float = 50.0


class NotificationCreate(NotificationBase):
    pass


class NotificationResponse(NotificationBase):
    id: int
    created_by_id: int
    is_active: bool
    created_at: Optional[datetime] = None
    is_read: bool = False  # populated per-user at query time

    class Config:
        from_attributes = True


class NotificationStats(BaseModel):
    total: int = 0
    unread: int = 0
