#!/bin/bash

# ===========================================
# PropertyClips - Remotion Lambda Deployment Script
# ===========================================

set -e

# Configuration
REGION="${AWS_REGION:-eu-west-1}"
ENVIRONMENT="${ENVIRONMENT:-production}"
FUNCTION_NAME="remotion-render-${ENVIRONMENT}"
SITE_NAME="propertyclips-${ENVIRONMENT}"

# Colours for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Colour

echo -e "${GREEN}============================================${NC}"
echo -e "${GREEN}PropertyClips Remotion Lambda Deployment${NC}"
echo -e "${GREEN}============================================${NC}"
echo ""
echo "Region: ${REGION}"
echo "Environment: ${ENVIRONMENT}"
echo "Function Name: ${FUNCTION_NAME}"
echo ""

# Check for required tools
check_tool() {
    if ! command -v $1 &> /dev/null; then
        echo -e "${RED}Error: $1 is not installed${NC}"
        exit 1
    fi
}

check_tool "aws"
check_tool "npx"
check_tool "node"

# Check AWS credentials
echo -e "${YELLOW}Checking AWS credentials...${NC}"
aws sts get-caller-identity > /dev/null 2>&1 || {
    echo -e "${RED}Error: AWS credentials not configured${NC}"
    exit 1
}
echo -e "${GREEN}AWS credentials OK${NC}"
echo ""

# Navigate to project root
cd "$(dirname "$0")/../.."
PROJECT_ROOT=$(pwd)
echo "Project root: ${PROJECT_ROOT}"
echo ""

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}Installing dependencies...${NC}"
    npm install
fi

# Build the Remotion bundle
echo -e "${YELLOW}Building Remotion bundle...${NC}"
npx remotion bundle --bundle-out ./remotion-bundle
echo -e "${GREEN}Bundle created${NC}"
echo ""

# Deploy the Remotion site to S3
echo -e "${YELLOW}Deploying Remotion site...${NC}"
SITE_ID=$(npx remotion lambda sites create \
    --site-name="${SITE_NAME}" \
    --region="${REGION}" \
    2>&1 | grep "Site ID:" | awk '{print $3}')

if [ -z "$SITE_ID" ]; then
    echo -e "${YELLOW}Site may already exist, getting existing site ID...${NC}"
    SITE_ID=$(npx remotion lambda sites ls --region="${REGION}" 2>&1 | grep "${SITE_NAME}" | awk '{print $1}')
fi

echo "Site ID: ${SITE_ID}"
echo ""

# Deploy or update the Lambda function
echo -e "${YELLOW}Deploying Lambda function...${NC}"

# Check if function exists
FUNCTION_EXISTS=$(npx remotion lambda functions ls --region="${REGION}" 2>&1 | grep "${FUNCTION_NAME}" || true)

if [ -n "$FUNCTION_EXISTS" ]; then
    echo "Function exists, updating..."
    npx remotion lambda functions deploy \
        --region="${REGION}" \
        --memory=2048 \
        --timeout=900 \
        --disk=2048 \
        --custom-role-arn="" \
        --enable-v5-runtime
else
    echo "Creating new function..."
    npx remotion lambda functions deploy \
        --region="${REGION}" \
        --memory=2048 \
        --timeout=900 \
        --disk=2048 \
        --enable-v5-runtime
fi

echo -e "${GREEN}Lambda function deployed${NC}"
echo ""

# Get the function ARN
FUNCTION_ARN=$(aws lambda get-function \
    --function-name "${FUNCTION_NAME}" \
    --region "${REGION}" \
    --query 'Configuration.FunctionArn' \
    --output text 2>/dev/null || echo "")

if [ -n "$FUNCTION_ARN" ]; then
    echo "Function ARN: ${FUNCTION_ARN}"
    
    # Update SSM parameters
    echo -e "${YELLOW}Updating SSM parameters...${NC}"
    aws ssm put-parameter \
        --name "/propertyclips/${ENVIRONMENT}/remotion/function-name" \
        --value "${FUNCTION_NAME}" \
        --type "String" \
        --overwrite \
        --region "${REGION}"
    
    SERVE_URL="https://remotionlambda-${REGION}.s3.${REGION}.amazonaws.com/sites/${SITE_ID}/index.html"
    aws ssm put-parameter \
        --name "/propertyclips/${ENVIRONMENT}/remotion/serve-url" \
        --value "${SERVE_URL}" \
        --type "String" \
        --overwrite \
        --region "${REGION}"
    
    echo -e "${GREEN}SSM parameters updated${NC}"
fi

echo ""
echo -e "${GREEN}============================================${NC}"
echo -e "${GREEN}Deployment Complete!${NC}"
echo -e "${GREEN}============================================${NC}"
echo ""
echo "Function Name: ${FUNCTION_NAME}"
echo "Region: ${REGION}"
echo "Site ID: ${SITE_ID}"
echo ""
echo "To render a video, use:"
echo "  npx remotion lambda render ${SITE_ID} PropertyClip output.mp4"
echo ""
