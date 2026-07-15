#!/bin/bash

# University Website - Complete Startup Script
# This script installs dependencies and starts all services

echo "================================"
echo "University of Makran - Startup"
echo "================================"
echo ""

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to run service
run_service() {
    local service=$1
    local port=$2
    echo -e "${BLUE}Starting $service on port $port...${NC}"
    
    if [ "$service" == "backend" ]; then
        cd backend
        npm install
        npm run dev &
    elif [ "$service" == "frontend" ]; then
        cd frontend
        npm install
        npm run dev &
    elif [ "$service" == "admin" ]; then
        cd admin-dashboard
        npm install
        npm run dev &
    fi
    
    echo -e "${GREEN}✓ $service started${NC}"
}

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js first."
    exit 1
fi

echo "Node.js version: $(node -v)"
echo ""

# Start services
echo "Starting all services..."
echo ""

run_service "backend" "5000"
run_service "frontend" "3000"
run_service "admin" "3001"

echo ""
echo -e "${GREEN}================================${NC}"
echo -e "${GREEN}All services started!${NC}"
echo -e "${GREEN}================================${NC}"
echo ""
echo "Access points:"
echo "  Frontend:     http://localhost:3000"
echo "  Admin:        http://localhost:3001"
echo "  Backend:      http://localhost:5000"
echo "  API Health:   http://localhost:5000/api/health"
echo ""
echo "Press Ctrl+C to stop all services"
wait
