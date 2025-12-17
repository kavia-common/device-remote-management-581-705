#!/bin/bash

# Database Migration Script for Device Remote Management Platform
# This script runs all migrations and seeds on container startup

set -e

# Load connection parameters
DB_NAME="myapp"
DB_USER="appuser"
DB_PASSWORD="dbuser123"
DB_PORT="5000"

echo "=========================================="
echo "Database Migration Script"
echo "=========================================="
echo ""

# Find PostgreSQL binaries
PG_VERSION=$(ls /usr/lib/postgresql/ 2>/dev/null | head -1)
if [ -z "$PG_VERSION" ]; then
    echo "Error: PostgreSQL not found"
    exit 1
fi

PG_BIN="/usr/lib/postgresql/${PG_VERSION}/bin"
PSQL="${PG_BIN}/psql"

# Connection string
CONN_STRING="postgresql://${DB_USER}:${DB_PASSWORD}@localhost:${DB_PORT}/${DB_NAME}"

# Wait for PostgreSQL to be ready
echo "Waiting for PostgreSQL to be ready..."
for i in {1..30}; do
    if sudo -u postgres ${PG_BIN}/pg_isready -p ${DB_PORT} > /dev/null 2>&1; then
        echo "✓ PostgreSQL is ready"
        break
    fi
    if [ $i -eq 30 ]; then
        echo "✗ PostgreSQL failed to start"
        exit 1
    fi
    sleep 2
done

# Create migrations tracking table
echo ""
echo "Creating migrations tracking table..."
PGPASSWORD="${DB_PASSWORD}" ${PSQL} "${CONN_STRING}" -c "
CREATE TABLE IF NOT EXISTS schema_migrations (
    id SERIAL PRIMARY KEY,
    migration_file VARCHAR(255) UNIQUE NOT NULL,
    applied_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);" 2>&1 | grep -v "^$" || true

echo "✓ Migrations table ready"

# Function to run a migration file
run_migration() {
    local migration_file=$1
    local migration_name=$(basename "$migration_file")
    
    # Check if migration already applied
    local already_applied=$(PGPASSWORD="${DB_PASSWORD}" ${PSQL} "${CONN_STRING}" -t -c "
        SELECT COUNT(*) FROM schema_migrations WHERE migration_file = '${migration_name}';
    " 2>/dev/null | tr -d ' ')
    
    if [ "$already_applied" = "1" ]; then
        echo "  ⊙ ${migration_name} (already applied)"
        return 0
    fi
    
    echo "  → Applying ${migration_name}..."
    
    # Run migration
    if PGPASSWORD="${DB_PASSWORD}" ${PSQL} "${CONN_STRING}" -f "$migration_file" > /dev/null 2>&1; then
        # Record migration
        PGPASSWORD="${DB_PASSWORD}" ${PSQL} "${CONN_STRING}" -c "
            INSERT INTO schema_migrations (migration_file) VALUES ('${migration_name}');
        " > /dev/null 2>&1
        echo "  ✓ ${migration_name} applied successfully"
        return 0
    else
        echo "  ✗ ${migration_name} failed"
        return 1
    fi
}

# Run migrations
echo ""
echo "Running migrations..."
echo ""

MIGRATION_DIR="/home/kavia/workspace/code-generation/device-remote-management-581-705/DatabaseContainer/migrations"

if [ -d "$MIGRATION_DIR" ]; then
    for migration_file in $(ls -1 "$MIGRATION_DIR"/*.sql 2>/dev/null | sort); do
        run_migration "$migration_file" || {
            echo ""
            echo "Migration failed. Stopping."
            exit 1
        }
    done
else
    echo "Warning: Migration directory not found: $MIGRATION_DIR"
fi

# Run seeds
echo ""
echo "Running seed data..."
echo ""

SEED_DIR="/home/kavia/workspace/code-generation/device-remote-management-581-705/DatabaseContainer/seeds"

if [ -d "$SEED_DIR" ]; then
    for seed_file in $(ls -1 "$SEED_DIR"/*.sql 2>/dev/null | sort); do
        local seed_name=$(basename "$seed_file")
        echo "  → Loading ${seed_name}..."
        
        if PGPASSWORD="${DB_PASSWORD}" ${PSQL} "${CONN_STRING}" -f "$seed_file" > /dev/null 2>&1; then
            echo "  ✓ ${seed_name} loaded successfully"
        else
            echo "  ⚠ ${seed_name} failed (may already exist)"
        fi
    done
else
    echo "Warning: Seed directory not found: $SEED_DIR"
fi

echo ""
echo "=========================================="
echo "✓ Database migrations completed!"
echo "=========================================="
echo ""
echo "Database: ${DB_NAME}"
echo "User: ${DB_USER}"
echo "Port: ${DB_PORT}"
echo ""
