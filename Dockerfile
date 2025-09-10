# Multi-stage Dockerfile for Livestock Monitoring System
# Optimized for production deployment with minimal size and security

###################
# Base Stage
###################
FROM node:18-alpine AS base

# Install system dependencies and security updates
RUN apk update && apk upgrade && apk add --no-cache \
    dumb-init \
    curl \
    libc6-compat \
    && rm -rf /var/cache/apk/*

# Create app user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nextjs -u 1001

WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN npm install -g pnpm


###################
# Builder Stage
###################
FROM base AS builder

# Copy entire source code (excluding files in .dockerignore)
COPY . .

# Install dependencies and build
RUN pnpm install --frozen-lockfile --prefer-offline

# Build all packages and applications
RUN pnpm run build

###################
# Production API Stage
###################
FROM base AS production

# Set production environment
ENV NODE_ENV=production
ENV PORT=3001

# Copy built application and dependencies
COPY --from=builder --chown=nextjs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nextjs:nodejs /app/apps/api/dist ./apps/api/dist
COPY --from=builder --chown=nextjs:nodejs /app/apps/api/package.json ./apps/api/
COPY --from=builder --chown=nextjs:nodejs /app/packages ./packages
COPY --from=builder --chown=nextjs:nodejs /app/database ./database
COPY --from=builder --chown=nextjs:nodejs /app/scripts ./scripts
COPY --from=builder --chown=nextjs:nodejs /app/api/tsconfig.json ./api/tsconfig.json

# Create data directory
RUN mkdir -p /app/data && chown nextjs:nodejs /app/data

USER nextjs

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD curl -f http://localhost:3001/health || exit 1

EXPOSE 3001

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "apps/api/dist/index.js"]

###################
# Web Production Stage
###################
FROM base AS web-production

# Set production environment for Next.js
ENV NODE_ENV=production
ENV PORT=3000
ENV NEXT_TELEMETRY_DISABLED=1

# Copy built application and dependencies
COPY --from=builder --chown=nextjs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next ./apps/web/.next
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/package.json ./apps/web/
COPY --from=builder --chown=nextjs:nodejs /app/packages ./packages

USER nextjs

# Health check for web app (use root path)
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
    CMD curl -f http://localhost:3000/ || exit 1

EXPOSE 3000

ENTRYPOINT ["dumb-init", "--"]
CMD ["npm", "run", "start", "--prefix", "apps/web"]

###################
# Data Importer Stage  
###################
FROM base AS data-importer

ENV NODE_ENV=production

# Copy everything from builder (source + dependencies + built files)
COPY --from=builder --chown=nextjs:nodejs /app ./ 

# Create data directory and set permissions
RUN mkdir -p /app/data && chown nextjs:nodejs /app/data

USER nextjs

# Mount point for CSV data files
VOLUME ["/app/data"]

# Run the data import script using tsx for TypeScript support
ENTRYPOINT ["dumb-init", "--"]
CMD ["npx", "tsx", "scripts/import-csv-data.ts"]
