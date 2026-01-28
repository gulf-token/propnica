# ===========================================
# AWS Amplify Hosting for Next.js
# ===========================================

# ===========================================
# Variables
# ===========================================

variable "github_repository" {
  description = "GitHub repository URL"
  type        = string
  default     = "https://github.com/gulf-token/propnica"
}

variable "github_branch" {
  description = "Branch to deploy"
  type        = string
  default     = "main"
}

variable "github_access_token" {
  description = "GitHub personal access token for Amplify"
  type        = string
  sensitive   = true
  default     = "" # Set via terraform.tfvars or environment variable
}

variable "supabase_url" {
  description = "Supabase project URL (public)"
  type        = string
  default     = "" # Set via terraform.tfvars
}

variable "supabase_anon_key" {
  description = "Supabase anonymous key (public)"
  type        = string
  default     = "" # Set via terraform.tfvars
}

variable "mapbox_access_token" {
  description = "Mapbox public access token"
  type        = string
  default     = "" # Set via terraform.tfvars
}

# ===========================================
# Amplify App
# ===========================================

resource "aws_amplify_app" "main" {
  name       = "propnica-${var.environment}"
  repository = var.github_repository

  # GitHub access token (required for private repos)
  access_token = var.github_access_token != "" ? var.github_access_token : null

  # IAM service role for SSM access and other AWS services
  iam_service_role_arn = aws_iam_role.amplify_service_role.arn

  # Build settings for Next.js with pnpm
  build_spec = <<-EOT
    version: 1
    frontend:
      phases:
        preBuild:
          commands:
            - corepack enable
            - corepack prepare pnpm@latest --activate
            - pnpm install
            # Retrieve secrets from SSM Parameter Store
            - echo "Retrieving secrets from SSM..."
            - export DATABASE_URL=$(aws ssm get-parameter --name "/propnica/${var.environment}/database/url" --with-decryption --query "Parameter.Value" --output text 2>/dev/null || echo "")
            - export SUPABASE_SERVICE_ROLE_KEY=$(aws ssm get-parameter --name "/propnica/${var.environment}/supabase/service_role_key" --with-decryption --query "Parameter.Value" --output text 2>/dev/null || echo "")
            - export ANTHROPIC_API_KEY=$(aws ssm get-parameter --name "/propnica/${var.environment}/anthropic/api_key" --with-decryption --query "Parameter.Value" --output text 2>/dev/null || echo "")
            - echo "DATABASE_URL is set:" $([[ -n "$DATABASE_URL" ]] && echo "YES" || echo "NO")
            - echo "SUPABASE_SERVICE_ROLE_KEY is set:" $([[ -n "$SUPABASE_SERVICE_ROLE_KEY" ]] && echo "YES" || echo "NO")
            - echo "ANTHROPIC_API_KEY is set:" $([[ -n "$ANTHROPIC_API_KEY" ]] && echo "YES" || echo "NO")
            - npx prisma generate
        build:
          commands:
            # Re-export for build phase (env vars don't persist between phases)
            - export DATABASE_URL=$(aws ssm get-parameter --name "/propnica/${var.environment}/database/url" --with-decryption --query "Parameter.Value" --output text 2>/dev/null || echo "")
            - export SUPABASE_SERVICE_ROLE_KEY=$(aws ssm get-parameter --name "/propnica/${var.environment}/supabase/service_role_key" --with-decryption --query "Parameter.Value" --output text 2>/dev/null || echo "")
            - export ANTHROPIC_API_KEY=$(aws ssm get-parameter --name "/propnica/${var.environment}/anthropic/api_key" --with-decryption --query "Parameter.Value" --output text 2>/dev/null || echo "")
            - pnpm run build
      artifacts:
        baseDirectory: .next
        files:
          - '**/*'
      cache:
        paths:
          - node_modules/**/*
          - .next/cache/**/*
  EOT

  # Next.js SSR support
  platform = "WEB_COMPUTE"

  # Environment variables
  # Note: Amplify doesn't allow empty values, so we use merge with conditionals
  environment_variables = merge(
    {
      NODE_ENV                      = var.environment == "production" ? "production" : "development"
      NEXT_PUBLIC_APP_URL           = var.environment == "production" ? "https://${var.domain_name}" : "https://${var.environment}.${var.domain_name}"
      NEXT_PUBLIC_SUPABASE_URL      = var.supabase_url
      NEXT_PUBLIC_SUPABASE_ANON_KEY = var.supabase_anon_key
      _CUSTOM_IMAGE                 = "amplify:al2023"
    },
    var.mapbox_access_token != "" ? { NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN = var.mapbox_access_token } : {}
  )

  # Note: For Next.js SSR (WEB_COMPUTE platform), Amplify handles routing automatically
  # Custom rewrite rules are not needed and can interfere with SSR

  # Enable auto branch creation for feature branches
  enable_auto_branch_creation   = false
  enable_branch_auto_build      = true
  enable_branch_auto_deletion   = true

  # Auto branch creation patterns
  auto_branch_creation_patterns = [
    "feature/*",
    "develop",
  ]

  auto_branch_creation_config {
    enable_auto_build           = true
    enable_pull_request_preview = true
    framework                   = "Next.js - SSR"
  }
}

