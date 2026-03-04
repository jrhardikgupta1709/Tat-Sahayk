from sqlalchemy import Column, Integer, String, Boolean, DateTime, Float, ForeignKey
from sqlalchemy.sql import func
from app.db.session import Base
from sqlalchemy.orm import relationship

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    full_name = Column(String)
    hashed_password = Column(String, nullable=False)
    role = Column(String, default="citizen") # citizen, official, admin
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # User's current location (auto-detected via browser)
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)

    # Zone assignment (for officials/admins)
    zone_id = Column(Integer, ForeignKey("zones.id"), nullable=True)

    reports = relationship("Report", back_populates="owner")
    zone = relationship("Zone", back_populates="assigned_users")