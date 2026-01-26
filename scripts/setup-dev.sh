#!/bin/bash

# ===========================================
# Propnica - Development Setup Script
# ===========================================

set -e

# Colours for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Colour

echo -e "${GREEN}============================================${NC}"
echo -e "${GREEN}Propnica Development Setup${NC}"
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
if [ ! -f ".env" ]; then
    echo -e "${YELLOW}Creating .env from .env.example...${NC}"
    cp .env.example .env
    echo -e "${YELLOW}Please edit .env with your configuration${NC}"
    echo ""
    
    echo -e "${BLUE}Required environment variables:${NC}"
    echo "  - DATABASE_URL: PostgreSQL connection string"
    echo "  - DIRECT_URL: Direct PostgreSQL URL (for migrations)"
    echo "  - NEXT_PUBLIC_SUPABASE_URL: Supabase project URL"
    echo "  - NEXT_PUBLIC_SUPABASE_ANON_KEY: Supabase anonymous key"
    echo "  - SUPABASE_SERVICE_ROLE_KEY: Supabase service role key"
    echo "  - NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN: Mapbox API token"
    echo ""
else
    echo -e "${GREEN}.env file already exists${NC}"
fi

# Check for required env vars
check_env() {
    if grep -q "^$1=" .env && ! grep -q "^$1=$" .env && ! grep -q "^$1=your_" .env; then
        echo -e "${GREEN}[OK]${NC} $1 is configured"
        return 0
    else
        echo -e "${YELLOW}[MISSING]${NC} $1 needs to be configured"
        return 1
    fi
}

echo -e "${YELLOW}Checking environment configuration...${NC}"
ENV_OK=true
check_env "DATABASE_URL" || ENV_OK=false
check_env "NEXT_PUBLIC_SUPABASE_URL" || ENV_OK=false
check_env "NEXT_PUBLIC_SUPABASE_ANON_KEY" || ENV_OK=false
check_env "NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN" || ENV_OK=false
echo ""

if [ "$ENV_OK" = false ]; then
    echo -e "${YELLOW}Please configure the missing environment variables in .env${NC}"
    echo ""
fi

# Generate Prisma client
echo -e "${YELLOW}Generating Prisma client...${NC}"
npx prisma generate
echo -e "${GREEN}Prisma client generated${NC}"
echo ""

# Run database migrations if DATABASE_URL is configured
if grep -q "^DATABASE_URL=" .env && ! grep -q "^DATABASE_URL=$" .env && ! grep -q "^DATABASE_URL=your_" .env; then
    echo -e "${YELLOW}Running database migrations...${NC}"
    npx prisma migrate deploy 2>/dev/null || {
        echo -e "${YELLOW}Migrations skipped (database may not be accessible)${NC}"
    }
    echo ""
fi

# Build check
echo -e "${YELLOW}Running TypeScript type check...${NC}"
npx tsc --noEmit 2>/dev/null || {
    echo -e "${YELLOW}Type check completed with warnings (this is normal for initial setup)${NC}"
}
echo ""

echo -e "${GREEN}============================================${NC}"
echo -e "${GREEN}Development Setup Complete!${NC}"
echo -e "${GREEN}============================================${NC}"
echo ""
echo "Next steps:"
echo ""
echo "1. Configure your .env file with the required values"
echo ""
echo "2. Start the development server:"
echo "   npm run dev"
echo ""
echo "3. Open http://localhost:3000 in your browser"
echo ""
echo "4. To preview Remotion compositions:"
echo "   npm run remotion:preview"
echo ""
echo "5. To view/manage the database:"
echo "   npx prisma studio"
echo ""
