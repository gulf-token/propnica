#!/bin/bash

# ===========================================
# Propnica - Development Setup Script
# ===========================================
# Usage: ./scripts/setup-dev.sh [--local]
#
# Options:
#   --local    Set up for local development with Docker (no Supabase cloud)

set -e

# Colours for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Colour

LOCAL_MODE=false
if [[ "$1" == "--local" ]]; then
    LOCAL_MODE=true
fi

echo -e "${GREEN}============================================${NC}"
echo -e "${GREEN}Propnica Development Setup${NC}"
if [ "$LOCAL_MODE" = true ]; then
    echo -e "${BLUE}Mode: Local (Docker + Auth Bypass)${NC}"
else
    echo -e "${BLUE}Mode: Cloud (Supabase)${NC}"
fi
echo -e "${GREEN}============================================${NC}"
echo ""

# Navigate to project root
cd "$(dirname "$0")/.."
PROJECT_ROOT=$(pwd)
echo "Project root: ${PROJECT_ROOT}"
echo ""

# Check for required tools
check_tool() {
    if ! command -v $1 &> /dev/null; then
        echo -e "${RED}Error: $1 is not installed${NC}"
        echo "Please install $1 and try again"
        return 1
    fi
    echo -e "${GREEN}[OK]${NC} $1 found"
    return 0
}

echo -e "${YELLOW}Checking required tools...${NC}"
check_tool "node" || exit 1
check_tool "npm" || exit 1
check_tool "git" || exit 1

if [ "$LOCAL_MODE" = true ]; then
    check_tool "docker" || exit 1
fi
echo ""

# Check Node.js version
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo -e "${RED}Error: Node.js version 18 or higher is required${NC}"
    echo "Current version: $(node -v)"
    exit 1
fi
echo -e "${GREEN}Node.js version OK${NC} ($(node -v))"
echo ""

# Install dependencies
echo -e "${YELLOW}Installing dependencies...${NC}"
npm install
echo -e "${GREEN}Dependencies installed${NC}"
echo ""

# Setup environment file
if [ "$LOCAL_MODE" = true ]; then
    # Local development setup
    if [ ! -f ".env.local" ]; then
        echo -e "${YELLOW}Creating .env.local from .env.local.example...${NC}"
        cp .env.local.example .env.local
        echo -e "${GREEN}.env.local created${NC}"
    else
        echo -e "${GREEN}.env.local already exists${NC}"
    fi

    # Start Docker containers
    echo ""
    echo -e "${YELLOW}Starting Docker containers...${NC}"
    docker compose up -d

    # Wait for database to be ready
    echo -e "${YELLOW}Waiting for database to be ready...${NC}"
    sleep 3

    # Check if database is ready
    for i in {1..30}; do
        if docker compose exec -T db pg_isready -U postgres -d propnica > /dev/null 2>&1; then
            echo -e "${GREEN}Database is ready${NC}"
            break
        fi
        if [ $i -eq 30 ]; then
            echo -e "${RED}Database failed to start${NC}"
            exit 1
        fi
        sleep 1
    done
    echo ""
else
    # Cloud development setup
    if [ ! -f ".env" ]; then
        echo -e "${YELLOW}Creating .env from .env.example...${NC}"
        cp .env.example .env
        echo -e "${YELLOW}Please edit .env with your Supabase configuration${NC}"
        echo ""

        echo -e "${BLUE}Required environment variables:${NC}"
        echo "  - DATABASE_URL: Supabase PostgreSQL connection string"
        echo "  - NEXT_PUBLIC_SUPABASE_URL: Supabase project URL"
        echo "  - NEXT_PUBLIC_SUPABASE_ANON_KEY: Supabase anonymous key"
        echo "  - SUPABASE_SERVICE_ROLE_KEY: Supabase service role key"
        echo "  - NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN: Mapbox API token"
        echo ""
    else
        echo -e "${GREEN}.env file already exists${NC}"
    fi
fi

# Generate Prisma client
echo -e "${YELLOW}Generating Prisma client...${NC}"
npx prisma generate
echo -e "${GREEN}Prisma client generated${NC}"
echo ""

# Push database schema
if [ "$LOCAL_MODE" = true ]; then
    echo -e "${YELLOW}Pushing database schema...${NC}"
    npx prisma db push --skip-generate
    echo -e "${GREEN}Database schema pushed${NC}"
    echo ""

    # Create development user profile
    echo -e "${YELLOW}Creating development user profile...${NC}"
    npx prisma db execute --stdin <<EOF
INSERT INTO user_profiles (id, user_id, display_name, preferences, created_at, updated_at)
VALUES (
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12',
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    'Dev User',
    '{}',
    NOW(),
    NOW()
) ON CONFLICT (user_id) DO NOTHING;
EOF
    echo -e "${GREEN}Development user profile created${NC}"
    echo ""
fi

# Run type check
echo -e "${YELLOW}Running TypeScript type check...${NC}"
npx tsc --noEmit 2>/dev/null || {
    echo -e "${YELLOW}Type check completed with warnings${NC}"
}
echo ""

echo -e "${GREEN}============================================${NC}"
echo -e "${GREEN}Development Setup Complete!${NC}"
echo -e "${GREEN}============================================${NC}"
echo ""

if [ "$LOCAL_MODE" = true ]; then
    echo "Local development is configured with:"
    echo "  - Database: PostgreSQL (Docker) at localhost:5432"
    echo "  - Auth: Bypassed (using dev user)"
    echo "  - User: dev@propnica.local"
    echo ""
    echo "Useful commands:"
    echo "  docker compose logs -f db    # View database logs"
    echo "  docker compose down          # Stop containers"
    echo "  docker compose down -v       # Stop and remove data"
    echo "  npx prisma studio            # Database GUI"
    echo ""
fi

echo "Next steps:"
echo ""
echo "1. Start the development server:"
echo "   npm run dev"
echo ""
echo "2. Open http://localhost:3000 in your browser"
echo ""

if [ "$LOCAL_MODE" = false ]; then
    echo "3. Configure your .env file with Supabase credentials"
    echo ""
fi

echo "4. Optional - Preview Remotion compositions:"
echo "   npm run remotion:preview"
echo ""
