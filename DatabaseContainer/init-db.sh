#!/bin/bash
set -e

echo "Starting database initialization..."

# Create schema_migrations table if it doesn't exist
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
    CREATE TABLE IF NOT EXISTS schema_migrations (
        id SERIAL PRIMARY KEY,
        migration_name VARCHAR(255) NOT NULL UNIQUE,
        applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
EOSQL

echo "Schema migrations table created."

# Run migrations in order
for migration_file in /docker-entrypoint-initdb.d/migrations/*.sql; do
    if [ -f "$migration_file" ]; then
        migration_name=$(basename "$migration_file")
        
        # Check if migration has already been applied
        already_applied=$(psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" -tAc "SELECT COUNT(*) FROM schema_migrations WHERE migration_name = '$migration_name';")
        
        if [ "$already_applied" -eq "0" ]; then
            echo "Applying migration: $migration_name"
            psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" -f "$migration_file"
            
            # Record migration as applied
            psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
                INSERT INTO schema_migrations (migration_name) VALUES ('$migration_name');
EOSQL
            echo "Migration $migration_name applied successfully."
        else
            echo "Migration $migration_name already applied, skipping."
        fi
    fi
done

echo "All migrations completed."

# Run seed files
for seed_file in /docker-entrypoint-initdb.d/seeds/*.sql; do
    if [ -f "$seed_file" ]; then
        seed_name=$(basename "$seed_file")
        echo "Running seed: $seed_name"
        psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" -f "$seed_file" || echo "Seed $seed_name failed or already applied."
    fi
done

echo "Database initialization completed successfully."
