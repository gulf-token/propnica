#!/bin/bash

# ===========================================
# PropertyClips - Terraform Infrastructure Deployment
# ===========================================

set -e

# Configuration
ENVIRONMENT="${ENVIRONMENT:-production}"
REGION="${AWS_REGION:-eu-west-1}"

# Colours for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Colour

echo -e "${GREEN}============================================${NC}"
echo -e "${GREEN}PropertyClips Infrastructure Deployment${NC}"
echo -e "${GREEN}============================================${NC}"
echo ""
echo "Environment: ${ENVIRONMENT}"
echo "Region: ${REGION}"
echo ""

# Navigate to terraform directory
cd "$(dirname "$0")/../infrastructure/terraform"
TERRAFORM_DIR=$(pwd)
echo "Terraform directory: ${TERRAFORM_DIR}"
echo ""

# Check for required tools
check_tool() {
    if ! command -v $1 &> /dev/null; then
        echo -e "${RED}Error: $1 is not installed${NC}"
        exit 1
    fi
}

check_tool "terraform"
check_tool "aws"

# Check AWS credentials
echo -e "${YELLOW}Checking AWS credentials...${NC}"
aws sts get-caller-identity > /dev/null 2>&1 || {
    echo -e "${RED}Error: AWS credentials not configured${NC}"
    exit 1
}
echo -e "${GREEN}AWS credentials OK${NC}"
echo ""

# Create terraform.tfvars if it doesn't exist
if [ ! -f "terraform.tfvars" ]; then
    echo -e "${YELLOW}Creating terraform.tfvars from example...${NC}"
    cp terraform.tfvars.example terraform.tfvars
    echo -e "${YELLOW}Please edit terraform.tfvars with your configuration${NC}"
fi

# Create S3 bucket for Terraform state if it doesn't exist
STATE_BUCKET="propertyclips-terraform-state"
if ! aws s3api head-bucket --bucket "${STATE_BUCKET}" 2>/dev/null; then
    echo -e "${YELLOW}Creating Terraform state bucket...${NC}"
    aws s3api create-bucket \
        --bucket "${STATE_BUCKET}" \
        --region "${REGION}" \
        --create-bucket-configuration LocationConstraint="${REGION}"
    
    aws s3api put-bucket-versioning \
        --bucket "${STATE_BUCKET}" \
        --versioning-configuration Status=Enabled
    
    aws s3api put-bucket-encryption \
        --bucket "${STATE_BUCKET}" \
        --server-side-encryption-configuration '{
            "Rules": [
                {
                    "ApplyServerSideEncryptionByDefault": {
                        "SSEAlgorithm": "AES256"
                    }
                }
            ]
        }'
    
    echo -e "${GREEN}State bucket created${NC}"
fi

# Create DynamoDB table for state locking if it doesn't exist
LOCK_TABLE="propertyclips-terraform-locks"
if ! aws dynamodb describe-table --table-name "${LOCK_TABLE}" --region "${REGION}" 2>/dev/null; then
    echo -e "${YELLOW}Creating Terraform lock table...${NC}"
    aws dynamodb create-table \
        --table-name "${LOCK_TABLE}" \
        --attribute-definitions AttributeName=LockID,AttributeType=S \
        --key-schema AttributeName=LockID,KeyType=HASH \
        --billing-mode PAY_PER_REQUEST \
        --region "${REGION}"
    
    echo "Waiting for table to be active..."
    aws dynamodb wait table-exists --table-name "${LOCK_TABLE}" --region "${REGION}"
    echo -e "${GREEN}Lock table created${NC}"
fi

echo ""

# Initialize Terraform
echo -e "${YELLOW}Initializing Terraform...${NC}"
terraform init -upgrade
echo -e "${GREEN}Terraform initialized${NC}"
echo ""

# Validate configuration
echo -e "${YELLOW}Validating Terraform configuration...${NC}"
terraform validate
echo -e "${GREEN}Configuration valid${NC}"
echo ""

# Plan deployment
echo -e "${YELLOW}Planning deployment...${NC}"
terraform plan -var="environment=${ENVIRONMENT}" -var="aws_region=${REGION}" -out=tfplan
echo ""

# Ask for confirmation
read -p "Apply this plan? (y/n) " -n 1 -r
echo ""
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${YELLOW}Applying Terraform plan...${NC}"
    terraform apply tfplan
    echo ""
    
    # Output important values
    echo -e "${GREEN}============================================${NC}"
    echo -e "${GREEN}Deployment Complete!${NC}"
    echo -e "${GREEN}============================================${NC}"
    echo ""
    echo "Important outputs:"
    terraform output
    echo ""
    echo -e "${YELLOW}Note: Save the access keys securely and add them to your .env file${NC}"
else
    echo -e "${YELLOW}Deployment cancelled${NC}"
fi

# Cleanup
rm -f tfplan
