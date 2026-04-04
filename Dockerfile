# --- STAGE 1: Build Frontend ---
FROM node:20-alpine AS frontend-builder
WORKDIR /app/frontend
COPY frontend/package.json ./
RUN npm install
COPY frontend/ ./
RUN npm run build

# --- STAGE 2: Build Final Image ---
FROM python:3.10-slim

# Install system dependencies (FFmpeg for audio/video processing)
RUN apt-get update && apt-get install -y \
    ffmpeg \
    libsm6 \
    libxext6 \
    git \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy and install backend dependencies
COPY backend/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt
# ALWAYS UPDATE YT-DLP to latest to bypass extraction blocks
RUN pip install --no-cache-dir -U yt-dlp

# Copy backend source
COPY backend/ ./backend/

# Copy built frontend from Stage 1
COPY --from=frontend-builder /app/frontend/dist ./frontend/dist

# Set up environment and permissions
WORKDIR /app/backend
RUN mkdir -p downloads screenshots
RUN chmod -R 777 /app/backend/downloads /app/backend/screenshots

# Port 7860 is required for Hugging Face Spaces
EXPOSE 7860

# CMD to run the backend (which also serves the frontend)
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "7860"]
