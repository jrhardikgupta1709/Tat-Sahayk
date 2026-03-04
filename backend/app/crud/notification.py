import math
from typing import Optional
from sqlalchemy.orm import Session
from app.models.notification import Notification, NotificationRead
from app.models.user import User
from app.models.report import Report
from app.schemas.notification import NotificationCreate


def haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculate distance between two points in km using Haversine formula."""
    R = 6371.0  # Earth radius in km
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = (
        math.sin(dlat / 2) ** 2
        + math.cos(math.radians(lat1))
        * math.cos(math.radians(lat2))
        * math.sin(dlon / 2) ** 2
    )
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


def create_notification(
    db: Session,
    notification_in: NotificationCreate,
    created_by_id: int,
) -> Notification:
    notif = Notification(
        title=notification_in.title,
        message=notification_in.message,
        severity=notification_in.severity,
        category=notification_in.category,
        latitude=notification_in.latitude,
        longitude=notification_in.longitude,
        radius_km=notification_in.radius_km,
        created_by_id=created_by_id,
    )
    db.add(notif)
    db.commit()
    db.refresh(notif)
    return notif


def get_notifications_for_user(
    db: Session,
    user_id: int,
    skip: int = 0,
    limit: int = 50,
) -> list[dict]:
    """
    Return notifications relevant to a user.
    For location-based filtering we check the user's latest report location
    against each notification's radius.
    """
    # Get the user's most common location from their reports
    user_location = _get_user_location(db, user_id)

    all_notifs = (
        db.query(Notification)
        .filter(Notification.is_active == True)
        .order_by(Notification.created_at.desc())
        .all()
    )

    # Read-status lookup
    read_ids = set(
        r[0]
        for r in db.query(NotificationRead.notification_id)
        .filter(NotificationRead.user_id == user_id)
        .all()
    )

    results = []
    for n in all_notifs:
        # If notification has a location, check radius
        if n.latitude is not None and n.longitude is not None and user_location:
            dist = haversine_km(n.latitude, n.longitude, user_location[0], user_location[1])
            if dist > n.radius_km:
                continue  # outside radius — skip

        results.append({
            "id": n.id,
            "title": n.title,
            "message": n.message,
            "severity": n.severity,
            "category": n.category,
            "latitude": n.latitude,
            "longitude": n.longitude,
            "radius_km": n.radius_km,
            "created_by_id": n.created_by_id,
            "is_active": n.is_active,
            "created_at": n.created_at,
            "is_read": n.id in read_ids,
        })

    return results[skip : skip + limit]


def get_all_notifications(
    db: Session,
    skip: int = 0,
    limit: int = 100,
):
    return (
        db.query(Notification)
        .filter(Notification.is_active == True)
        .order_by(Notification.created_at.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )


def get_unread_count(db: Session, user_id: int) -> int:
    """Count unread notifications for a user (respecting radius)."""
    notifs = get_notifications_for_user(db, user_id, skip=0, limit=500)
    return sum(1 for n in notifs if not n["is_read"])


def mark_read(db: Session, notification_id: int, user_id: int):
    existing = (
        db.query(NotificationRead)
        .filter(
            NotificationRead.notification_id == notification_id,
            NotificationRead.user_id == user_id,
        )
        .first()
    )
    if not existing:
        nr = NotificationRead(notification_id=notification_id, user_id=user_id)
        db.add(nr)
        db.commit()


def mark_all_read(db: Session, user_id: int):
    notifs = get_notifications_for_user(db, user_id, skip=0, limit=500)
    for n in notifs:
        if not n["is_read"]:
            mark_read(db, n["id"], user_id)


def get_targeted_user_count(
    db: Session,
    latitude: Optional[float],
    longitude: Optional[float],
    radius_km: float = 50.0,
) -> int:
    """Estimate how many users will receive this notification."""
    if latitude is None or longitude is None:
        # Global notification — all active users
        return db.query(User).filter(User.is_active == True).count()

    # First check users with stored location
    users = db.query(User).filter(User.is_active == True).all()
    targeted = set()
    for u in users:
        if u.latitude and u.longitude:
            dist = haversine_km(latitude, longitude, u.latitude, u.longitude)
            if dist <= radius_km:
                targeted.add(u.id)
                continue
        # Fallback: check report locations for users without stored location
        report = (
            db.query(Report)
            .filter(Report.user_id == u.id)
            .order_by(Report.created_at.desc())
            .first()
        )
        if report and report.latitude and report.longitude:
            dist = haversine_km(latitude, longitude, report.latitude, report.longitude)
            if dist <= radius_km:
                targeted.add(u.id)
    return len(targeted) if targeted else 0


def _get_user_location(db: Session, user_id: int) -> Optional[tuple]:
    """Get the user's stored location, falling back to their most recent report."""
    # First: use stored browser geolocation
    user = db.query(User).filter(User.id == user_id).first()
    if user and user.latitude and user.longitude:
        return (user.latitude, user.longitude)

    # Fallback: most recent report location
    report = (
        db.query(Report)
        .filter(Report.user_id == user_id)
        .order_by(Report.created_at.desc())
        .first()
    )
    if report and report.latitude and report.longitude:
        return (report.latitude, report.longitude)

    # No location data available — they receive all non-targeted notifications
    return None
