from typing import List, Optional
from collections import defaultdict
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from app.api import deps
from app.crud import report as crud_report
from app.crud import zone as crud_zone
from app.crud.notification import haversine_km
from app.crud import notification as crud_notification
from app.schemas.report import ReportCreate, ReportResponse, SOSRequest
from app.schemas.notification import NotificationCreate
from app.db.session import get_db
from app.models.user import User
from app.models.report import Report
from app.services.ml_client import get_ml_client
import logging

router = APIRouter()
logger = logging.getLogger(__name__)

# ── Rate limiting: 5 reports per 4 hours per user ──
RATE_LIMIT_WINDOW = timedelta(hours=4)
RATE_LIMIT_MAX = 5
_report_timestamps: dict[int, list] = defaultdict(list)

def _check_rate_limit(user_id: int) -> bool:
    """Return True if user is within rate limit, False if exceeded."""
    now = datetime.utcnow()
    cutoff = now - RATE_LIMIT_WINDOW
    _report_timestamps[user_id] = [t for t in _report_timestamps[user_id] if t > cutoff]
    if len(_report_timestamps[user_id]) >= RATE_LIMIT_MAX:
        return False
    return True

def _record_report(user_id: int):
    _report_timestamps[user_id].append(datetime.utcnow())

@router.post("/", response_model=ReportResponse)
async def create_report(
    *,
    db: Session = Depends(get_db),
    report_in: ReportCreate,
    current_user: User = Depends(deps.get_current_user)
):
    """
    Create a new hazard report with ML analysis
    
    Flow:
    1. User submits report
    2. Call ML service for analysis
    3. Optionally verify with real data
    4. Save report with ML results
    5. Return enriched report
    """
    try:
        logger.info(f"📝 Creating report for user: {current_user.email}")
        
        # Rate limit check: 5 reports per 4 hours
        if not _check_rate_limit(current_user.id):
            remaining = RATE_LIMIT_WINDOW.total_seconds()
            raise HTTPException(
                status_code=429,
                detail=f"Rate limit exceeded. You can submit up to {RATE_LIMIT_MAX} reports every {int(RATE_LIMIT_WINDOW.total_seconds() / 3600)} hours. Please try again later."
            )
        
        # Get ML client
        ml_client = get_ml_client()
        
        # Call ML Service for analysis
        logger.info("🤖 Calling ML service for analysis...")
        ml_result = await ml_client.analyze_text(
            text=report_in.description,
            latitude=report_in.latitude,
            longitude=report_in.longitude
        )
        
        # Log ML results
        if ml_result["success"]:
            logger.info(
                f"✅ ML Analysis Complete: "
                f"{ml_result['hazard_type']} "
                f"(confidence: {ml_result['confidence']:.2f})"
            )
            
            # Optionally verify with real data if confidence is high
            if ml_result['confidence'] > 0.7:
                verification = await ml_client.verify_with_real_data(
                    hazard_type=ml_result['hazard_type'],
                    latitude=report_in.latitude,
                    longitude=report_in.longitude
                )
                if verification.get("verified"):
                    logger.info("✅ VERIFIED by real ocean data!")
                    ml_result["verified_by_real_data"] = True
        else:
            logger.warning("⚠️  ML service failed, using default values")
        
        # Create report with ML analysis
        report = crud_report.create_report_with_ml(
            db=db,
            report=report_in,
            user_id=current_user.id,
            ml_analysis_data=ml_result
        )

        # Auto-assign report to a zone based on lat/lng
        zone = crud_zone.find_zone_for_point(db, report_in.latitude, report_in.longitude)
        if zone:
            report.zone_id = zone.id
            db.commit()
            db.refresh(report)
            logger.info(f"📍 Report assigned to zone: {zone.name}")
        
        logger.info(f"✅ Report created successfully: ID={report.id}")
        _record_report(current_user.id)
        
        return report
        
    except Exception as e:
        logger.error(f"❌ Error creating report: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to create report: {str(e)}"
        )


