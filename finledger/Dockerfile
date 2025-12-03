# FinLedger Dockerfile
# Multi-stage build for production-ready images

# =============================================================================
# Stage 1: Base image with Python dependencies
# =============================================================================
FROM python:3.11-slim-bookworm AS base

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PYTHONPATH=/app \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq-dev \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# Create non-root user for security
RUN groupadd -r finledger && useradd -r -g finledger finledger

# Set working directory
WORKDIR /app

# Copy and install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# =============================================================================
# Stage 2: API Service
# =============================================================================
FROM base AS api

# Copy application code
COPY . .

# Create upload directory
RUN mkdir -p /tmp/finledger/receipts && \
    chown -R finledger:finledger /tmp/finledger

# Switch to non-root user
USER finledger

# Expose port
EXPOSE 5000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:5000/health')" || exit 1

# Start API server with Gunicorn
CMD ["gunicorn", "--bind", "0.0.0.0:5000", "--workers", "4", "--threads", "2", \
     "--worker-class", "gevent", "--timeout", "120", "--keep-alive", "5", \
     "--access-logfile", "-", "--error-logfile", "-", \
     "run:app"]

# =============================================================================
# Stage 3: Worker Service
# =============================================================================
FROM base AS worker

# Copy application code
COPY . .

# Create upload directory (workers may need to read receipts)
RUN mkdir -p /tmp/finledger/receipts && \
    chown -R finledger:finledger /tmp/finledger

# Switch to non-root user
USER finledger

# Start Celery worker
CMD ["celery", "-A", "worker.celery_config:celery_app", "worker", \
     "--loglevel=INFO", "--concurrency=4", \
     "-Q", "default,ocr,reports"]

