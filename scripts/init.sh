#!/bin/bash
# ShowMe Development Environment Setup
# Voice-first educational app that transforms spoken questions into AI-generated slideshows

set -e

echo "========================================"
echo "  ShowMe - Development Environment Setup"
echo "========================================"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check Node.js version
echo "Checking Node.js version..."
if ! command -v node &> /dev/null; then
    echo -e "${RED}Error: Node.js is not installed. Please install Node.js 18+${NC}"
    exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo -e "${RED}Error: Node.js 18+ required. Found version $(node -v)${NC}"
    exit 1
fi
echo -e "${GREEN}Node.js $(node -v) detected${NC}"

# Check for required environment variables
echo ""
echo "Checking environment variables..."
if [ -z "$GEMINI_API_KEY" ]; then
    echo -e "${YELLOW}Warning: GEMINI_API_KEY not set. AI features will not work.${NC}"
    echo "  Set it with: export GEMINI_API_KEY=your_api_key"
else
    echo -e "${GREEN}GEMINI_API_KEY is set${NC}"
fi

# Install backend dependencies
echo ""
echo "Installing backend dependencies..."
if [ -d "backend" ]; then
    cd backend
    npm install
    cd ..
    echo -e "${GREEN}Backend dependencies installed${NC}"
else
    echo -e "${YELLOW}Warning: backend/ directory not found${NC}"
fi

# Install frontend dependencies
echo ""
echo "Installing frontend dependencies..."
if [ -d "frontend" ]; then
    cd frontend
    npm install
    cd ..
    echo -e "${GREEN}Frontend dependencies installed${NC}"
else
    echo -e "${YELLOW}Warning: frontend/ directory not found${NC}"
fi

# Create .env files if they don't exist
echo ""
echo "Setting up environment files..."

if [ -d "backend" ] && [ ! -f "backend/.env" ]; then
    cat > backend/.env << EOF
# Backend Environment Variables
PORT=3001
GEMINI_API_KEY=\${GEMINI_API_KEY}
NODE_ENV=development
CORS_ORIGIN=http://localhost:5173
EOF
    echo -e "${GREEN}Created backend/.env${NC}"
fi

if [ -d "frontend" ] && [ ! -f "frontend/.env" ]; then
    cat > frontend/.env << EOF
# Frontend Environment Variables
VITE_API_URL=http://localhost:3001
VITE_WS_URL=ws://localhost:3001
EOF
    echo -e "${GREEN}Created frontend/.env${NC}"
fi

# Function to start servers
start_servers() {
    echo ""
    echo "Starting development servers..."

    # Start backend
    if [ -d "backend" ]; then
        echo "Starting backend server..."
        cd backend
        npm run dev &
        BACKEND_PID=$!
        cd ..
        echo -e "${GREEN}Backend starting (PID: $BACKEND_PID)${NC}"
    fi

    # Wait a moment for backend to initialize
    sleep 2

    # Start frontend
    if [ -d "frontend" ]; then
        echo "Starting frontend server..."
        cd frontend
        npm run dev &
        FRONTEND_PID=$!
        cd ..
        echo -e "${GREEN}Frontend starting (PID: $FRONTEND_PID)${NC}"
    fi

    echo ""
    echo "========================================"
    echo -e "${GREEN}Environment ready!${NC}"
    echo "========================================"
    echo ""
    echo "Access the application:"
    echo -e "  Frontend: ${GREEN}http://localhost:5173${NC}"
    echo -e "  Backend:  ${GREEN}http://localhost:3001${NC}"
    echo ""
    echo "API Endpoints:"
    echo "  POST /api/generate           - Generate slideshow from query"
    echo "  POST /api/generate/follow-up - Generate follow-up slides"
    echo "  POST /api/generate/engagement - Get fun fact + suggestions"
    echo "  POST /api/classify           - Classify query type"
    echo "  WS   /ws/generation          - Real-time progress updates"
    echo ""
    echo "Press Ctrl+C to stop all servers"

    # Wait for Ctrl+C
    trap "echo ''; echo 'Stopping servers...'; kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit 0" SIGINT
    wait
}

# Check for command line args
if [ "$1" == "--install-only" ]; then
    echo ""
    echo -e "${GREEN}Dependencies installed. Run ./init.sh to start servers.${NC}"
    exit 0
fi

start_servers
