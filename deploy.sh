#!/bin/bash
# Deploy ShowMe to Google Cloud Run
# Usage: ./deploy.sh

set -e

# Configuration
PROJECT_ID="project-a23ec95e-0a5a-443a-a7a"
REGION="us-central1"
SERVICE_NAME="showme"
IMAGE_NAME="gcr.io/${PROJECT_ID}/${SERVICE_NAME}"

echo "=== ShowMe Cloud Run Deployment ==="
echo "Project: ${PROJECT_ID}"
echo "Region: ${REGION}"
echo "Service: ${SERVICE_NAME}"
echo ""

# Check if gcloud is installed
if ! command -v gcloud &> /dev/null; then
    echo "Error: gcloud CLI is not installed."
    echo "Install it from: https://cloud.google.com/sdk/docs/install"
    exit 1
fi

# Check if user is authenticated
if ! gcloud auth list --filter=status:ACTIVE --format="value(account)" | head -1 > /dev/null 2>&1; then
    echo "Please authenticate with Google Cloud:"
    gcloud auth login
fi

# Set project
echo "Setting project to ${PROJECT_ID}..."
gcloud config set project ${PROJECT_ID}

# Enable required APIs (if not already enabled)
echo "Enabling required APIs..."
gcloud services enable cloudbuild.googleapis.com run.googleapis.com containerregistry.googleapis.com --quiet

# Build and push container using Cloud Build
echo ""
echo "Building container with Cloud Build..."
gcloud builds submit --tag ${IMAGE_NAME} .

# Deploy to Cloud Run
echo ""
echo "Deploying to Cloud Run..."
gcloud run deploy ${SERVICE_NAME} \
    --image ${IMAGE_NAME} \
    --platform managed \
    --region ${REGION} \
    --allow-unauthenticated \
    --set-env-vars="NODE_ENV=production" \
    --set-secrets="GEMINI_API_KEY=GEMINI_API_KEY:latest" \
    --memory=512Mi \
    --cpu=1 \
    --min-instances=0 \
    --max-instances=10 \
    --timeout=300

# Get the service URL
echo ""
echo "=== Deployment Complete ==="
SERVICE_URL=$(gcloud run services describe ${SERVICE_NAME} --region=${REGION} --format='value(status.url)')
echo "Your app is live at: ${SERVICE_URL}"
echo ""
echo "Open this URL on your mobile browser to use ShowMe!"
