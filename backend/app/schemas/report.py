from pydantic import BaseModel, ConfigDict, Field
from typing import Optional, List
from datetime import datetime


# ========================
# Base Schema (shared fields)
# ========================
class ReportBase(BaseModel):
    hazard_type: Optional[str] = None
    description: str
    severity: str = "medium"
    latitude: float
    longitude: float


# ========================
# Create Schema (Input)
# ========================
class ReportCreate(ReportBase):
    image_filenames: List[str] = Field(default_factory=list)


# ========================
# SOS Emergency Schema
# ========================
class SOSRequest(BaseModel):
    latitude: float
    longitude: float


# ========================
# Media Response
# ========================
class MediaResponse(BaseModel):
    file_path: str
    file_type: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


# ========================
# ML Analysis Schema
# ========================
class MLAnalysisData(BaseModel):
    hazard_detected: bool
    hazard_type: str
    confidence: float
    credibility_score: float
    sentiment: Optional[str] = None
    verified_by_real_data: bool = False


# ========================
# Report Response (Output)
# ========================
class ReportResponse(BaseModel):
    id: int
    user_id: int
    reporter_name: Optional[str] = None

    hazard_type: Optional[str]
    description: str
    severity: str

    latitude: float
    longitude: float

    is_verified: bool
    status: str
    zone_id: Optional[int] = None
    created_at: datetime

    ml_analysis: Optional[MLAnalysisData] = None
    credibility_score: Optional[float] = None

    media: List[MediaResponse] = Field(default_factory=list)

    model_config = ConfigDict(from_attributes=True)