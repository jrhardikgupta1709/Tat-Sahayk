from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, Boolean, Text, Float, JSON
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.db.session import Base


class Report(Base):
    __tablename__ = "reports"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    
    # Hazard Details
    hazard_type = Column(String, nullable=True)  # ML will detect
    description = Column(Text)
    severity = Column(String)
    
    # Location (Latitude/Longitude for SQLite compatibility)
    latitude = Column(Float, default=0.0)
    longitude = Column(Float, default=0.0)
    
    # ML Analysis Results
    ml_analysis = Column(JSON, nullable=True)
    credibility_score = Column(Float, nullable=True)
    
    # Verification Status
    is_verified = Column(Boolean, default=False)
    status = Column(String, default="pending")
    
    # Zone assignment (auto-detected from lat/lng)
    zone_id = Column(Integer, ForeignKey("zones.id"), nullable=True)

    # Meta
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    owner = relationship("User", back_populates="reports", lazy="joined")
    media = relationship("Media", back_populates="report")
    zone = relationship("Zone", back_populates="reports")

    @property
    def reporter_name(self):
        """Return the full name of the report owner."""
        if self.owner:
            return self.owner.full_name or self.owner.email
        return "Anonymous"