from pydantic import BaseModel, ConfigDict
from typing import Optional, List
from datetime import datetime


class ZoneBase(BaseModel):
    name: str
    description: Optional[str] = None
    lat_min: float
    lat_max: float
    lng_min: float
    lng_max: float


class ZoneCreate(ZoneBase):
    pass


class ZoneUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    lat_min: Optional[float] = None
    lat_max: Optional[float] = None
    lng_min: Optional[float] = None
    lng_max: Optional[float] = None
    is_active: Optional[bool] = None


class ZoneResponse(ZoneBase):
    id: int
    is_active: bool
    created_at: datetime
    report_count: Optional[int] = 0
    assigned_user_count: Optional[int] = 0

    model_config = ConfigDict(from_attributes=True)


class ZoneAssign(BaseModel):
    """Assign a user (official/admin) to a zone"""
    user_id: int
    zone_id: int
