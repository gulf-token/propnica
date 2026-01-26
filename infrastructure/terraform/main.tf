# ===========================================
# Propnica AWS Infrastructure
# Terraform Configuration
# ===========================================

terraform {
  required_version = ">= 1.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }

  backend "s3" {
    bucket         = "propnica-terraform-state"
    key            = "infrastructure/terraform.tfstate"
    region         = "eu-central-1"
    encrypt        = true
    dynamodb_table = "propnica-terraform-locks"
  }
}

# ===========================================
# Provider Configuration
# ===========================================

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Project     = "Propnica"
      Environment = var.environment
      ManagedBy   = "Terraform"
    }
  }
}

# Provider for us-east-1 (required for CloudFront ACM certificates)
provider "aws" {
  alias  = "us_east_1"
  region = "us-east-1"

  default_tags {
    tags = {
      Project     = "Propnica"
      Environment = var.environment
      ManagedBy   = "Terraform"
    }
  }
}

# ===========================================
# Variables
# ===========================================

variable "aws_region" {
  description = "AWS region for resources"
  type        = string
  default     = "eu-central-1"
}

variable "environment" {
  description = "Environment name (development, staging, production)"
  type        = string
  default     = "production"
}

variable "domain_name" {
  description = "Domain name for the application"
  type        = string
  default     = "propnica.app"
}

variable "cdn_domain_name" {
  description = "Custom domain name for CloudFront CDN (e.g., cdn.propnica.app). Leave empty to use default CloudFront domain."
  type        = string
  default     = ""
}

variable "enable_cdn_ssl" {
  description = "Whether to enable custom SSL certificate for CloudFront"
  type        = bool
  default     = false
}

variable "remotion_lambda_memory" {
  description = "Memory allocation for Remotion Lambda function"
  type        = number
  default     = 2048
}

variable "remotion_lambda_timeout" {
  description = "Timeout for Remotion Lambda function in seconds"
  type        = number
  default     = 900 # 15 minutes
}

# ===========================================
# Data Sources
# ===========================================

data "aws_caller_identity" "current" {}
data "aws_region" "current" {}

# ===========================================
# S3 Buckets
# ===========================================

# Renders bucket - stores rendered videos
resource "aws_s3_bucket" "renders" {
  bucket = "propnica-renders-${var.environment}"
}

resource "aws_s3_bucket_versioning" "renders" {
  bucket = aws_s3_bucket.renders.id
  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_lifecycle_configuration" "renders" {
  bucket = aws_s3_bucket.renders.id

  rule {
    id     = "delete-old-renders"
    status = "Enabled"

    expiration {
      days = 30
    }

    noncurrent_version_expiration {
      noncurrent_days = 7
    }
  }
}

resource "aws_s3_bucket_cors_configuration" "renders" {
  bucket = aws_s3_bucket.renders.id

  cors_rule {
    allowed_headers = ["*"]
    allowed_methods = ["GET", "HEAD"]
    allowed_origins = ["https://${var.domain_name}", "http://localhost:3000"]
    expose_headers  = ["ETag"]
    max_age_seconds = 3600
  }
}

resource "aws_s3_bucket_public_access_block" "renders" {
  bucket = aws_s3_bucket.renders.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# Assets bucket - stores user uploads
resource "aws_s3_bucket" "assets" {
  bucket = "propnica-assets-${var.environment}"
}

resource "aws_s3_bucket_versioning" "assets" {
  bucket = aws_s3_bucket.assets.id
  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_cors_configuration" "assets" {
  bucket = aws_s3_bucket.assets.id

  cors_rule {
    allowed_headers = ["*"]
    allowed_methods = ["GET", "PUT", "POST", "HEAD"]
    allowed_origins = ["https://${var.domain_name}", "http://localhost:3000"]
    expose_headers  = ["ETag"]
    max_age_seconds = 3600
  }
}

resource "aws_s3_bucket_public_access_block" "assets" {
  bucket = aws_s3_bucket.assets.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# Thumbnails bucket - stores video thumbnails
resource "aws_s3_bucket" "thumbnails" {
  bucket = "propnica-thumbnails-${var.environment}"
}

resource "aws_s3_bucket_cors_configuration" "thumbnails" {
  bucket = aws_s3_bucket.thumbnails.id

  cors_rule {
    allowed_headers = ["*"]
    allowed_methods = ["GET", "HEAD"]
    allowed_origins = ["https://${var.domain_name}", "http://localhost:3000"]
    expose_headers  = ["ETag"]
    max_age_seconds = 86400
  }
}

resource "aws_s3_bucket_public_access_block" "thumbnails" {
  bucket = aws_s3_bucket.thumbnails.id

  block_public_acls       = false
  block_public_policy     = false
  ignore_public_acls      = false
  restrict_public_buckets = false
}

resource "aws_s3_bucket_policy" "thumbnails_public" {
  bucket = aws_s3_bucket.thumbnails.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid       = "PublicReadGetObject"
        Effect    = "Allow"
        Principal = "*"
        Action    = "s3:GetObject"
        Resource  = "${aws_s3_bucket.thumbnails.arn}/*"
      }
    ]
  })
}

