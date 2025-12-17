#!/bin/bash

echo "================================================"
echo "Backend Container Startup"
echo "================================================"
echo ""

# Load database connection information
DB_CONNECTION_FILE="../DatabaseContainer/db_connection.txt"

if [ -f "$DB_CONNECTION_FILE" ]; then
    echo "✓ Found database connection file"
    
    # Extract connection string
    DB_CONN=$(cat "$DB_CONNECTION_FILE")
    
    # Convert psql format to PostgreSQL URL if needed
    if [[ $DB_CONN == psql* ]]; then
        # Extract the URL part after 'psql '
        DATABASE_URL=$(echo "$DB_CONN" | sed 's/^psql //')
    else
        DATABASE_URL=$DB_CONN
    fi
    
    echo "  Database URL: $DATABASE_URL"
    
    # Create or update .env file with database URL
    if [ -f ".env" ]; then
        # Update existing .env file
        if grep -q "^DATABASE_URL=" .env; then
            sed -i "s|^DATABASE_URL=.*|DATABASE_URL=$DATABASE_URL|" .env
        else
            echo "DATABASE_URL=$DATABASE_URL" >> .env
        fi
    else
        # Create new .env from example
        if [ -f ".env.example" ]; then
            cp .env.example .env
            sed -i "s|^DATABASE_URL=.*|DATABASE_URL=$DATABASE_URL|" .env
        else
            echo "DATABASE_URL=$DATABASE_URL" > .env
        fi
    fi
    
    echo "✓ Environment configured"
else
    echo "⚠ Database connection file not found"
    echo "  Please ensure DatabaseContainer is started first"
    echo ""
    
    if [ ! -f ".env" ]; then
        echo "Creating .env from .env.example..."
        if [ -f ".env.example" ]; then
            cp .env.example .env
            echo "✓ .env file created - please configure DATABASE_URL"
        fi
    fi
fi

echo ""
echo "Installing dependencies..."
npm install

echo ""
echo "Starting backend server..."
echo "================================================"
echo ""

npm start
