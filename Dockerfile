FROM node:18-alpine AS builder

# Install dependencies for building native modules
RUN apk add --no-cache python3 make g++ bash

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY admin-panel-v2/package*.json ./admin-panel-v2/

# Install backend dependencies
RUN npm ci

# Build admin panel
WORKDIR /app/admin-panel-v2
COPY admin-panel-v2/ .
RUN npm install && npm run build

# Production stage
FROM node:18-alpine

RUN apk add --no-cache python3 make g++

WORKDIR /app

# Copy package files and install production dependencies
COPY package*.json ./
RUN npm ci --only=production

# Copy application files
COPY . .

# Copy built admin panel from builder stage
COPY --from=builder /app/admin-panel/dist ./admin-panel/dist

# Create uploads directory
RUN mkdir -p uploads/temp

# Expose port
EXPOSE 5000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=30s \
  CMD node -e "require('http').get('http://localhost:5000/api/public/health', (res) => res.statusCode === 200 ? process.exit(0) : process.exit(1))"

# Start multi-tenant server
CMD ["node", "server-multi-tenant.js"]