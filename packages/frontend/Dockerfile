# CanadaGPT Frontend - Production Dockerfile
# Multi-stage build for optimized Next.js deployment
# Supports pnpm workspace with @canadagpt/design-system dependency

# ============================================
# Stage 1: Dependencies
# ============================================
FROM node:20-alpine AS deps

# Install pnpm
RUN npm install -g pnpm@latest

WORKDIR /app

# Copy workspace configuration
COPY pnpm-workspace.yaml ./
COPY package.json pnpm-lock.yaml ./

# Copy package.json files for all workspaces
COPY packages/frontend/package.json ./packages/frontend/
COPY packages/design-system/package.json ./packages/design-system/

# Install dependencies for entire workspace
RUN pnpm install --frozen-lockfile

# ============================================
# Stage 2: Builder
# ============================================
FROM node:20-alpine AS builder

# Install pnpm
RUN npm install -g pnpm@latest

WORKDIR /app

# Copy node_modules from deps stage
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/packages/frontend/node_modules ./packages/frontend/node_modules
COPY --from=deps /app/packages/design-system/node_modules ./packages/design-system/node_modules

# Copy workspace configuration
COPY pnpm-workspace.yaml ./
COPY package.json pnpm-lock.yaml ./

# Copy design-system package (workspace dependency)
COPY packages/design-system ./packages/design-system

# Build design-system first (required dependency for frontend)
WORKDIR /app/packages/design-system
RUN pnpm build

# Copy frontend package
WORKDIR /app
COPY packages/frontend ./packages/frontend

# Set working directory to frontend
WORKDIR /app/packages/frontend

# Build arguments for environment variables
ARG NEXT_PUBLIC_GRAPHQL_URL
ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY
ARG NEXT_PUBLIC_BASE_URL

# Set environment variables for build
ENV NEXT_PUBLIC_GRAPHQL_URL=$NEXT_PUBLIC_GRAPHQL_URL
ENV NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL
ENV NEXT_PUBLIC_SUPABASE_ANON_KEY=$NEXT_PUBLIC_SUPABASE_ANON_KEY
ENV NEXT_PUBLIC_BASE_URL=$NEXT_PUBLIC_BASE_URL
ENV NODE_ENV=production

# Build Next.js application (standalone output)
RUN pnpm build

# ============================================
# Stage 3: Production Runner
# ============================================
FROM node:20-alpine AS runner

WORKDIR /app

# Create non-root user for security
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copy public assets
COPY --from=builder /app/packages/frontend/public ./public

# Copy standalone output from Next.js build
COPY --from=builder --chown=nextjs:nodejs /app/packages/frontend/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/packages/frontend/.next/static ./packages/frontend/.next/static

# Set environment to production
ENV NODE_ENV=production
ENV PORT=3000

# Switch to non-root user
USER nextjs

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/api/health', (r) => process.exit(r.statusCode === 200 ? 0 : 1))" || exit 1

# Start Next.js server
CMD ["node", "packages/frontend/server.js"]
