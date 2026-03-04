from pydantic import BaseModel, EmailStr
from typing import Optional

class UserBase(BaseModel):
    email: EmailStr
    full_name: Optional[str] = None
    role: str = "citizen"

class UserCreate(UserBase):
    password: str

class UserResponse(UserBase):
    id: int
    is_active: bool
    zone_id: Optional[int] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None

    class Config:
        from_attributes = True

class UpdateLocation(BaseModel):
    latitude: float
    longitude: float

# New Schema for Login Request
class UserLogin(BaseModel):
    email: EmailStr
    password: str

# New Schema for Token Response
class Token(BaseModel):
    access_token: str
    token_type: str