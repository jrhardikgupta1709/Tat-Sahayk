from sqlalchemy.orm import Session
from app.models.zone import Zone
from app.models.report import Report
from app.models.user import User
from app.schemas.zone import ZoneCreate, ZoneUpdate
import logging

logger = logging.getLogger(__name__)


def create_zone(db: Session, zone: ZoneCreate) -> Zone:
    db_zone = Zone(**zone.model_dump())
    db.add(db_zone)
    db.commit()
    db.refresh(db_zone)
    return db_zone


def get_zones(db: Session, active_only: bool = True):
    q = db.query(Zone)
    if active_only:
        q = q.filter(Zone.is_active == True)
    return q.order_by(Zone.name).all()


def get_zone(db: Session, zone_id: int):
    return db.query(Zone).filter(Zone.id == zone_id).first()


def get_zone_by_name(db: Session, name: str):
    return db.query(Zone).filter(Zone.name == name).first()


def update_zone(db: Session, zone_id: int, zone_in: ZoneUpdate):
    zone = get_zone(db, zone_id)
    if not zone:
        return None
    for k, v in zone_in.model_dump(exclude_unset=True).items():
        setattr(zone, k, v)
    db.commit()
    db.refresh(zone)
    return zone


def delete_zone(db: Session, zone_id: int):
    zone = get_zone(db, zone_id)
    if zone:
        zone.is_active = False
        db.commit()
    return zone


def assign_user_to_zone(db: Session, user_id: int, zone_id: int):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        return None
    user.zone_id = zone_id
    db.commit()
    db.refresh(user)
    return user


def unassign_user_from_zone(db: Session, user_id: int):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        return None
    user.zone_id = None
    db.commit()
    db.refresh(user)
    return user


def find_zone_for_point(db: Session, lat: float, lng: float):
    """Find which zone a lat/lng point falls into (bounding box check)."""
    zone = (
        db.query(Zone)
        .filter(
            Zone.is_active == True,
            Zone.lat_min <= lat,
            Zone.lat_max >= lat,
            Zone.lng_min <= lng,
            Zone.lng_max >= lng,
        )
        .first()
    )
    return zone


def get_zone_stats(db: Session, zone_id: int):
    """Get report counts for a zone."""
    total = db.query(Report).filter(Report.zone_id == zone_id).count()
    pending = db.query(Report).filter(Report.zone_id == zone_id, Report.status == "pending").count()
    verified = db.query(Report).filter(Report.zone_id == zone_id, Report.status == "verified").count()
    users = db.query(User).filter(User.zone_id == zone_id).count()
    return {
        "total_reports": total,
        "pending_review": pending,
        "verified_hazards": verified,
        "assigned_officials": users,
    }
