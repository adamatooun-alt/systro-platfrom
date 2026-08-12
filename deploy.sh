#!/bin/bash
# Script to build and deploy Systro to Google Cloud Run in europe-west1 region

# Set configurations
PROJECT_ID="nexwork-75325"
SERVICE_NAME="systro-live"
REGION="europe-west1"

echo "====================================================="
echo "⚡ Starting Systro Deployment to Google Cloud Run"
echo "====================================================="
echo "📍 Target Region: $REGION"
echo "🆔 Project ID:    $PROJECT_ID"
echo "🖥️ Service Name:  $SERVICE_NAME"
echo "====================================================="

# Ensure the correct GCP project is set
echo "🔄 Configuring GCP project..."
gcloud config set project $PROJECT_ID

# Deploy the service directly from source
echo "🚀 Deploying to Cloud Run..."
gcloud run deploy $SERVICE_NAME \
  --source . \
  --region $REGION \
  --allow-unauthenticated \
  --port 8080

echo "====================================================="
echo "✅ Deployment Completed Successfully!"
echo "🔗 Your service is now live in europe-west1!"
echo "====================================================="
