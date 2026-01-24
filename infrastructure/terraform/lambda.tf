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
  name        = "/propertyclips/${var.environment}/remotion/function-name"
  description = "Name of the Remotion Lambda function"
  type        = "String"
  value       = "remotion-render-${var.environment}"
}

resource "aws_ssm_parameter" "remotion_region" {
  name        = "/propertyclips/${var.environment}/remotion/region"
  description = "AWS region for Remotion Lambda"
  type        = "String"
  value       = var.aws_region
}

resource "aws_ssm_parameter" "remotion_serve_url" {
  name        = "/propertyclips/${var.environment}/remotion/serve-url"
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
  name        = "propertyclips-invoke-remotion-${var.environment}"
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
# IAM User for Application
# ===========================================

resource "aws_iam_user" "app_user" {
  name = "propertyclips-app-${var.environment}"
}

resource "aws_iam_user_policy_attachment" "app_user_invoke_remotion" {
  user       = aws_iam_user.app_user.name
  policy_arn = aws_iam_policy.invoke_remotion.arn
}

resource "aws_iam_user_policy" "app_user_s3" {
  name = "propertyclips-app-s3-${var.environment}"
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
