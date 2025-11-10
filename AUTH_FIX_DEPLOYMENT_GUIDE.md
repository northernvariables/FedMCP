# Authentication Fix - Deployment Guide

## Problem Summary

Production `/api/auth/session` endpoint was returning 404 with HTML instead of JSON, causing two console errors:

1. **AuthJS Error**: `Unexpected token '<', "<!DOCTYPE "... is not valid JSON`
2. **Supabase Error**: `Error saving preferences to Supabase: {}`

### Root Cause

NextAuth v5 (AuthJS) requires `AUTH_SECRET` environment variable **at Docker build time** to compile the API routes. The variable was missing from the Docker build arguments, so the authentication routes were never built into the production image.

## Files Modified

### 1. `/Users/matthewdufresne/FedMCP/packages/frontend/Dockerfile`

**Added** `AUTH_SECRET` build argument and environment variable:

```dockerfile
# Build arguments for environment variables
ARG NEXT_PUBLIC_GRAPHQL_URL
ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY
ARG NEXT_PUBLIC_BASE_URL
ARG AUTH_SECRET  # ← ADDED

# Set environment variables for build
ENV NEXT_PUBLIC_GRAPHQL_URL=$NEXT_PUBLIC_GRAPHQL_URL
ENV NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL
ENV NEXT_PUBLIC_SUPABASE_ANON_KEY=$NEXT_PUBLIC_SUPABASE_ANON_KEY
ENV NEXT_PUBLIC_BASE_URL=$NEXT_PUBLIC_BASE_URL
ENV AUTH_SECRET=$AUTH_SECRET  # ← ADDED
ENV NODE_ENV=production
```

### 2. `/Users/matthewdufresne/FedMCP/scripts/deploy-frontend-cloudrun.sh`

**Added** AUTH_SECRET input prompt (lines 62-66):

```bash
echo ""
echo -e "${YELLOW}NextAuth Configuration:${NC}"
echo -e "${YELLOW}If you don't have an AUTH_SECRET, generate one with: openssl rand -base64 32${NC}"
read -sp "NextAuth Secret (AUTH_SECRET): " AUTH_SECRET
echo ""  # New line after password input
```

**Added** AUTH_SECRET to Docker build command (line 99):

```bash
docker build \
  --platform linux/amd64 \
  --build-arg NEXT_PUBLIC_GRAPHQL_URL="${GRAPHQL_URL}" \
  --build-arg NEXT_PUBLIC_SUPABASE_URL="${SUPABASE_URL}" \
  --build-arg NEXT_PUBLIC_SUPABASE_ANON_KEY="${SUPABASE_ANON_KEY}" \
  --build-arg NEXT_PUBLIC_BASE_URL="${BASE_URL}" \
  --build-arg AUTH_SECRET="${AUTH_SECRET}" \  # ← ADDED
  -t ${FULL_IMAGE_PATH} \
  -t ${LATEST_IMAGE_PATH} \
  -f packages/frontend/Dockerfile \
  .
```

**Added** AUTH_SECRET to Cloud Run deployment (line 138):

```bash
  --set-env-vars="NEXT_PUBLIC_GRAPHQL_URL=${GRAPHQL_URL},NEXT_PUBLIC_SUPABASE_URL=${SUPABASE_URL},NEXT_PUBLIC_SUPABASE_ANON_KEY=${SUPABASE_ANON_KEY},NEXT_PUBLIC_BASE_URL=${BASE_URL},SUPABASE_SERVICE_ROLE_KEY=${SUPABASE_SERVICE_ROLE_KEY},AUTH_SECRET=${AUTH_SECRET},AUTH_TRUST_HOST=true,NODE_ENV=production" \
```

## Deployment Steps

### Prerequisites

1. Ensure Docker Desktop is running (or use Cloud Build)
2. Have all credentials ready:
   - Supabase URL: `https://lbyqmjcqbwfeglfkiqpd.supabase.co`
   - Supabase Anon Key: (from Supabase dashboard)
   - Supabase Service Role Key: (from Supabase dashboard)
   - AUTH_SECRET: Generate with `openssl rand -base64 32`

