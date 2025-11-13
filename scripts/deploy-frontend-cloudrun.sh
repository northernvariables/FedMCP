#!/bin/bash
# CanadaGPT Frontend - Cloud Run Deployment Script
# Builds Docker image and deploys to Google Cloud Run with scale-to-zero configuration

set -e  # Exit on error

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}============================================${NC}"
echo -e "${BLUE}  CanadaGPT Frontend - Cloud Run Deployment${NC}"
echo -e "${BLUE}============================================${NC}"
echo ""

# Configuration
PROJECT_ID="canada-gpt-ca"
REGION="us-central1"
SERVICE_NAME="canadagpt-frontend"
IMAGE_NAME="canadagpt-frontend"
REGISTRY_URL="us-central1-docker.pkg.dev/${PROJECT_ID}/canadagpt"
IMAGE_TAG=$(date +%Y%m%d-%H%M%S)
FULL_IMAGE_PATH="${REGISTRY_URL}/${IMAGE_NAME}:${IMAGE_TAG}"
LATEST_IMAGE_PATH="${REGISTRY_URL}/${IMAGE_NAME}:latest"

# Environment variables (you'll be prompted for these if not set)
GRAPHQL_URL="${NEXT_PUBLIC_GRAPHQL_URL:-https://canadagpt-graph-api-213428056473.us-central1.run.app/graphql}"
BASE_URL="${NEXT_PUBLIC_BASE_URL:-https://canadagpt.ca}"

# Check if gcloud is authenticated
echo -e "${YELLOW}→ Checking GCP authentication...${NC}"
if ! gcloud auth list --filter=status:ACTIVE --format="value(account)" | grep -q .; then
    echo -e "${RED}✗ Not authenticated with gcloud. Please run:${NC}"
    echo -e "${RED}  gcloud auth login${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Authenticated${NC}"

# Set project
echo -e "${YELLOW}→ Setting GCP project to ${PROJECT_ID}...${NC}"
gcloud config set project ${PROJECT_ID}
echo -e "${GREEN}✓ Project set${NC}"

# Supabase credentials are loaded from GCP Secret Manager
echo ""
echo -e "${BLUE}============================================${NC}"
echo -e "${BLUE}  Configuration${NC}"
echo -e "${BLUE}============================================${NC}"
echo ""
echo -e "${YELLOW}Supabase and Auth credentials will be loaded from GCP Secret Manager${NC}"
echo -e "${YELLOW}Secrets required:${NC}"
echo -e "${YELLOW}  - supabase-url${NC}"
echo -e "${YELLOW}  - supabase-anon-key${NC}"
echo -e "${YELLOW}  - supabase-service-role-key${NC}"
echo -e "${YELLOW}  - canadagpt-auth-secret${NC}"
echo -e "${YELLOW}  - google-client-id, google-client-secret (OAuth)${NC}"
echo -e "${YELLOW}  - encryption-key${NC}"
echo -e "${YELLOW}  - stripe-secret-key, stripe-publishable-key, stripe-webhook-secret${NC}"
echo ""

# Configure Docker for Artifact Registry
echo ""
echo -e "${YELLOW}→ Configuring Docker for Artifact Registry...${NC}"
gcloud auth configure-docker ${REGION}-docker.pkg.dev --quiet
echo -e "${GREEN}✓ Docker configured${NC}"

# Build Docker image
echo ""
echo -e "${BLUE}============================================${NC}"
echo -e "${BLUE}  Building Docker Image${NC}"
echo -e "${BLUE}============================================${NC}"
echo ""
echo -e "${YELLOW}→ Building image: ${FULL_IMAGE_PATH}${NC}"
echo -e "${YELLOW}   This may take 5-10 minutes...${NC}"
echo ""

cd "$(dirname "$0")/.."  # Go to repo root

docker build \
  --platform linux/amd64 \
  --build-arg NEXT_PUBLIC_GRAPHQL_URL="${GRAPHQL_URL}" \
  --build-arg NEXT_PUBLIC_GRAPHQL_API_KEY="9587c9820b109977a43a9302c23d051d98eff56050581eab63784b0b7f08152d" \
  --build-arg NEXT_PUBLIC_BASE_URL="${BASE_URL}" \
  --build-arg NEXT_PUBLIC_SUPABASE_URL="https://s.canadagpt.ca" \
  --build-arg NEXT_PUBLIC_SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBieHloY2R6ZG92c2Rsc3lpeHNrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIyNzc2ODUsImV4cCI6MjA3Nzg1MzY4NX0.zR_b05FSY35hm0TvJHWtzmQqI5hlpBbbw5rZjLOnWpI" \
  -t ${FULL_IMAGE_PATH} \
  -t ${LATEST_IMAGE_PATH} \
  -f packages/frontend/Dockerfile \
  .

# Note: Public Supabase credentials (URL and anon key) are build args since they're exposed to browsers anyway.
# Sensitive service role key is loaded at runtime from GCP Secret Manager.

# NOTE: AUTH_SECRET is intentionally NOT passed as a build-arg to prevent it from
# being baked into the Docker image. It is only passed as a runtime environment
# variable during Cloud Run deployment (see --set-env-vars below).

echo ""
echo -e "${GREEN}✓ Docker image built successfully${NC}"

