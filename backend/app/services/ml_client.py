"""
ML Service Client - Backend Integration
Handles all communication with ML Service on port 8000
"""
import httpx
import logging
from typing import Dict, Optional
import os

logger = logging.getLogger(__name__)

class MLServiceClient:
    """Client for ML Service API"""
    
    def __init__(self):
        self.base_url = os.getenv("ML_SERVICE_URL", "http://localhost:8000")
        self.timeout = 30.0
        logger.info(f"✅ ML Service Client initialized: {self.base_url}")
    
    async def analyze_text(self, text: str, latitude: float, longitude: float) -> Dict:
        """
        Analyze report text using ML service
        
        Args:
            text: Report description
            latitude: Location latitude
            longitude: Location longitude
            
        Returns:
            ML analysis with hazard detection, sentiment, entities, credibility
        """
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.post(
                    f"{self.base_url}/api/v1/analyze/report",
                    json={
                        "text": text,
                        "latitude": latitude,
                        "longitude": longitude,
                        "has_media": False,
                        "media_count": 0,
                        "author_followers": 0,
                        "timestamp": "2024-01-01T00:00:00Z"
                    }
                )
                
                if response.status_code == 200:
                    data = response.json()

                    # Safely extract nested fields
                    hazard = data.get('hazard_detection', {})
                    if isinstance(hazard, str):
                        hazard = {'hazard_type': hazard, 'confidence': 0.5, 'is_hazard': True}

                    logger.info(
                        f"✅ ML Analysis: {hazard.get('hazard_type', 'unknown')} "
                        f"(confidence: {hazard.get('confidence', 0):.2f})"
                    )
                    return {
                        "success": True,
                        "hazard_type": hazard.get('hazard_type', 'unknown'),
                        "confidence": hazard.get('confidence', 0.5),
                        "is_hazard": hazard.get('is_hazard', False),
                        "hazard_detected": hazard.get('is_hazard', False),
                        "credibility_score": data.get('credibility_score', 0.5),
                        "sentiment": data.get('sentiment', {}),
                        "entities": data.get('entities', {})
                    }
                else:
                    logger.error(f"❌ ML Service error: {response.status_code}")
                    return self._get_default_response()
                    
        except Exception as e:
            logger.error(f"❌ ML Service error: {e}")
            return self._get_default_response()
    
    async def verify_with_real_data(
        self, 
        hazard_type: str, 
        latitude: float, 
        longitude: float
    ) -> Dict:
        """
        Verify report against real ocean data
        
        Args:
            hazard_type: Type of hazard
            latitude: Location latitude
            longitude: Location longitude
            
        Returns:
            Verification results from real data sources
        """
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.post(
                    f"{self.base_url}/api/v1/verify/report",
                    params={
                        "hazard_type": hazard_type,
                        "latitude": latitude,
                        "longitude": longitude
                    }
                )
                
                if response.status_code == 200:
                    data = response.json()
                    return {
                        "success": True,
                        "verified": data.get("verified", False),
                        "confidence": data.get("confidence", 0.0),
                        "real_data": data.get("real_data", {})
                    }
                else:
                    return {"success": False, "verified": False}
                    
        except Exception as e:
            logger.error(f"❌ Verification error: {e}")
            return {"success": False, "verified": False}
    
    def _get_default_response(self) -> Dict:
        """Default response when ML service fails"""
        return {
            "success": False,
            "hazard_type": "unknown",
            "confidence": 0.0,
            "is_hazard": False,
            "credibility_score": 0.5,
            "sentiment": {"sentiment": "neutral"},
            "entities": {"locations": []}
        }


# Singleton instance
_ml_client = None


def get_ml_client() -> MLServiceClient:
    """Get singleton ML client instance"""
    global _ml_client
    if _ml_client is None:
        _ml_client = MLServiceClient()
    return _ml_client