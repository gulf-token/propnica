#!/bin/bash

# ===========================================
# Propnica - Database Setup Script
# ===========================================

set -e

# Colours for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Colour

echo -e "${GREEN}============================================${NC}"
echo -e "${GREEN}Propnica Database Setup${NC}"
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
        exit 1
    fi
}

check_tool "npx"
check_tool "node"

# Check for .env file
if [ ! -f ".env" ]; then
    if [ -f ".env.example" ]; then
        echo -e "${YELLOW}Creating .env from .env.example...${NC}"
        cp .env.example .env
        echo -e "${YELLOW}Please edit .env with your database connection string${NC}"
        exit 1
    else
        echo -e "${RED}Error: .env file not found${NC}"
        exit 1
    fi
fi

# Check for DATABASE_URL
if ! grep -q "DATABASE_URL" .env; then
    echo -e "${RED}Error: DATABASE_URL not found in .env${NC}"
    exit 1
fi

echo -e "${YELLOW}Generating Prisma client...${NC}"
npx prisma generate
echo -e "${GREEN}Prisma client generated${NC}"
echo ""

echo -e "${YELLOW}Running database migrations...${NC}"
npx prisma migrate deploy
echo -e "${GREEN}Migrations complete${NC}"
echo ""

# Optionally seed the database
if [ "$1" == "--seed" ]; then
    echo -e "${YELLOW}Seeding database...${NC}"
    npx prisma db seed
    echo -e "${GREEN}Database seeded${NC}"
    echo ""
fi

echo -e "${GREEN}============================================${NC}"
echo -e "${GREEN}Database Setup Complete!${NC}"
echo -e "${GREEN}============================================${NC}"
echo ""
echo "To view the database, run:"
echo "  npx prisma studio"
echo ""