# ===========================================
# IAM Role for Lambda
# ===========================================

resource "aws_iam_role" "remotion_lambda" {
  name = "propnica-remotion-lambda-${var.environment}"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "lambda.amazonaws.com"
        }
      }
    ]
  })
}

resource "aws_iam_role_policy" "remotion_lambda_s3" {
  name = "propnica-remotion-s3-${var.environment}"
  role = aws_iam_role.remotion_lambda.id

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

resource "aws_iam_role_policy" "remotion_lambda_logs" {
  name = "propnica-remotion-logs-${var.environment}"
  role = aws_iam_role.remotion_lambda.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents"
        ]
        Resource = "arn:aws:logs:*:*:*"
      }
    ]
  })
}

# ===========================================
# SQS Queue for Render Jobs
# ===========================================

resource "aws_sqs_queue" "render_jobs" {
  name                       = "propnica-render-jobs-${var.environment}"
  delay_seconds              = 0
  max_message_size           = 262144
  message_retention_seconds  = 86400
  receive_wait_time_seconds  = 10
  visibility_timeout_seconds = 930 # Slightly longer than Lambda timeout

  redrive_policy = jsonencode({
    deadLetterTargetArn = aws_sqs_queue.render_jobs_dlq.arn
    maxReceiveCount     = 3
  })
}

resource "aws_sqs_queue" "render_jobs_dlq" {
  name                      = "propnica-render-jobs-dlq-${var.environment}"
  message_retention_seconds = 1209600 # 14 days
}

# ===========================================
# ACM Certificate for CloudFront (optional)
# ===========================================

# Certificate must be in us-east-1 for CloudFront
resource "aws_acm_certificate" "cdn" {
  count    = var.enable_cdn_ssl && var.cdn_domain_name != "" ? 1 : 0
  provider = aws.us_east_1

  domain_name       = var.cdn_domain_name
  validation_method = "DNS"

  lifecycle {
    create_before_destroy = true
  }

  tags = {
    Name = "propnica-cdn-cert-${var.environment}"
  }
}

# ===========================================
# CloudFront Distribution for Renders
# ===========================================

resource "aws_cloudfront_origin_access_control" "renders" {
  name                              = "propnica-renders-oac-${var.environment}"
  description                       = "OAC for renders bucket"
  origin_access_control_origin_type = "s3"
  signing_behavior                  = "always"
  signing_protocol                  = "sigv4"
}

resource "aws_cloudfront_distribution" "renders" {
  enabled             = true
  is_ipv6_enabled     = true
  comment             = "Propnica Renders CDN - ${var.environment}"
  default_root_object = ""
  price_class         = "PriceClass_100"

  # Custom domain alias (optional)
  aliases = var.enable_cdn_ssl && var.cdn_domain_name != "" ? [var.cdn_domain_name] : []

  origin {
    domain_name              = aws_s3_bucket.renders.bucket_regional_domain_name
    origin_access_control_id = aws_cloudfront_origin_access_control.renders.id
    origin_id                = "renders-s3"
  }

  default_cache_behavior {
    allowed_methods  = ["GET", "HEAD", "OPTIONS"]
    cached_methods   = ["GET", "HEAD"]
    target_origin_id = "renders-s3"

    forwarded_values {
      query_string = false
      cookies {
        forward = "none"
      }
    }

    viewer_protocol_policy = "redirect-to-https"
    min_ttl                = 0
    default_ttl            = 86400
    max_ttl                = 31536000
    compress               = true
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  # Use custom certificate if enabled, otherwise use default CloudFront certificate
  dynamic "viewer_certificate" {
    for_each = var.enable_cdn_ssl && var.cdn_domain_name != "" ? [1] : []
    content {
      acm_certificate_arn      = aws_acm_certificate.cdn[0].arn
      ssl_support_method       = "sni-only"
      minimum_protocol_version = "TLSv1.2_2021"
    }
  }

  dynamic "viewer_certificate" {
    for_each = var.enable_cdn_ssl && var.cdn_domain_name != "" ? [] : [1]
    content {
      cloudfront_default_certificate = true
    }
  }
}

# Update S3 bucket policy to allow CloudFront access
resource "aws_s3_bucket_policy" "renders_cloudfront" {
  bucket = aws_s3_bucket.renders.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid       = "AllowCloudFrontServicePrincipal"
        Effect    = "Allow"
        Principal = {
          Service = "cloudfront.amazonaws.com"
        }
        Action   = "s3:GetObject"
        Resource = "${aws_s3_bucket.renders.arn}/*"
        Condition = {
          StringEquals = {
            "AWS:SourceArn" = aws_cloudfront_distribution.renders.arn
          }
        }
      }
    ]
  })
}

# ===========================================
# CloudWatch Alarms
# ===========================================

# SNS Topic for alarm notifications
resource "aws_sns_topic" "alerts" {
  name = "propnica-alerts-${var.environment}"
}

