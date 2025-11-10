#!/bin/bash
set -e

# Configuration
PROJECT_ID="canada-gpt-ca"
REGION="us-central1"
SERVICE_NAME="canadagpt-graph-api"
IMAGE="us-central1-docker.pkg.dev/${PROJECT_ID}/canadagpt/graph-api:latest"
NEO4J_INTERNAL_IP="10.128.0.3"
NEO4J_PASSWORD="canadagpt2024"

echo "========================================="
echo "Deploying CanadaGPT GraphQL API to Cloud Run"
echo "========================================="
echo ""
echo "Service: $SERVICE_NAME"
echo "Image: $IMAGE"
echo "Region: $REGION"
echo ""

# Deploy to Cloud Run with Direct VPC Egress
gcloud run deploy $SERVICE_NAME \
  --image=$IMAGE \
  --platform=managed \
  --region=$REGION \
  --project=$PROJECT_ID \
  --allow-unauthenticated \
  --port=4000 \
  --memory=1Gi \
  --cpu=1 \
  --min-instances=0 \
  --max-instances=10 \
  --timeout=300 \
  --set-env-vars="NEO4J_URI=bolt://${NEO4J_INTERNAL_IP}:7687,NEO4J_USER=neo4j,NEO4J_PASSWORD=${NEO4J_PASSWORD},NODE_ENV=production" \
  --set-env-vars="CORS_ORIGINS=https^:^//canadagpt.ca,http^:^//localhost^:^3000,https^:^//www.canadagpt.ca" \
  --vpc-connector=canadagpt-connector \
  --vpc-egress=private-ranges-only

echo ""
echo "========================================="
echo "✅ Deployment Complete!"
echo "========================================="

# Get the service URL
SERVICE_URL=$(gcloud run services describe $SERVICE_NAME --region=$REGION --project=$PROJECT_ID --format="value(status.url)")

echo ""
echo "📡 GraphQL API URL: $SERVICE_URL/graphql"
echo ""
echo "Test with:"
echo "  curl $SERVICE_URL/graphql?query={__typename}"
echo ""
