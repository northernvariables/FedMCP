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

# Prompt for Supabase credentials
echo ""
echo -e "${BLUE}============================================${NC}"
echo -e "${BLUE}  Supabase Configuration${NC}"
echo -e "${BLUE}============================================${NC}"
echo ""
echo -e "${YELLOW}Please enter your Supabase credentials:${NC}"
echo -e "${YELLOW}(You can find these in your Supabase project settings → API)${NC}"
echo ""

read -p "Supabase Project URL (NEXT_PUBLIC_SUPABASE_URL): " SUPABASE_URL
read -p "Supabase Anon Key (NEXT_PUBLIC_SUPABASE_ANON_KEY): " SUPABASE_ANON_KEY
read -sp "Supabase Service Role Key (SUPABASE_SERVICE_ROLE_KEY): " SUPABASE_SERVICE_ROLE_KEY
echo ""  # New line after password input

echo ""
echo -e "${YELLOW}NextAuth Configuration:${NC}"
echo -e "${YELLOW}If you don't have an AUTH_SECRET, generate one with: openssl rand -base64 32${NC}"
read -sp "NextAuth Secret (AUTH_SECRET): " AUTH_SECRET
echo ""  # New line after password input

if [ -z "$SUPABASE_URL" ] || [ -z "$SUPABASE_ANON_KEY" ] || [ -z "$SUPABASE_SERVICE_ROLE_KEY" ] || [ -z "$AUTH_SECRET" ]; then
    echo -e "${RED}✗ All credentials are required (Supabase + AUTH_SECRET)${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Supabase credentials provided${NC}"

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
  --build-arg NEXT_PUBLIC_SUPABASE_URL="${SUPABASE_URL}" \
  --build-arg NEXT_PUBLIC_SUPABASE_ANON_KEY="${SUPABASE_ANON_KEY}" \
  --build-arg NEXT_PUBLIC_BASE_URL="${BASE_URL}" \
  --build-arg AUTH_SECRET="${AUTH_SECRET}" \
  -t ${FULL_IMAGE_PATH} \
  -t ${LATEST_IMAGE_PATH} \
  -f packages/frontend/Dockerfile \
  .

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
  --set-env-vars="NEXT_PUBLIC_GRAPHQL_URL=${GRAPHQL_URL},NEXT_PUBLIC_SUPABASE_URL=${SUPABASE_URL},NEXT_PUBLIC_SUPABASE_ANON_KEY=${SUPABASE_ANON_KEY},NEXT_PUBLIC_BASE_URL=${BASE_URL},SUPABASE_SERVICE_ROLE_KEY=${SUPABASE_SERVICE_ROLE_KEY},AUTH_SECRET=${AUTH_SECRET},AUTH_TRUST_HOST=true,NODE_ENV=production" \
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
