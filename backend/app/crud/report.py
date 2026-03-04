from sqlalchemy.orm import Session
from app.models.report import Report
from app.models.media import Media
from app.schemas.report import ReportCreate
import logging

logger = logging.getLogger(__name__)

def create_report_with_ml(
    db: Session, 
    report: ReportCreate, 
    user_id: int,
    ml_analysis_data: dict = None
):
    """
    Create report with ML analysis results
    
    Args:
        db: Database session
        report: Report data from user
        user_id: User ID
        ml_analysis_data: ML service response
        
    Returns:
        Created report with ML analysis
    """
    # Extract ML results if available
    hazard_type = "unknown"
    credibility_score = 0.5
    ml_analysis_json = None
    
    if ml_analysis_data and ml_analysis_data.get("success"):
        # Get hazard type from ML
        hazard_type = ml_analysis_data.get("hazard_type", "unknown")
        credibility_score = ml_analysis_data.get("credibility_score", 0.5)
        
        # Prepare ML analysis for storage
        ml_analysis_json = {
            "hazard_detected": ml_analysis_data.get("is_hazard", False),
            "hazard_type": hazard_type,
            "confidence": ml_analysis_data.get("confidence", 0.0),
            "credibility_score": credibility_score,
            "sentiment": ml_analysis_data.get("sentiment", "neutral") if isinstance(ml_analysis_data.get("sentiment"), str) else ml_analysis_data.get("sentiment", {}).get("sentiment", "neutral") if isinstance(ml_analysis_data.get("sentiment"), dict) else "neutral",
            "entities": ml_analysis_data.get("entities", {}),
            "verified_by_real_data": False  # Will be updated if verified
        }
        
        logger.info(
            f"💾 Saving ML analysis: {hazard_type} "
            f"(confidence: {ml_analysis_json['confidence']:.2f}, "
            f"credibility: {credibility_score:.2f})"
        )
    
    # Create report with latitude/longitude
    db_report = Report(
        user_id=user_id,
        hazard_type=hazard_type,
        description=report.description,
        severity=report.severity,
        latitude=report.latitude,
        longitude=report.longitude,
        ml_analysis=ml_analysis_json,
        credibility_score=credibility_score,
        status="pending"
    )
    db.add(db_report)
    db.commit()
    db.refresh(db_report)

    # Link the Images (If any)
    if report.image_filenames:
        for filename in report.image_filenames:
            db_media = Media(
                report_id=db_report.id,
                file_path=filename,  # This will be Cloudinary URL
                file_type="image/jpeg"
            )
            db.add(db_media)
        
        db.commit()
        db.refresh(db_report)

    return db_report


def get_reports(
    db: Session, 
    skip: int = 0, 
    limit: int = 100
):
    """Get reports with pagination"""
    return db.query(Report).order_by(Report.created_at.desc()).offset(skip).limit(limit).all()


def get_recent_reports_for_hotspots(db: Session, hours: int = 24):
    """
    Get recent reports for hotspot detection
    
    Args:
        db: Database session
        hours: Get reports from last N hours
        
    Returns:
        List of reports formatted for ML service
    """
    from datetime import datetime, timedelta
    
    cutoff_time = datetime.utcnow() - timedelta(hours=hours)
    
    reports = (
        db.query(Report)
        .filter(Report.created_at >= cutoff_time)
        .filter(Report.hazard_type != "unknown")
        .all()
    )
    
    # Format for ML service
    return [
        {
            "latitude": report.latitude,
            "longitude": report.longitude,
            "hazard_type": report.hazard_type,
            "severity": report.severity,
            "created_at": report.created_at.isoformat()
        }
        for report in reports
    ]