# Lambda Error Alarm
resource "aws_cloudwatch_metric_alarm" "lambda_errors" {
  alarm_name          = "propnica-lambda-errors-${var.environment}"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "Errors"
  namespace           = "AWS/Lambda"
  period              = 300
  statistic           = "Sum"
  threshold           = 5
  alarm_description   = "Lambda function errors exceeded threshold"
  alarm_actions       = [aws_sns_topic.alerts.arn]
  ok_actions          = [aws_sns_topic.alerts.arn]

  dimensions = {
    FunctionName = "remotion-render-${var.environment}"
  }

  treat_missing_data = "notBreaching"
}

# Lambda Duration Alarm (approaching timeout)
resource "aws_cloudwatch_metric_alarm" "lambda_duration" {
  alarm_name          = "propnica-lambda-duration-${var.environment}"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "Duration"
  namespace           = "AWS/Lambda"
  period              = 300
  statistic           = "Average"
  threshold           = 840000  # 14 minutes (timeout is 15)
  alarm_description   = "Lambda function duration approaching timeout"
  alarm_actions       = [aws_sns_topic.alerts.arn]

  dimensions = {
    FunctionName = "remotion-render-${var.environment}"
  }

  treat_missing_data = "notBreaching"
}

# SQS Dead Letter Queue Alarm
resource "aws_cloudwatch_metric_alarm" "dlq_messages" {
  alarm_name          = "propnica-dlq-messages-${var.environment}"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  metric_name         = "ApproximateNumberOfMessagesVisible"
  namespace           = "AWS/SQS"
  period              = 300
  statistic           = "Sum"
  threshold           = 0
  alarm_description   = "Messages in dead letter queue indicate failed renders"
  alarm_actions       = [aws_sns_topic.alerts.arn]

  dimensions = {
    QueueName = aws_sqs_queue.render_jobs_dlq.name
  }

  treat_missing_data = "notBreaching"
}

# RDS CPU Utilization Alarm
resource "aws_cloudwatch_metric_alarm" "rds_cpu" {
  alarm_name          = "propnica-rds-cpu-${var.environment}"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 3
  metric_name         = "CPUUtilization"
  namespace           = "AWS/RDS"
  period              = 300
  statistic           = "Average"
  threshold           = 80
  alarm_description   = "RDS CPU utilization is high"
  alarm_actions       = [aws_sns_topic.alerts.arn]
  ok_actions          = [aws_sns_topic.alerts.arn]

  dimensions = {
    DBInstanceIdentifier = "propnica-${var.environment}"
  }

  treat_missing_data = "notBreaching"
}

# RDS Free Storage Space Alarm
resource "aws_cloudwatch_metric_alarm" "rds_storage" {
  alarm_name          = "propnica-rds-storage-${var.environment}"
  comparison_operator = "LessThanThreshold"
  evaluation_periods  = 2
  metric_name         = "FreeStorageSpace"
  namespace           = "AWS/RDS"
  period              = 300
  statistic           = "Average"
  threshold           = 5368709120  # 5 GB in bytes
  alarm_description   = "RDS free storage space is low"
  alarm_actions       = [aws_sns_topic.alerts.arn]

  dimensions = {
    DBInstanceIdentifier = "propnica-${var.environment}"
  }

  treat_missing_data = "notBreaching"
}

# RDS Database Connections Alarm
resource "aws_cloudwatch_metric_alarm" "rds_connections" {
  alarm_name          = "propnica-rds-connections-${var.environment}"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "DatabaseConnections"
  namespace           = "AWS/RDS"
  period              = 300
  statistic           = "Average"
  threshold           = 50  # db.t4g.micro has ~85 max connections
  alarm_description   = "RDS connection count is high"
  alarm_actions       = [aws_sns_topic.alerts.arn]

  dimensions = {
    DBInstanceIdentifier = "propnica-${var.environment}"
  }

  treat_missing_data = "notBreaching"
}

# ===========================================
# Outputs
# ===========================================

output "sns_alerts_topic_arn" {
  description = "ARN of the SNS alerts topic"
  value       = aws_sns_topic.alerts.arn
}

output "renders_bucket_name" {
  description = "Name of the renders S3 bucket"
  value       = aws_s3_bucket.renders.id
}

output "assets_bucket_name" {
  description = "Name of the assets S3 bucket"
  value       = aws_s3_bucket.assets.id
}

output "thumbnails_bucket_name" {
  description = "Name of the thumbnails S3 bucket"
  value       = aws_s3_bucket.thumbnails.id
}

output "render_queue_url" {
  description = "URL of the render jobs SQS queue"
  value       = aws_sqs_queue.render_jobs.url
}

output "render_queue_arn" {
  description = "ARN of the render jobs SQS queue"
  value       = aws_sqs_queue.render_jobs.arn
}

output "lambda_role_arn" {
  description = "ARN of the Lambda execution role"
  value       = aws_iam_role.remotion_lambda.arn
}

output "cloudfront_distribution_domain" {
  description = "Domain name of the CloudFront distribution"
  value       = aws_cloudfront_distribution.renders.domain_name
}

output "cloudfront_distribution_id" {
  description = "ID of the CloudFront distribution"
  value       = aws_cloudfront_distribution.renders.id
}
