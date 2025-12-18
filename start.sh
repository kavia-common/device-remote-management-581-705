#!/usr/bin/env bash
set -euo pipefail

echo "=========================================="
echo "Device Remote Management Platform"
echo "Starting all services..."
echo "=========================================="

# Check if .env exists
if [ ! -f .env ]; then
  echo "⚠️  .env file not found. Creating from .env.example..."
  cp .env.example .env
  echo "✅ .env created. Please review and update the following:"
  echo "   - JWT_SECRET (generate with: openssl rand -hex 32)"
  echo "   - POSTGRES_PASSWORD (use a strong password)"
  echo "   - CORS_ORIGINS (add your deployment domains)"
  echo ""
  read -p "Press Enter to continue or Ctrl+C to exit and edit .env..."
fi

# Check if docker-compose is available
if ! command -v docker-compose &> /dev/null; then
  if ! command -v docker &> /dev/null || ! docker compose version &> /dev/null; then
    echo "❌ docker-compose not found. Please install Docker Compose."
    exit 1
  fi
  COMPOSE_CMD="docker compose"
else
  COMPOSE_CMD="docker-compose"
fi

echo ""
echo "🔧 Stopping any existing services..."
$COMPOSE_CMD down

echo ""
echo "🏗️  Building services..."
$COMPOSE_CMD build

echo ""
echo "🚀 Starting services..."
$COMPOSE_CMD up -d

echo ""
echo "⏳ Waiting for services to be healthy..."
sleep 10

echo ""
echo "📊 Service Status:"
$COMPOSE_CMD ps

echo ""
echo "=========================================="
echo "✅ All services started successfully!"
echo "=========================================="
echo ""
echo "🌐 Access Points:"
echo "   Frontend:    http://localhost:3000"
echo "   Backend API: http://localhost:8080/docs"
echo "   ReDoc:       http://localhost:8080/redoc"
echo ""
echo "🔐 Default Credentials:"
echo "   Email:    admin@example.com"
echo "   Password: (demo password - change immediately!)"
echo ""
echo "📝 Useful Commands:"
echo "   View logs:        $COMPOSE_CMD logs -f"
echo "   Stop services:    $COMPOSE_CMD down"
echo "   Restart services: $COMPOSE_CMD restart"
echo "   Database shell:   $COMPOSE_CMD exec db psql -U appuser -d myapp"
echo ""
echo "⚠️  Remember to change default credentials and JWT_SECRET in production!"
echo "=========================================="
