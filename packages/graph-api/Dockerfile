# CanadaGPT GraphQL API - Production Dockerfile
# Multi-stage build for optimized image size

# ============================================
# Stage 1: Build
# ============================================
FROM node:20-alpine AS builder

# Install pnpm
RUN npm install -g pnpm

WORKDIR /app

# Copy package files
COPY package.json ./
COPY tsconfig.json ./

# Install dependencies (including devDependencies for build)
RUN pnpm install

# Copy source code
COPY src ./src

# Build TypeScript to JavaScript
RUN pnpm build

# ============================================
# Stage 2: Test
# ============================================
FROM builder AS test

# Set test environment variables for config validation
ENV NEO4J_URI=bolt://localhost:7687 \
    NEO4J_PASSWORD=test \
    CORS_ORIGINS=https://canadagpt.ca;http://localhost:3000

# Test that config loads without errors
# This catches delimiter parsing issues before push
RUN echo "🧪 Testing configuration..." && \
    node -e "const { validateConfig } = require('./dist/config.js'); validateConfig();" || \
    (echo "❌ Config validation failed!" && exit 1)

# ============================================
# Stage 3: Production
# ============================================
FROM node:20-alpine AS production

# Install pnpm
RUN npm install -g pnpm

WORKDIR /app

# Install production dependencies only
COPY package.json ./
RUN pnpm install --prod

# Copy built JavaScript from test stage (ensures tests passed)
COPY --from=test /app/dist ./dist

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001 && \
    chown -R nodejs:nodejs /app

USER nodejs

# Expose port (Cloud Run will override with PORT env var)
EXPOSE 4000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD node -e "require('http').get('http://localhost:4000/graphql?query={__typename}', (r) => process.exit(r.statusCode === 200 ? 0 : 1))"

# Start server
CMD ["node", "dist/index.js"]