# Push to Artifact Registry
echo ""
echo -e "${BLUE}============================================${NC}"
echo -e "${BLUE}  Pushing to Artifact Registry${NC}"
echo -e "${BLUE}============================================${NC}"
echo ""
echo -e "${YELLOW}→ Pushing ${FULL_IMAGE_PATH}...${NC}"
docker push ${FULL_IMAGE_PATH}
echo -e "${YELLOW}→ Pushing ${LATEST_IMAGE_PATH}...${NC}"
docker push ${LATEST_IMAGE_PATH}
echo -e "${GREEN}✓ Images pushed${NC}"

# Deploy to Cloud Run
echo ""
echo -e "${BLUE}============================================${NC}"
echo -e "${BLUE}  Deploying to Cloud Run${NC}"
echo -e "${BLUE}============================================${NC}"
echo ""
echo -e "${YELLOW}→ Deploying ${SERVICE_NAME}...${NC}"

gcloud run deploy ${SERVICE_NAME} \
  --image=${FULL_IMAGE_PATH} \
  --platform=managed \
  --region=${REGION} \
  --allow-unauthenticated \
  --min-instances=0 \
  --max-instances=10 \
  --memory=512Mi \
  --cpu=1 \
  --timeout=60 \
  --service-account=canadagpt-frontend-sa@canada-gpt-ca.iam.gserviceaccount.com \
  --set-env-vars="NEXT_PUBLIC_GRAPHQL_URL=${GRAPHQL_URL},NEXT_PUBLIC_GRAPHQL_API_KEY=9587c9820b109977a43a9302c23d051d98eff56050581eab63784b0b7f08152d,NEXT_PUBLIC_BASE_URL=${BASE_URL},NEXT_PUBLIC_APP_URL=${BASE_URL},AUTH_TRUST_HOST=true,NEXTAUTH_URL=${BASE_URL},NODE_ENV=production" \
  --set-secrets="NEXT_PUBLIC_SUPABASE_URL=supabase-url:latest,NEXT_PUBLIC_SUPABASE_ANON_KEY=supabase-anon-key:latest,SUPABASE_SERVICE_ROLE_KEY=supabase-service-role-key:latest,AUTH_SECRET=canadagpt-auth-secret:latest,GOOGLE_CLIENT_ID=google-client-id:latest,GOOGLE_CLIENT_SECRET=google-client-secret:latest,GITHUB_CLIENT_ID=github-client-id:latest,GITHUB_CLIENT_SECRET=github-client-secret:latest,FACEBOOK_CLIENT_ID=facebook-client-id:latest,FACEBOOK_CLIENT_SECRET=facebook-client-secret:latest,LINKEDIN_CLIENT_ID=linkedin-client-id:latest,LINKEDIN_CLIENT_SECRET=linkedin-client-secret:latest,ENCRYPTION_KEY=encryption-key:latest,STRIPE_SECRET_KEY=stripe-secret-key:latest,NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=stripe-publishable-key:latest,STRIPE_WEBHOOK_SECRET=stripe-webhook-secret:latest" \
  --port=3000

echo ""
echo -e "${GREEN}✓ Deployment complete!${NC}"

# Get service URL
SERVICE_URL=$(gcloud run services describe ${SERVICE_NAME} --region=${REGION} --format='value(status.url)')

echo ""
echo -e "${BLUE}============================================${NC}"
echo -e "${BLUE}  Deployment Summary${NC}"
echo -e "${BLUE}============================================${NC}"
echo ""
echo -e "${GREEN}Service Name:${NC}      ${SERVICE_NAME}"
echo -e "${GREEN}Region:${NC}            ${REGION}"
echo -e "${GREEN}Image:${NC}             ${FULL_IMAGE_PATH}"
echo -e "${GREEN}Service URL:${NC}       ${SERVICE_URL}"
echo -e "${GREEN}Min Instances:${NC}     0 (scale-to-zero enabled)"
echo -e "${GREEN}Max Instances:${NC}     10"
echo -e "${GREEN}Memory:${NC}            512Mi"
echo -e "${GREEN}GraphQL API:${NC}       ${GRAPHQL_URL}"
echo ""
echo -e "${YELLOW}→ Testing health endpoint...${NC}"
if curl -s "${SERVICE_URL}/api/health" | grep -q "ok"; then
    echo -e "${GREEN}✓ Health check passed!${NC}"
else
    echo -e "${RED}⚠  Health check failed (service may still be starting)${NC}"
fi

echo ""
echo -e "${BLUE}============================================${NC}"
echo -e "${BLUE}  Next Steps${NC}"
echo -e "${BLUE}============================================${NC}"
echo ""
echo "1. Test the deployment:"
echo -e "   ${SERVICE_URL}"
echo ""
echo "2. Test bilingual routing:"
echo -e "   ${SERVICE_URL}/en"
echo -e "   ${SERVICE_URL}/fr"
echo ""
echo "3. Monitor logs:"
echo -e "   gcloud run services logs read ${SERVICE_NAME} --region=${REGION} --limit=50"
echo ""
echo "4. To update deployment:"
echo -e "   ./scripts/deploy-frontend-cloudrun.sh"
echo ""
echo "5. To add custom domain later:"
echo -e "   gcloud run domain-mappings create --service=${SERVICE_NAME} --domain=canadagpt.ca --region=${REGION}"
echo ""
echo -e "${GREEN}Deployment completed successfully! 🎉${NC}"
