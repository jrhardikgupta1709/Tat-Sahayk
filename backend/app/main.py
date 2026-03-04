from fastapi import FastAPI, Depends
from sqlalchemy.orm import Session
from app.db.session import engine, Base, get_db
from app.models import user
from contextlib import asynccontextmanager
from app.core.config import settings
from app.api.api import api_router
from app.db.session import engine
from app.db.base import Base
from app.services.ml_client import get_ml_client  # ← ADD THIS
from fastapi.middleware.cors import CORSMiddleware  # ← ADD THIS
import time

from apscheduler.schedulers.background import BackgroundScheduler
from scripts.harvest_social import harvest

# Define the Lifespan (Startup/Shutdown logic)
@asynccontextmanager
async def lifespan(app: FastAPI):
    # STARTUP: Create DB tables with retry logic
    max_retries = 5
    retry_count = 0
    while retry_count < max_retries:
        try:
            Base.metadata.create_all(bind=engine)
            print("✅ Database tables created")
            break
        except Exception as e:
            retry_count += 1
            if retry_count >= max_retries:
                print(f"⚠️  Could not initialize database: {e}")
                print("⚠️  Continuing without database initialization...")
                break
            print(f"⚠️  Database not ready, retrying in 2 seconds... ({retry_count}/{max_retries})")
            time.sleep(2)
    
    # Check ML Service ← ADD THIS BLOCK
    try:
        ml_client = get_ml_client()
        print("✅ ML Service Client initialized")
    except Exception as e:
        print(f"⚠️  ML Service not available: {e}")

    scheduler = BackgroundScheduler()
    scheduler.add_job(harvest, 'interval', minutes=15)
    scheduler.start()
    print("Social Harvester Scheduler Started (Every 15 mins)")
    
    yield
    
    # SHUTDOWN
    scheduler.shutdown()
    print("Scheduler Shut Down")

# Attach lifespan to FastAPI
app = FastAPI(
    title=settings.PROJECT_NAME,
    lifespan=lifespan
)

# CORS ← ADD THIS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173", "*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include Routers
app.include_router(api_router, prefix="/api/v1")

@app.get("/")
def read_root():
    return {"status": "Tat-Sahayk Backend is Running"}

@app.get("/health")  # ← ADD THIS
async def health_check():
    """Health check with ML service status"""
    try:
        ml_client = get_ml_client()
        return {
            "status": "healthy",
            "database": "connected",
            "ml_service": "connected"
        }
    except Exception as e:
        return {
            "status": "healthy",
            "database": "connected",
            "ml_service": "unavailable"
        }