# ===========================================
# Branch Configuration
# ===========================================

resource "aws_amplify_branch" "main" {
  app_id      = aws_amplify_app.main.id
  branch_name = var.github_branch

  framework = "Next.js - SSR"
  stage     = var.environment == "production" ? "PRODUCTION" : "DEVELOPMENT"

  enable_auto_build      = true
  enable_pull_request_preview = var.environment != "production"

  # Server-side env vars (DATABASE_URL, ANTHROPIC_API_KEY, etc.) are retrieved
  # from SSM during the build phase and baked into the Next.js bundle via next.config.js.
  # We use a lifecycle ignore to avoid conflicts with manually-set branch variables.
  lifecycle {
    ignore_changes = [environment_variables]
  }
}

# Development branch
resource "aws_amplify_branch" "develop" {
  count = var.environment == "production" ? 1 : 0

  app_id      = aws_amplify_app.main.id
  branch_name = "develop"

  framework = "Next.js - SSR"
  stage     = "DEVELOPMENT"

  enable_auto_build           = true
  enable_pull_request_preview = true
}

# ===========================================
# Domain Association (optional)
# ===========================================

resource "aws_amplify_domain_association" "main" {
  # Temporarily disabled - domain still attached to old Amplify app in account 992382672555
  # Re-enable after removing from old account
  count = 0 # var.environment == "production" ? 1 : 0

  app_id      = aws_amplify_app.main.id
  domain_name = var.domain_name

  sub_domain {
    branch_name = aws_amplify_branch.main.branch_name
    prefix      = ""
  }

  sub_domain {
    branch_name = aws_amplify_branch.main.branch_name
    prefix      = "www"
  }

  # Wait for domain verification (may take time for new domains)
  wait_for_verification = false
}

# ===========================================
# IAM Role for Amplify
# ===========================================

resource "aws_iam_role" "amplify_service_role" {
  name = "propnica-amplify-service-role-${var.environment}"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "amplify.amazonaws.com"
        }
      }
    ]
  })
}

resource "aws_iam_role_policy" "amplify_ssm" {
  name = "propnica-amplify-ssm-${var.environment}"
  role = aws_iam_role.amplify_service_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "ssm:GetParameter",
          "ssm:GetParameters",
          "ssm:GetParametersByPath"
        ]
        Resource = "arn:aws:ssm:${var.aws_region}:${data.aws_caller_identity.current.account_id}:parameter/propnica/${var.environment}/*"
      }
    ]
  })
}

resource "aws_iam_role_policy" "amplify_s3" {
  name = "propnica-amplify-s3-${var.environment}"
  role = aws_iam_role.amplify_service_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "s3:GetObject",
          "s3:PutObject",
          "s3:DeleteObject",
          "s3:ListBucket"
        ]
        Resource = [
          aws_s3_bucket.renders.arn,
          "${aws_s3_bucket.renders.arn}/*",
          aws_s3_bucket.assets.arn,
          "${aws_s3_bucket.assets.arn}/*",
          aws_s3_bucket.thumbnails.arn,
          "${aws_s3_bucket.thumbnails.arn}/*"
        ]
      }
    ]
  })
}

# ===========================================
# Webhook for Manual Deployments
# ===========================================

resource "aws_amplify_webhook" "main" {
  app_id      = aws_amplify_app.main.id
  branch_name = aws_amplify_branch.main.branch_name
  description = "Trigger deployment webhook"
}

# ===========================================
# Outputs
# ===========================================

output "amplify_app_id" {
  description = "Amplify App ID"
  value       = aws_amplify_app.main.id
}

output "amplify_app_arn" {
  description = "Amplify App ARN"
  value       = aws_amplify_app.main.arn
}

output "amplify_default_domain" {
  description = "Amplify default domain"
  value       = aws_amplify_app.main.default_domain
}

output "amplify_branch_url" {
  description = "URL of the deployed branch"
  value       = "https://${aws_amplify_branch.main.branch_name}.${aws_amplify_app.main.default_domain}"
}

output "amplify_webhook_url" {
  description = "Webhook URL for triggering deployments"
  value       = aws_amplify_webhook.main.url
  sensitive   = true
}
