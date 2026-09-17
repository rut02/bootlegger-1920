# ==========================================
# Stage 1: Build Frontend and Server
# ==========================================
FROM node:22-alpine AS builder
WORKDIR /app

# Install all dependencies (including devDependencies for build)
COPY package*.json ./
RUN npm ci

# Copy project source and build
COPY . .
RUN npm run build

# ==========================================
# Stage 2: Lightweight Production Runner
# ==========================================
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=7860

# Install only production dependencies
COPY --chown=node:node package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

# Copy compiled bundles from builder stage
COPY --chown=node:node --from=builder /app/dist ./dist
COPY --chown=node:node --from=builder /app/dist-server ./dist-server

# Use official non-root user (UID 1000) for Hugging Face Spaces compatibility
USER node

# Hugging Face Spaces routes HTTP/WebSocket traffic to port 7860
EXPOSE 7860

CMD ["node", "dist-server/server/index.js"]