@router.post("/sos", response_model=ReportResponse)
async def sos_emergency(
    *,
    db: Session = Depends(get_db),
    sos_in: SOSRequest,
    current_user: User = Depends(deps.get_current_user),
):
    """
    One-click SOS emergency — creates a critical report with the user's location
    and notifies admins in the area.
    """
    try:
        logger.info(f"🚨 SOS from user: {current_user.email}")

        # Build a critical report
        report_data = ReportCreate(
            hazard_type="emergency",
            description=f"SOS Emergency Alert from {current_user.full_name or current_user.email}",
            severity="critical",
            latitude=sos_in.latitude,
            longitude=sos_in.longitude,
            image_filenames=[],
        )

        # Quick ML analysis
        ml_client = get_ml_client()
        ml_result = await ml_client.analyze_text(
            text=report_data.description,
            latitude=sos_in.latitude,
            longitude=sos_in.longitude,
        )

        # Create the report
        report = crud_report.create_report_with_ml(
            db=db,
            report=report_data,
            user_id=current_user.id,
            ml_analysis_data=ml_result,
        )

        # Auto-assign zone
        zone = crud_zone.find_zone_for_point(db, sos_in.latitude, sos_in.longitude)
        if zone:
            report.zone_id = zone.id
            db.commit()
            db.refresh(report)

        # Push a critical notification to admins in the area
        try:
            notif_payload = NotificationCreate(
                title="🚨 SOS Emergency Alert",
                message=f"Emergency reported by {current_user.full_name or current_user.email} at ({sos_in.latitude:.4f}, {sos_in.longitude:.4f})",
                severity="critical",
                category="evacuation",
                latitude=sos_in.latitude,
                longitude=sos_in.longitude,
                radius_km=50.0,
            )
            crud_notification.create_notification(db, notif_payload, current_user.id)
            logger.info("📢 SOS notification pushed to area users")
        except Exception as ne:
            logger.warning(f"⚠️  Could not push SOS notification: {ne}")

        logger.info(f"✅ SOS report created: ID={report.id}")
        return report

    except Exception as e:
        logger.error(f"❌ SOS error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"SOS failed: {str(e)}")


@router.get("/", response_model=List[ReportResponse])
def read_reports(
    db: Session = Depends(get_db),
    skip: int = 0,
    limit: int = 100,
):
    """Retrieve reports with pagination"""
    reports = crud_report.get_reports(db, skip=skip, limit=limit)
    return reports


@router.get("/stats")
def get_report_stats(db: Session = Depends(get_db)):
    """Get report statistics for dashboard"""
    total = db.query(Report).count()
    pending = db.query(Report).filter(Report.status == "pending").count()
    verified = db.query(Report).filter(Report.status == "verified").count()
    critical = db.query(Report).filter(Report.severity == "critical").count()

    return {
        "total_reports": total,
        "pending_review": pending,
        "verified_hazards": verified,
        "critical_alerts": critical
    }


@router.get("/feed", response_model=List[ReportResponse])
def get_verified_feed(
    db: Session = Depends(get_db),
    skip: int = 0,
    limit: int = 20,
    latitude: Optional[float] = Query(None, description="User latitude for radius filter"),
    longitude: Optional[float] = Query(None, description="User longitude for radius filter"),
    radius_km: float = Query(50.0, description="Radius in km (default 50)"),
):
    """
    Public crowdsource feed — returns only VERIFIED reports.
    If latitude/longitude are provided, only returns reports within radius_km.
    """
    query = (
        db.query(Report)
        .filter(Report.status == "verified")
        .order_by(Report.created_at.desc())
    )

    all_verified = query.all()

    # If user location provided, filter by radius
    if latitude is not None and longitude is not None:
        filtered = []
        for r in all_verified:
            if r.latitude and r.longitude:
                dist = haversine_km(latitude, longitude, r.latitude, r.longitude)
                if dist <= radius_km:
                    filtered.append(r)
        return filtered[skip : skip + limit]

    # No location — return all verified (fallback)
    return all_verified[skip : skip + limit]


@router.get("/by-zone", response_model=List[ReportResponse])
def get_reports_by_zone(
    zone_id: int = Query(..., description="Zone ID to filter by"),
    status: Optional[str] = Query(None, description="Filter by status"),
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_user),
    skip: int = 0,
    limit: int = 100,
):
    """
    Get reports filtered by zone — for zone-assigned admins/officials.
    """
    if current_user.role not in ("admin", "official"):
        raise HTTPException(status_code=403, detail="Admin access required")
    q = db.query(Report).filter(Report.zone_id == zone_id)
    if status:
        q = q.filter(Report.status == status)
    return q.order_by(Report.created_at.desc()).offset(skip).limit(limit).all()


@router.get("/hotspots")
async def get_hotspots(
    db: Session = Depends(get_db),
    hours: int = Query(24, description="Get reports from last N hours"),
    min_reports: int = Query(3, description="Minimum reports to form hotspot"),
    radius_km: float = Query(10.0, description="Clustering radius in km")
):
    """
    Detect hazard hotspots from recent reports
    
    Returns:
        Hotspot locations with severity and report counts
    """
    try:
        logger.info(f"🔥 Detecting hotspots: last {hours}h")
        
        # Get recent reports
        reports = crud_report.get_recent_reports_for_hotspots(db, hours=hours)
        
        if not reports:
            return {
                "hotspots": [],
                "total_count": 0,
                "message": "No recent reports"
            }
        
        logger.info(f"📊 Found {len(reports)} recent reports")
        
        # Call ML service for hotspot detection
        ml_client = get_ml_client()
        
        import httpx
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                f"{ml_client.base_url}/api/v1/hotspots/detect",
                json={
                    "reports": reports,
                    "min_reports": min_reports,
                    "radius_km": radius_km
                }
            )
            
            if response.status_code == 200:
                data = response.json()
                logger.info(f"✅ Detected {data['total_count']} hotspots")
                return data
            else:
                return {
                    "hotspots": [],
                    "total_count": 0,
                    "message": "Hotspot detection failed"
                }
                
    except Exception as e:
        logger.error(f"❌ Error detecting hotspots: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{report_id}", response_model=ReportResponse)
def get_report(report_id: int, db: Session = Depends(get_db)):
    """Get a single report by ID"""
    report = db.query(Report).filter(Report.id == report_id).first()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    return report


@router.patch("/{report_id}/verify", response_model=ReportResponse)
def verify_report(
    report_id: int,
    status: str = Query(..., description="verified, rejected, or pending"),
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_user)
):
    """Admin action to verify/reject report - requires admin role"""
    if current_user.role not in ("admin", "official"):
        raise HTTPException(status_code=403, detail="Admin access required")

    report = db.query(Report).filter(Report.id == report_id).first()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")

    report.status = status
    report.is_verified = (status == "verified")

    db.commit()
    db.refresh(report)
    return report