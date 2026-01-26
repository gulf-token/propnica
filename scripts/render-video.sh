#!/bin/bash
#
# Propnica Video Generator
# Generate professional property showcase videos from configuration files
#
# Usage:
#   ./render-video.sh [config-file] [output-file]
#
# Examples:
#   ./render-video.sh                                    # Use default Dubai Creek Harbour config
#   ./render-video.sh my-property.json                   # Use custom config
#   ./render-video.sh my-property.json output/video.mp4  # Custom config and output
#
# Requirements:
#   - Node.js 18+
#   - npm packages installed (run: npm install)
#   - Mapbox token set in environment or .env file
#

set -e

# Colours for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Colour

# Script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Default values
DEFAULT_CONFIG="$PROJECT_ROOT/examples/dubai-creek-harbour.json"
DEFAULT_OUTPUT="$PROJECT_ROOT/output/property-showcase.mp4"

# Parse arguments
CONFIG_FILE="${1:-$DEFAULT_CONFIG}"
OUTPUT_FILE="${2:-$DEFAULT_OUTPUT}"

echo ""
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  Propnica Video Generator${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Check Node.js
if ! command -v node &> /dev/null; then
    echo -e "${RED}Error: Node.js is not installed${NC}"
    echo "Please install Node.js 18 or later from https://nodejs.org/"
    exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo -e "${RED}Error: Node.js 18+ is required (found v$NODE_VERSION)${NC}"
    exit 1
fi

echo -e "${GREEN}[OK]${NC} Node.js $(node -v)"

# Check npm packages
if [ ! -d "$PROJECT_ROOT/node_modules" ]; then
    echo -e "${YELLOW}Installing dependencies...${NC}"
    cd "$PROJECT_ROOT"
    npm install
fi
echo -e "${GREEN}[OK]${NC} Dependencies installed"

# Check Mapbox token
if [ -z "$NEXT_PUBLIC_MAPBOX_TOKEN" ]; then
    if [ -f "$PROJECT_ROOT/.env" ]; then
        export $(grep -v '^#' "$PROJECT_ROOT/.env" | xargs)
    fi
    if [ -f "$PROJECT_ROOT/.env.local" ]; then
        export $(grep -v '^#' "$PROJECT_ROOT/.env.local" | xargs)
    fi
fi

if [ -z "$NEXT_PUBLIC_MAPBOX_TOKEN" ]; then
    echo -e "${RED}Error: Mapbox token not found${NC}"
    echo ""
    echo "Please set your Mapbox access token:"
    echo "  export NEXT_PUBLIC_MAPBOX_TOKEN='your-token-here'"
    echo ""
    echo "Or create a .env.local file with:"
    echo "  NEXT_PUBLIC_MAPBOX_TOKEN=your-token-here"
    echo ""
    echo "Get your free token at: https://account.mapbox.com/"
    exit 1
fi
echo -e "${GREEN}[OK]${NC} Mapbox token configured"

# Check config file
if [ ! -f "$CONFIG_FILE" ]; then
    echo -e "${RED}Error: Configuration file not found: $CONFIG_FILE${NC}"
    echo ""
    echo "Available example configs:"
    ls -1 "$PROJECT_ROOT/examples/"*.json 2>/dev/null || echo "  (none found)"
    exit 1
fi
echo -e "${GREEN}[OK]${NC} Config: $CONFIG_FILE"

# Create output directory
OUTPUT_DIR=$(dirname "$OUTPUT_FILE")
mkdir -p "$OUTPUT_DIR"
echo -e "${GREEN}[OK]${NC} Output: $OUTPUT_FILE"

# Extract config info
if command -v jq &> /dev/null; then
    DURATION=$(jq -r '.settings.duration // 30' "$CONFIG_FILE")
    RESOLUTION=$(jq -r '.settings.resolution // "1080p"' "$CONFIG_FILE")
    PROPERTY_NAME=$(jq -r '.zones[0].name // "Property"' "$CONFIG_FILE")
else
    DURATION="(unknown)"
    RESOLUTION="(unknown)"
    PROPERTY_NAME="Property"
fi

echo ""
echo -e "${BLUE}Configuration:${NC}"
echo "  Property: $PROPERTY_NAME"
echo "  Duration: ${DURATION}s"
echo "  Resolution: $RESOLUTION"
echo ""

# Confirm before rendering
read -p "Start rendering? [Y/n] " -n 1 -r
echo ""
if [[ $REPLY =~ ^[Nn]$ ]]; then
    echo "Cancelled."
    exit 0
fi

echo ""
echo -e "${YELLOW}Starting render...${NC}"
echo ""

# Run the render
cd "$PROJECT_ROOT"

npx remotion render \
    src/remotion/index.ts \
    PropertyClipComposition \
    "$OUTPUT_FILE" \
    --props="$CONFIG_FILE" \
    --codec=h264 \
    --crf=18 \
    --log=verbose

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  Render Complete!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "Output saved to: ${BLUE}$OUTPUT_FILE${NC}"
echo ""

# Show file info
if [ -f "$OUTPUT_FILE" ]; then
    FILE_SIZE=$(ls -lh "$OUTPUT_FILE" | awk '{print $5}')
    echo "File size: $FILE_SIZE"
    
    if command -v ffprobe &> /dev/null; then
        DURATION_ACTUAL=$(ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "$OUTPUT_FILE" 2>/dev/null | cut -d'.' -f1)
        echo "Duration: ${DURATION_ACTUAL}s"
    fi
fi

echo ""
