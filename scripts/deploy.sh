#!/bin/bash
# Deploy ShowMe to Google Cloud Run
# Usage: ./deploy.sh

set -e

# Configuration
PROJECT_ID="project-a23ec95e-0a5a-443a-a7a"
REGION="us-central1"
SERVICE_NAME="showme"
REPO_NAME="showme-repo"
IMAGE_NAME="${REGION}-docker.pkg.dev/${PROJECT_ID}/${REPO_NAME}/${SERVICE_NAME}"
SHOWME_GCS_BUCKET="${SHOWME_GCS_BUCKET:-showme-slides-project-a23ec95e-0a5a-443a-a7a}"

echo "=== ShowMe Cloud Run Deployment ==="
echo "Project: ${PROJECT_ID}"
echo "Region: ${REGION}"
echo "Service: ${SERVICE_NAME}"
echo "GCS Bucket: ${SHOWME_GCS_BUCKET}"
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
gcloud services enable \
    cloudbuild.googleapis.com \
    run.googleapis.com \
    artifactregistry.googleapis.com \
    firestore.googleapis.com \
    storage.googleapis.com \
    --quiet

# Ensure Firestore database exists
echo "Ensuring Firestore database exists..."
if ! gcloud firestore databases describe --database="(default)" > /dev/null 2>&1; then
    gcloud firestore databases create \
        --database="(default)" \
        --location=${REGION} \
        --type=firestore-native
fi

# Ensure GCS bucket exists for slide images
echo "Ensuring GCS bucket exists..."
if ! gcloud storage buckets describe "gs://${SHOWME_GCS_BUCKET}" > /dev/null 2>&1; then
    gcloud storage buckets create "gs://${SHOWME_GCS_BUCKET}" \
        --location=${REGION} \
        --uniform-bucket-level-access \
        --public-access-prevention
fi

# Ensure Cloud Run service account has access to Firestore + GCS + signed URLs
echo "Ensuring IAM roles for Cloud Run service account..."
SERVICE_ACCOUNT=$(gcloud run services describe ${SERVICE_NAME} \
    --region=${REGION} \
    --format="value(spec.template.spec.serviceAccountName)" 2>/dev/null || true)
if [ -z "${SERVICE_ACCOUNT}" ]; then
    PROJECT_NUMBER=$(gcloud projects describe ${PROJECT_ID} --format="value(projectNumber)")
    SERVICE_ACCOUNT="${PROJECT_NUMBER}-compute@developer.gserviceaccount.com"
fi

gcloud projects add-iam-policy-binding ${PROJECT_ID} \
    --member="serviceAccount:${SERVICE_ACCOUNT}" \
    --role="roles/firestore.user" \
    --quiet

gcloud projects add-iam-policy-binding ${PROJECT_ID} \
    --member="serviceAccount:${SERVICE_ACCOUNT}" \
    --role="roles/storage.objectAdmin" \
    --quiet

gcloud iam service-accounts add-iam-policy-binding ${SERVICE_ACCOUNT} \
    --member="serviceAccount:${SERVICE_ACCOUNT}" \
    --role="roles/iam.serviceAccountTokenCreator" \
    --project=${PROJECT_ID} \
    --quiet

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
    --set-env-vars="NODE_ENV=production,SHOWME_GCS_BUCKET=${SHOWME_GCS_BUCKET}" \
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
