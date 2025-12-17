FROM postgres:15-alpine

# Install bash for running scripts
RUN apk add --no-cache bash

# Set environment variables
ENV POSTGRES_DB=myapp
ENV POSTGRES_USER=appuser
ENV POSTGRES_PASSWORD=dbuser123

# Copy migration and seed files
COPY migrations /docker-entrypoint-initdb.d/migrations/
COPY seeds /docker-entrypoint-initdb.d/seeds/

# Copy custom initialization script
COPY init-db.sh /docker-entrypoint-initdb.d/01-init-db.sh

# Make scripts executable
RUN chmod +x /docker-entrypoint-initdb.d/01-init-db.sh

# Expose PostgreSQL port
EXPOSE 5432

# Health check
HEALTHCHECK --interval=10s --timeout=5s --retries=5 \
  CMD pg_isready -U $POSTGRES_USER -d $POSTGRES_DB || exit 1

# Use default postgres entrypoint
