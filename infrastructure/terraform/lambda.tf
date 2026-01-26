# ===========================================
# Remotion Lambda Function Configuration
# ===========================================

# Note: The actual Lambda function is deployed using Remotion's CLI
# This file provisions supporting infrastructure

# ===========================================
# Lambda Function (placeholder for Remotion deployment)
# ===========================================

# The Remotion Lambda function is deployed separately using:
# npx remotion lambda functions deploy
# 
# This creates the function with the proper Remotion runtime.
# After deployment, update the function ARN in SSM Parameter Store.

# ===========================================
# SSM Parameters for Configuration
# ===========================================

resource "aws_ssm_parameter" "remotion_function_name" {
  name        = "/propnica/${var.environment}/remotion/function-name"
  description = "Name of the Remotion Lambda function"
  type        = "String"
  value       = "remotion-render-${var.environment}"
}

resource "aws_ssm_parameter" "remotion_region" {
  name        = "/propnica/${var.environment}/remotion/region"
  description = "AWS region for Remotion Lambda"
  type        = "String"
  value       = var.aws_region
}

resource "aws_ssm_parameter" "remotion_serve_url" {
  name        = "/propnica/${var.environment}/remotion/serve-url"
  description = "Remotion serve URL for the deployed site"
  type        = "String"
  value       = "placeholder" # Updated after deployment
}

# ===========================================
# CloudWatch Log Group
# ===========================================

resource "aws_cloudwatch_log_group" "remotion_lambda" {
  name              = "/aws/lambda/remotion-render-${var.environment}"
  retention_in_days = 14
}

# ===========================================
# Lambda Layer for Chromium (optional)
# ===========================================

# Remotion includes Chromium in its Lambda layer
# This is handled automatically by the Remotion CLI

# ===========================================
# Event Source Mapping (SQS to Lambda)
# ===========================================

# This will be created after the Lambda function is deployed
# resource "aws_lambda_event_source_mapping" "render_queue" {
#   event_source_arn = aws_sqs_queue.render_jobs.arn
#   function_name    = "remotion-render-${var.environment}"
#   batch_size       = 1
# }

# ===========================================
# IAM Policy for Application to Invoke Lambda
# ===========================================

resource "aws_iam_policy" "invoke_remotion" {
  name        = "propnica-invoke-remotion-${var.environment}"
  description = "Allow invoking the Remotion Lambda function"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "lambda:InvokeFunction"
        ]
        Resource = "arn:aws:lambda:${var.aws_region}:${data.aws_caller_identity.current.account_id}:function:remotion-render-${var.environment}"
      },
      {
        Effect = "Allow"
        Action = [
          "sqs:SendMessage",
          "sqs:GetQueueAttributes"
        ]
        Resource = aws_sqs_queue.render_jobs.arn
      }
    ]
  })
}

# ===========================================
# GitHub OIDC Provider
# ===========================================
# Enables GitHub Actions to assume AWS roles without long-lived credentials

variable "github_org" {
  description = "GitHub organization or user name"
  type        = string
  default     = "gulf-token"
}

variable "github_repo" {
  description = "GitHub repository name"
  type        = string
  default     = "propnica"
}

# GitHub OIDC Identity Provider (create once per AWS account)
resource "aws_iam_openid_connect_provider" "github" {
  url = "https://token.actions.githubusercontent.com"

  client_id_list = ["sts.amazonaws.com"]

  # GitHub's OIDC thumbprint
  thumbprint_list = ["6938fd4d98bab03faadb97b34396831e3780aea1"]

  tags = {
    Name = "github-oidc-provider"
  }
}

# IAM Role for GitHub Actions
resource "aws_iam_role" "github_actions" {
  name = "propnica-github-actions-${var.environment}"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          Federated = aws_iam_openid_connect_provider.github.arn
        }
        Action = "sts:AssumeRoleWithWebIdentity"
        Condition = {
          StringEquals = {
            "token.actions.githubusercontent.com:aud" = "sts.amazonaws.com"
          }
          StringLike = {
            "token.actions.githubusercontent.com:sub" = "repo:${var.github_org}/${var.github_repo}:*"
          }
        }
      }
    ]
  })

  tags = {
    Name = "propnica-github-actions-${var.environment}"
  }
}

# Policy for GitHub Actions (deployment permissions)
resource "aws_iam_role_policy" "github_actions" {
  name = "propnica-github-actions-policy"
  role = aws_iam_role.github_actions.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "S3Access"
        Effect = "Allow"
        Action = [
          "s3:GetObject",
          "s3:PutObject",
          "s3:DeleteObject",
          "s3:ListBucket",
          "s3:GetBucketLocation"
        ]
        Resource = [
          aws_s3_bucket.renders.arn,
          "${aws_s3_bucket.renders.arn}/*",
          aws_s3_bucket.assets.arn,
          "${aws_s3_bucket.assets.arn}/*",
          aws_s3_bucket.thumbnails.arn,
          "${aws_s3_bucket.thumbnails.arn}/*"
        ]
      },
      {
        Sid    = "LambdaAccess"
        Effect = "Allow"
        Action = [
          "lambda:GetFunction",
          "lambda:InvokeFunction",
          "lambda:UpdateFunctionCode",
          "lambda:UpdateFunctionConfiguration"
        ]
        Resource = "arn:aws:lambda:${var.aws_region}:${data.aws_caller_identity.current.account_id}:function:remotion-render-*"
      },
      {
        Sid    = "CloudFrontInvalidation"
        Effect = "Allow"
        Action = [
          "cloudfront:CreateInvalidation"
        ]
        Resource = "*"
      },
      {
        Sid    = "SSMParameterAccess"
        Effect = "Allow"
        Action = [
          "ssm:GetParameter",
          "ssm:PutParameter"
        ]
        Resource = "arn:aws:ssm:${var.aws_region}:${data.aws_caller_identity.current.account_id}:parameter/propnica/${var.environment}/*"
      }
    ]
  })
}

# ===========================================
# IAM User for Application (fallback/runtime)
# ===========================================

resource "aws_iam_user" "app_user" {
  name = "propnica-app-${var.environment}"
}

resource "aws_iam_user_policy_attachment" "app_user_invoke_remotion" {
  user       = aws_iam_user.app_user.name
  policy_arn = aws_iam_policy.invoke_remotion.arn
}

resource "aws_iam_user_policy" "app_user_s3" {
  name = "propnica-app-s3-${var.environment}"
  user = aws_iam_user.app_user.name

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

# Create access keys (store these securely!)
# Consider using GitHub OIDC instead for CI/CD
resource "aws_iam_access_key" "app_user" {
  user = aws_iam_user.app_user.name
}

# ===========================================
# Outputs
# ===========================================

output "app_user_access_key_id" {
  description = "Access key ID for the application user"
  value       = aws_iam_access_key.app_user.id
  sensitive   = true
}

output "app_user_secret_access_key" {
  description = "Secret access key for the application user"
  value       = aws_iam_access_key.app_user.secret
  sensitive   = true
}

output "invoke_remotion_policy_arn" {
  description = "ARN of the policy to invoke Remotion Lambda"
  value       = aws_iam_policy.invoke_remotion.arn
}

output "github_actions_role_arn" {
  description = "ARN of the IAM role for GitHub Actions (use with OIDC)"
  value       = aws_iam_role.github_actions.arn
}

output "github_oidc_provider_arn" {
  description = "ARN of the GitHub OIDC provider"
  value       = aws_iam_openid_connect_provider.github.arn
}
