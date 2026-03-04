from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.crud import notification as crud_notification
from app.schemas.notification import NotificationCreate, NotificationResponse, NotificationStats
from app.db.session import get_db
from app.api.deps import get_current_user
from app.models.user import User
from app.models.zone import Zone

router = APIRouter()


@router.post("/", response_model=NotificationResponse)
def push_notification(
    payload: NotificationCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Push a new notification.
    - Officials: auto-targeted to their zone center with 50km radius (ignores any lat/lng/radius sent).
    - Admins: full control over lat/lng/radius.
    """
    if current_user.role not in ("admin", "official"):
        raise HTTPException(status_code=403, detail="Admin/official access required")

    # For officials — auto-use their zone center + 50km
    if current_user.role == "official":
        if current_user.zone_id:
            zone = db.query(Zone).filter(Zone.id == current_user.zone_id).first()
            if zone:
                payload.latitude = (zone.lat_min + zone.lat_max) / 2
                payload.longitude = (zone.lng_min + zone.lng_max) / 2
                payload.radius_km = 50.0
            else:
                # No zone found — use official's own location if available
                if current_user.latitude and current_user.longitude:
                    payload.latitude = current_user.latitude
                    payload.longitude = current_user.longitude
                    payload.radius_km = 50.0
        elif current_user.latitude and current_user.longitude:
            payload.latitude = current_user.latitude
            payload.longitude = current_user.longitude
            payload.radius_km = 50.0

    notif = crud_notification.create_notification(db, payload, current_user.id)
    return notif


@router.get("/", response_model=list[NotificationResponse])
def list_my_notifications(
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get notifications relevant to the current user (radius-filtered)."""
    return crud_notification.get_notifications_for_user(db, current_user.id, skip, limit)


@router.get("/stats", response_model=NotificationStats)
def notification_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get unread/total notification counts for current user."""
    notifs = crud_notification.get_notifications_for_user(db, current_user.id, skip=0, limit=500)
    unread = sum(1 for n in notifs if not n["is_read"])
    return {"total": len(notifs), "unread": unread}


@router.post("/{notification_id}/read")
def mark_notification_read(
    notification_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    crud_notification.mark_read(db, notification_id, current_user.id)
    return {"ok": True}


@router.post("/read-all")
def mark_all_notifications_read(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    crud_notification.mark_all_read(db, current_user.id)
    return {"ok": True}


@router.get("/target-count")
def get_target_count(
    latitude: Optional[float] = None,
    longitude: Optional[float] = None,
    radius_km: float = 50.0,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Preview how many users a notification will reach."""
    if current_user.role not in ("admin", "official"):
        raise HTTPException(status_code=403, detail="Admin/official access required")
    count = crud_notification.get_targeted_user_count(db, latitude, longitude, radius_km)
    return {"targeted_users": count}
