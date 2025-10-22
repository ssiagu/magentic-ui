# Multi-stage build for Magentic-UI
FROM node:18-alpine AS frontend-builder

WORKDIR /app

# Copy package files
COPY frontend/package*.json ./
COPY frontend/yarn.lock ./

# Install dependencies and build frontend
RUN npm install -g yarn@1.22.19 && \
    npm install -g gatsby-cli && \
    yarn install && \
    yarn build

# Production stage
FROM python:3.12-slim AS production

# Install system dependencies
RUN apt-get update && apt-get install -y \
    curl \
    wget \
    gnupg \
    git \
    && rm -rf /var/lib/apt/lists/*

# Set up Python environment
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

# Install Magentic-UI and dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy source code
COPY src/ ./src/
COPY magentic_ui/ ./magentic_ui/
COPY frontend/public/ ./frontend/public/

# Create necessary directories
RUN mkdir -p /app/data /app/user_files /app/config /app/logs

# Set permissions
RUN chmod +x /app/src/magentic_ui/_cli.py

# Create non-root user for security
RUN useradd -m -u 1000 -s /bin/bash magentic && \
    chown -R magentic:magentic /app
USER magentic

# Expose port
EXPOSE 8081

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD curl -f http://localhost:8081/health || exit 1

# Set working directory
WORKDIR /app

# Default command
CMD ["python", "-m", "magentic_ui._cli", "--port", "8081", "--host", "0.0.0.0"]