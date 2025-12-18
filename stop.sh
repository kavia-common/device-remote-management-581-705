#!/usr/bin/env bash
set -euo pipefail

echo "=========================================="
echo "Device Remote Management Platform"
echo "Stopping all services..."
echo "=========================================="

# Check if docker-compose is available
if ! command -v docker-compose &> /dev/null; then
  if ! command -v docker &> /dev/null || ! docker compose version &> /dev/null; then
    echo "❌ docker-compose not found."
    exit 1
  fi
  COMPOSE_CMD="docker compose"
else
  COMPOSE_CMD="docker-compose"
fi

echo ""
echo "🛑 Stopping services..."
$COMPOSE_CMD down

echo ""
echo "✅ All services stopped successfully!"
echo ""
echo "To remove volumes (including database data), run:"
echo "   $COMPOSE_CMD down -v"
echo "=========================================="
