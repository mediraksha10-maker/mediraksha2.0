FROM node:22-alpine

WORKDIR /app

# Install curl/wget if needed for healthchecks
RUN apk add --no-cache wget

# Copy package descriptors for caching layer
COPY package*.json ./
COPY frontend/package*.json ./frontend/
COPY backend/package*.json ./backend/

# Install dependencies for root, frontend, and backend
RUN npm install
RUN npm install --prefix ./frontend
RUN npm install --prefix ./backend

# Copy source files
COPY . .

# Build frontend and prepare application
RUN npm run build

# Default environment configuration
ENV NODE_ENV=production
ENV PORT=8000

EXPOSE 8000

# Container healthcheck via the /health endpoint
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:8000/health || exit 1

CMD ["npm", "start"]
