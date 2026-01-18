# Stage 1: Build frontend
FROM node:20-alpine AS frontend-build

WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./

# Build with production API URL (same origin since backend serves frontend)
ENV VITE_API_URL=""
RUN npm run build

# Stage 2: Production backend
FROM node:20-alpine AS production

WORKDIR /app

# Copy backend
COPY backend/package*.json ./
RUN npm ci --only=production

COPY backend/src ./src

# Copy built frontend from stage 1
COPY --from=frontend-build /app/frontend/dist ./public

# Cloud Run uses PORT env var (default 8080)
ENV PORT=8080
ENV NODE_ENV=production

EXPOSE 8080

CMD ["node", "src/index.js"]
