from typing import List
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from app.api import deps
from app.crud import zone as crud_zone
from app.schemas.zone import ZoneCreate, ZoneUpdate, ZoneResponse, ZoneAssign
from app.db.session import get_db
from app.models.user import User
from app.models.zone import Zone

router = APIRouter()


@router.get("/", response_model=List[ZoneResponse])
def list_zones(
    db: Session = Depends(get_db),
    active_only: bool = Query(True),
):
    """List all zones (public — needed for report creation dropdowns etc.)"""
    zones = crud_zone.get_zones(db, active_only=active_only)
    result = []
    for z in zones:
        result.append(ZoneResponse(
            id=z.id,
            name=z.name,
            description=z.description,
            lat_min=z.lat_min,
            lat_max=z.lat_max,
            lng_min=z.lng_min,
            lng_max=z.lng_max,
            is_active=z.is_active,
            created_at=z.created_at,
            report_count=len(z.reports) if z.reports else 0,
            assigned_user_count=len(z.assigned_users) if z.assigned_users else 0,
        ))
    return result


@router.post("/", response_model=ZoneResponse)
def create_zone(
    zone_in: ZoneCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_user),
):
    """Create a new zone — admin only"""
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Only admins can create zones")
    existing = crud_zone.get_zone_by_name(db, zone_in.name)
    if existing:
        raise HTTPException(status_code=400, detail="Zone with this name already exists")
    zone = crud_zone.create_zone(db, zone_in)
    return ZoneResponse(
        id=zone.id, name=zone.name, description=zone.description,
        lat_min=zone.lat_min, lat_max=zone.lat_max,
        lng_min=zone.lng_min, lng_max=zone.lng_max,
        is_active=zone.is_active, created_at=zone.created_at,
        report_count=0, assigned_user_count=0,
    )


@router.get("/{zone_id}", response_model=ZoneResponse)
def get_zone(zone_id: int, db: Session = Depends(get_db)):
    zone = crud_zone.get_zone(db, zone_id)
    if not zone:
        raise HTTPException(status_code=404, detail="Zone not found")
    return ZoneResponse(
        id=zone.id, name=zone.name, description=zone.description,
        lat_min=zone.lat_min, lat_max=zone.lat_max,
        lng_min=zone.lng_min, lng_max=zone.lng_max,
        is_active=zone.is_active, created_at=zone.created_at,
        report_count=len(zone.reports) if zone.reports else 0,
        assigned_user_count=len(zone.assigned_users) if zone.assigned_users else 0,
    )


@router.patch("/{zone_id}", response_model=ZoneResponse)
def update_zone(
    zone_id: int,
    zone_in: ZoneUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_user),
):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Only admins can update zones")
    zone = crud_zone.update_zone(db, zone_id, zone_in)
    if not zone:
        raise HTTPException(status_code=404, detail="Zone not found")
    return ZoneResponse(
        id=zone.id, name=zone.name, description=zone.description,
        lat_min=zone.lat_min, lat_max=zone.lat_max,
        lng_min=zone.lng_min, lng_max=zone.lng_max,
        is_active=zone.is_active, created_at=zone.created_at,
        report_count=len(zone.reports) if zone.reports else 0,
        assigned_user_count=len(zone.assigned_users) if zone.assigned_users else 0,
    )


@router.get("/{zone_id}/stats")
def get_zone_stats(
    zone_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_user),
):
    """Get report stats for a zone"""
    if current_user.role not in ("admin", "official"):
        raise HTTPException(status_code=403, detail="Admin access required")
    zone = crud_zone.get_zone(db, zone_id)
    if not zone:
        raise HTTPException(status_code=404, detail="Zone not found")
    return crud_zone.get_zone_stats(db, zone_id)


@router.post("/assign")
def assign_user_to_zone(
    body: ZoneAssign,
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_user),
):
    """Assign an official/admin to a zone — admin only"""
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Only admins can assign zones")
    zone = crud_zone.get_zone(db, body.zone_id)
    if not zone:
        raise HTTPException(status_code=404, detail="Zone not found")
    user = crud_zone.assign_user_to_zone(db, body.user_id, body.zone_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return {"message": f"User {user.email} assigned to zone {zone.name}", "zone_id": zone.id}


@router.post("/unassign/{user_id}")
def unassign_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_user),
):
    """Remove a user from their zone — admin only"""
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Only admins can unassign zones")
    user = crud_zone.unassign_user_from_zone(db, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return {"message": f"User {user.email} unassigned from zone"}


@router.get("/{zone_id}/officials")
def list_zone_officials(
    zone_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_user),
):
    """List officials assigned to a zone"""
    if current_user.role not in ("admin", "official"):
        raise HTTPException(status_code=403, detail="Admin access required")
    users = db.query(User).filter(User.zone_id == zone_id).all()
    return [
        {"id": u.id, "email": u.email, "full_name": u.full_name, "role": u.role}
        for u in users
    ]