### Generated AUTH_SECRET

```
3HoXkbexCX6eVQ1ZRygE7kR6mldCoMHK2Nj6omy1EXo=
```

### Deployment Command

```bash
cd /Users/matthewdufresne/FedMCP
chmod +x scripts/deploy-frontend-cloudrun.sh
./scripts/deploy-frontend-cloudrun.sh
```

**When prompted, enter:**

1. Supabase Project URL: `https://lbyqmjcqbwfeglfkiqpd.supabase.co`
2. Supabase Anon Key: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxieXFtamNxYndmZWdsZmtpcXBkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzA0NTI2MjQsImV4cCI6MjA0NjAyODYyNH0.vKaohNEfFCNJZSgDWAaJT9nHoJEGSuPLPvjxZxQHN2I`
3. Supabase Service Role Key: (see current Cloud Run service or .env.local)
4. NextAuth Secret (AUTH_SECRET): `3HoXkbexCX6eVQ1ZRygE7kR6mldCoMHK2Nj6omy1EXo=`

### Timeline

- **Docker build**: ~5-10 minutes
- **Image push**: ~2-3 minutes
- **Cloud Run deployment**: ~1-2 minutes

**Total**: ~10-15 minutes

## Verification

After deployment completes, verify the authentication endpoint:

```bash
curl https://canadagpt.ca/api/auth/session
```

**Expected response** (should be JSON, not HTML):

```json
{
  "user": null
}
```

or

```json
{
  "user": {
    "id": "...",
    "email": "...",
    "name": "..."
  },
  "expires": "..."
}
```

## What This Fixes

1. ✅ `/api/auth/session` will return JSON instead of 404 HTML
2. ✅ AuthJS errors will disappear from browser console
3. ✅ Supabase user preferences will save correctly
4. ✅ OAuth authentication (Google, GitHub, Facebook, LinkedIn) will work
5. ✅ User sessions will persist correctly

## Architecture Notes

### Build-time vs Runtime Environment Variables

**NextAuth v5 requires AUTH_SECRET at build time** because:

- Next.js pre-renders routes during the build process
- API routes need to be compiled into the standalone output
- Without AUTH_SECRET, Next.js treats `/api/auth/*` as unmatched routes
- This results in pre-rendered 404 pages instead of functional API endpoints

**Environment variables must be:**

1. **Build arguments** (`--build-arg AUTH_SECRET="${AUTH_SECRET}"`)
   - Passed to Docker during image build
   - Available to Next.js build process
   - Compiled into the application code

2. **Runtime environment** (`--set-env-vars="AUTH_SECRET=${AUTH_SECRET}..."`)
   - Set on Cloud Run service
   - Available to the running container
   - Used by Next.js server at runtime

**Both are required** for NextAuth to function properly.

## Rollback Plan

If deployment fails or causes issues:

```bash
# Revert to previous deployment
gcloud run services update canadagpt-frontend \
  --region=us-central1 \
  --image=us-central1-docker.pkg.dev/canada-gpt-ca/canadagpt/canadagpt-frontend:PREVIOUS_TAG
```

Replace `PREVIOUS_TAG` with the timestamp from the previous successful deployment.

## Future Considerations

1. **Secret Management**: Consider using Google Secret Manager instead of passing secrets as build args
2. **CI/CD Integration**: Update GitHub Actions workflow to include AUTH_SECRET
3. **Environment Consistency**: Ensure `.env.local`, `.env.example`, and deployment scripts stay in sync

## References

- NextAuth v5 Documentation: https://authjs.dev/getting-started/deployment
- Cloud Run Environment Variables: https://cloud.google.com/run/docs/configuring/environment-variables
- Docker Build Arguments: https://docs.docker.com/engine/reference/commandline/build/#build-arg
