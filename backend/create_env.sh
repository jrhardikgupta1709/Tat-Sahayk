#!/bin/bash

cat > .env << 'EOF'
PROJECT_NAME=Tat-Sahayk Backend
DATABASE_URL=postgresql://$(hardik)@localhost:5432/tatsahayak
SECRET_KEY=dev-secret-key-change-in-production-12345678901234567890
ACCESS_TOKEN_EXPIRE_MINUTES=60
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
ML_SERVICE_URL=http://localhost:8000
EOF

echo "✅ .env file created!"
echo "Now run: uvicorn app.main:app --host 0.0.0.0 --port 5001 --reload"