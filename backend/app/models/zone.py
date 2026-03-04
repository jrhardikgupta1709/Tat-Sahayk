from sqlalchemy import Column, Integer, String, Float, DateTime, Boolean
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.db.session import Base


class Zone(Base):
    """
    Geographic zone for distributing admin workload.
    Each zone covers a coastal region defined by a bounding box (lat/lng).
    Officials/admins are assigned to specific zones and only review
    reports that fall within their zone.
    """
    __tablename__ = "zones"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, nullable=False, index=True)
    description = Column(String, nullable=True)

    # Bounding-box corners (south-west → north-east)
    lat_min = Column(Float, nullable=False)
    lat_max = Column(Float, nullable=False)
    lng_min = Column(Float, nullable=False)
    lng_max = Column(Float, nullable=False)

    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    assigned_users = relationship("User", back_populates="zone")
    reports = relationship("Report", back_populates="zone")
