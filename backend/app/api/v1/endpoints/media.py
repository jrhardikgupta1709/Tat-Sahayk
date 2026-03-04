import cloudinary
import cloudinary.uploader
from fastapi import APIRouter, UploadFile, File, HTTPException
from fastapi.responses import FileResponse
from app.core.config import settings
import os
import uuid
from pathlib import Path

router = APIRouter()

# Initialize Cloudinary Configuration
if settings.CLOUDINARY_CLOUD_NAME:
    cloudinary.config( 
      cloud_name = settings.CLOUDINARY_CLOUD_NAME, 
      api_key = settings.CLOUDINARY_API_KEY, 
      api_secret = settings.CLOUDINARY_API_SECRET,
      secure = True
    )

# Create uploads directory if it doesn't exist
UPLOADS_DIR = Path(__file__).parent.parent.parent.parent.parent / "uploads"
UPLOADS_DIR.mkdir(exist_ok=True)

"""
═══════════════════════════════════════════════════════════════════════════════
CLOUDINARY INTEGRATION GUIDE
═══════════════════════════════════════════════════════════════════════════════

The media upload endpoint supports TWO storage backends:

1. LOCAL STORAGE (Current - Development)
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   - Files saved to: /backend/uploads/
   - Served via: GET /api/v1/media/{file_id}
   - No external dependencies required
   - Good for development and testing
   - .env configuration: Leave CLOUDINARY variables empty

2. CLOUDINARY (Production - Recommended)
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   - Files uploaded to: https://cloudinary.com/
   - Automatic optimization, resizing, caching
   - Global CDN distribution
   - Requires account and API credentials

HOW TO SETUP CLOUDINARY:
━━━━━━━━━━━━━━━━━━━━━━━

Step 1: Create Cloudinary Account
   1. Go to https://cloudinary.com/users/register/free
   2. Sign up with email
   3. Verify email

Step 2: Get Credentials
   1. Go to Dashboard: https://cloudinary.com/console
   2. Find these values:
      - Cloud Name
      - API Key
      - API Secret

Step 3: Update .env File
   Edit /backend/.env and add:
   
   CLOUDINARY_CLOUD_NAME=your_cloud_name
   CLOUDINARY_API_KEY=your_api_key
   CLOUDINARY_API_SECRET=your_api_secret

Step 4: Restart Backend
   The upload endpoint will automatically detect the credentials and start
   uploading to Cloudinary instead of local storage.

Step 5: Verify
   - Submit a report with images
   - Images should appear in your Cloudinary dashboard
   - Check console logs: Should show "☁️  Uploading to Cloudinary..."

TESTING THE UPLOAD FLOW:
━━━━━━━━━━━━━━━━━━━━━━

# Test without Cloudinary (local storage)
curl -X POST "http://localhost:5001/api/v1/media/upload" \\
  -F "file=@test_image.jpg"

# Response (local):
{
  "filename": "test_image.jpg",
  "file_path": "/api/v1/media/abc123def456",
  "file_id": "abc123def456",
  "storage": "local"
}

# Test with Cloudinary (after setup)
# Same curl command, but you'll get:
{
  "filename": "test_image.jpg",
  "file_path": "https://res.cloudinary.com/your_cloud/image/upload/...",
  "storage": "cloudinary"
}

═══════════════════════════════════════════════════════════════════════════════
"""

@router.post("/upload")
async def upload_file(file: UploadFile = File(...)):
    """Upload file to Cloudinary or local storage
    
    Priority:
    1. If Cloudinary configured → upload to Cloudinary
    2. If Cloudinary not configured → save to local /uploads directory
    
    Returns file_path that can be served via /media/{file_id} endpoint
    """
    try:
        # Check if Cloudinary is configured
        if settings.CLOUDINARY_CLOUD_NAME and settings.CLOUDINARY_API_KEY:
            print(f"☁️  Uploading to Cloudinary...")
            # Upload to Cloudinary if configured
            result = cloudinary.uploader.upload(file.file, folder="tat_sahayk_reports")
            url = result.get("secure_url")
            print(f"✅ Uploaded to Cloudinary: {url}")
            return {"filename": file.filename, "file_path": url, "storage": "cloudinary"}
        else:
            print(f"💾 Cloudinary not configured - saving to local storage")
            # Save to local /uploads directory
            file_extension = Path(file.filename).suffix
            file_id = str(uuid.uuid4())
            local_filename = f"{file_id}{file_extension}"
            file_path = UPLOADS_DIR / local_filename
            
            # Read and save file
            contents = await file.read()
            with open(file_path, "wb") as f:
                f.write(contents)
            
            # Return API URL that can be served by the /media/{file_id} endpoint
            api_url = f"/api/v1/media/{file_id}"
            print(f"✅ Saved locally: {file_path}")
            print(f"📡 Serve via: {api_url}")
            return {
                "filename": file.filename,
                "file_path": api_url,
                "file_id": file_id,
                "storage": "local"
            }

    except Exception as e:
        print(f"❌ Error uploading file: {e}")
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")


@router.get("/{file_id}")
async def serve_file(file_id: str):
    """Serve locally stored files
    
    Usage: GET /api/v1/media/{file_id}
    Returns the file if it exists in the uploads directory
    
    Note: This is only used for LOCAL storage. Cloudinary files are served
    directly from Cloudinary's CDN via the secure_url returned from upload.
    """
    # Search for file with matching ID in uploads directory
    import logging
    logger = logging.getLogger(__name__)
    
    logger.info(f"📥 Serve request for: {file_id}")
    logger.info(f"   UPLOADS_DIR: {UPLOADS_DIR}")
    logger.info(f"   UPLOADS_DIR exists: {UPLOADS_DIR.exists()}")
    logger.info(f"   Pattern: {file_id}.*")
    
    # List all files in directory
    all_files = list(UPLOADS_DIR.glob("*"))
    logger.info(f"   Files in directory: {[f.name for f in all_files]}")
    
    matches = list(UPLOADS_DIR.glob(f"{file_id}.*"))
    logger.info(f"   Matches found: {len(matches)}")
    
    for file_path in matches:
        logger.info(f"✅ Serving: {file_path}")
        return FileResponse(file_path)
    
    logger.warning(f"❌ No file found for: {file_id}")
    raise HTTPException(status_code=404, detail="File not found")