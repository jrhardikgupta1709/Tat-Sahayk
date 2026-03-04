from datetime import timedelta
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from app.crud import user as crud_user
from app.schemas.user import UserCreate, UserResponse, Token, UpdateLocation
from app.db.session import get_db
from app.api.deps import get_current_user
from app.core.security import verify_password, create_access_token, get_password_hash
from app.core.config import settings
from app.models.user import User
import httpx
import logging

router = APIRouter()
logger = logging.getLogger(__name__)

@router.post("/signup", response_model=UserResponse)
def create_user(user_in: UserCreate, db: Session = Depends(get_db)):
    user = crud_user.get_user_by_email(db, email=user_in.email)
    if user:
        raise HTTPException(status_code=400, detail="Email already registered")
    user = crud_user.create_user(db, user=user_in)
    return user

@router.post("/login", response_model=Token)
def login_for_access_token(
    db: Session = Depends(get_db),
    form_data: OAuth2PasswordRequestForm = Depends()
):
    user = crud_user.get_user_by_email(db, email=form_data.username)
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.email}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}

@router.get("/me", response_model=UserResponse)
def read_current_user(current_user: User = Depends(get_current_user)):
    return current_user


@router.put("/me/location", response_model=UserResponse)
def update_my_location(
    payload: UpdateLocation,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Store the user's browser-detected geolocation on their profile."""
    user = crud_user.update_user_location(
        db, current_user.id, payload.latitude, payload.longitude
    )
    return user


@router.get("/officials", response_model=list[UserResponse])
def list_officials(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List all officials and admins — for zone assignment"""
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    users = db.query(User).filter(User.role.in_(["admin", "official"])).all()
    return users


@router.post("/google", response_model=Token)
async def google_login(payload: dict, db: Session = Depends(get_db)):
    """
    Google OAuth login. Accepts { credential: "<google_id_token>" }.
    Verifies the token with Google, creates user if new, returns JWT.
    """
    credential = payload.get("credential")
    if not credential:
        raise HTTPException(status_code=400, detail="Google credential is required")

    # Verify the Google token
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.get(
                f"https://oauth2.googleapis.com/tokeninfo?id_token={credential}"
            )
            if resp.status_code != 200:
                raise HTTPException(status_code=401, detail="Invalid Google token")
            google_data = resp.json()
    except httpx.HTTPError:
        raise HTTPException(status_code=401, detail="Could not verify Google token")

    email = google_data.get("email")
    name = google_data.get("name", "")
    if not email:
        raise HTTPException(status_code=401, detail="Google token missing email")

    # Check if user exists
    user = crud_user.get_user_by_email(db, email=email)
    if not user:
        # Create new user with a random password (they'll use Google to login)
        import secrets
        random_pw = secrets.token_urlsafe(32)
        user_in = UserCreate(email=email, full_name=name, password=random_pw, role="citizen")
        user = crud_user.create_user(db, user=user_in)
        logger.info(f"✅ New Google user created: {email}")

    # Generate access token
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.email}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}