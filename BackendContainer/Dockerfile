# syntax=docker/dockerfile:1

FROM python:3.12-slim AS base

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app

# System deps for psycopg/asyncpg
RUN apt-get update && apt-get install -y --no-install-recommends build-essential libpq-dev curl && rm -rf /var/lib/apt/lists/*

# Install deps
COPY pyproject.toml ./
RUN pip install --no-cache-dir --upgrade pip setuptools wheel && \
    pip install --no-cache-dir -e .
# Optional: labels for worker command hint
LABEL org.opencontainers.image.description="DRM Backend API + Celery tasks. Start worker with: celery -A src.celery_app.celery_app worker -l info -Q celery"

# Copy source
COPY src ./src

# Expose and run
EXPOSE 8080
ENV PORT=8080
CMD ["uvicorn", "src.main:app", "--host", "0.0.0.0", "--port", "8080"]
