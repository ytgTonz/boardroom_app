# Multi-stage Dockerfile for Boardroom Booking App
# Optimized for production with security and performance considerations

# Build stage for frontend
FROM node:18-alpine AS frontend-builder

WORKDIR /app/frontend

# Copy package files
COPY frontend/package*.json ./

# Install dependencies
RUN npm ci --only=production && npm cache clean --force

# Copy source code
COPY frontend/ ./

# Build production frontend
RUN npm run build

# Build stage for backend
FROM node:18-alpine AS backend-builder

WORKDIR /app/backend

# Copy package files
COPY backend/package*.json ./

# Install dependencies including dev dependencies for build
RUN npm ci && npm cache clean --force

# Copy source code
COPY backend/ ./

# Production stage
FROM node:18-alpine AS production

# Install system dependencies for MongoDB tools and security
RUN apk add --no-cache \
    mongodb-tools \
    curl \
    dumb-init \
    && rm -rf /var/cache/apk/*

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S boardroom -u 1001 -G nodejs

# Set working directory
WORKDIR /app

# Copy backend application
COPY --from=backend-builder --chown=nodejs:nodejs /app/backend ./backend

# Copy built frontend
COPY --from=frontend-builder --chown=nodejs:nodejs /app/frontend/dist ./frontend/dist

# Install only production dependencies for backend
WORKDIR /app/backend
RUN npm ci --only=production && npm cache clean --force

# Create necessary directories
RUN mkdir -p /app/logs /app/backups /app/uploads && \
    chown -R nodejs:nodejs /app

# Copy production configuration files
COPY docker/production.env /app/.env
COPY docker/nginx.conf /etc/nginx/nginx.conf

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD curl -f http://localhost:${PORT:-5000}/api/health || exit 1

# Switch to non-root user
USER nodejs

# Expose port
EXPOSE 5000

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Start the application
CMD ["node", "server.js"]