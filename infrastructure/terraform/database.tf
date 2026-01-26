# ===========================================
# Propnica Database Infrastructure
# RDS PostgreSQL (Cost-Optimized)
# ===========================================
#
# Security Notes:
# - Database uses SSL/TLS encryption for all connections
# - Credentials stored in AWS SSM Parameter Store
# - publicly_accessible is required for Amplify/Vercel serverless access
# - Restrict allowed_cidr_blocks in production to known IPs
# - Consider RDS Proxy for enhanced security in production
#
# ===========================================

# ===========================================
# Variables
# ===========================================

variable "db_instance_class" {
  description = "RDS instance class"
  type        = string
  default     = "db.t4g.micro" # ARM-based, most cost-effective
}

variable "db_allocated_storage" {
  description = "Allocated storage in GB"
  type        = number
  default     = 20
}

variable "db_name" {
  description = "Database name"
  type        = string
  default     = "propnica"
}

variable "db_username" {
  description = "Database master username"
  type        = string
  default     = "propnica_admin"
}

variable "db_allowed_cidr_blocks" {
  description = "CIDR blocks allowed to access the database. Add your office/VPN IPs for production."
  type        = list(string)
  default     = [] # Empty = no public access by default, set in tfvars
}

variable "db_publicly_accessible" {
  description = "Whether the database is publicly accessible. Required for serverless platforms like Amplify/Vercel."
  type        = bool
  default     = true # Required for serverless, but restricted by security group
}

# ===========================================
# Random Password Generation
# ===========================================

resource "random_password" "db_password" {
  length           = 32
  special          = true
  # URL-safe special characters only (avoiding problematic chars in connection strings)
  override_special = "-_"
}

# ===========================================
# VPC Configuration
# ===========================================

# Use default VPC for cost savings (no NAT Gateway needed)
data "aws_vpc" "default" {
  default = true
}

data "aws_subnets" "default" {
  filter {
    name   = "vpc-id"
    values = [data.aws_vpc.default.id]
  }
}

# Security Group for RDS
resource "aws_security_group" "rds" {
  name        = "propnica-rds-${var.environment}"
  description = "Security group for Propnica RDS"
  vpc_id      = data.aws_vpc.default.id

  # Allow PostgreSQL from specified CIDR blocks only
  # For serverless (Amplify/Vercel), you need their IP ranges or 0.0.0.0/0
  # See: https://vercel.com/docs/security/deployment-protection
  dynamic "ingress" {
    for_each = length(var.db_allowed_cidr_blocks) > 0 ? [1] : []
    content {
      from_port   = 5432
      to_port     = 5432
      protocol    = "tcp"
      cidr_blocks = var.db_allowed_cidr_blocks
      description = "PostgreSQL access from allowed CIDRs"
    }
  }

  # Allow access from Lambda security group (for API routes)
  ingress {
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [aws_security_group.lambda.id]
    description     = "PostgreSQL access from Lambda"
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "propnica-rds-${var.environment}"
  }
}

# Security Group for Lambda functions
resource "aws_security_group" "lambda" {
  name        = "propnica-lambda-${var.environment}"
  description = "Security group for Propnica Lambda functions"
  vpc_id      = data.aws_vpc.default.id

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
    description = "Allow all outbound traffic"
  }

  tags = {
    Name = "propnica-lambda-${var.environment}"
  }
}

# ===========================================
# DB Subnet Group
# ===========================================

resource "aws_db_subnet_group" "main" {
  name       = "propnica-${var.environment}"
  subnet_ids = data.aws_subnets.default.ids

  tags = {
    Name = "propnica-db-subnet-${var.environment}"
  }
}

# ===========================================
# RDS PostgreSQL Instance
# ===========================================

resource "aws_db_instance" "main" {
  identifier = "propnica-${var.environment}"

  # Engine
  engine               = "postgres"
  engine_version       = "15.10"
  instance_class       = var.db_instance_class
  parameter_group_name = aws_db_parameter_group.main.name

  # Storage
  allocated_storage     = var.db_allocated_storage
  max_allocated_storage = 100 # Enable storage autoscaling up to 100GB
  storage_type          = "gp3"
  storage_encrypted     = true

  # Database
  db_name  = var.db_name
  username = var.db_username
  password = random_password.db_password.result

  # Network
  db_subnet_group_name   = aws_db_subnet_group.main.name
  vpc_security_group_ids = [aws_security_group.rds.id]
  publicly_accessible    = var.db_publicly_accessible

  # Backup & Maintenance
  backup_retention_period = 7
  backup_window           = "03:00-04:00"
  maintenance_window      = "Mon:04:00-Mon:05:00"
  copy_tags_to_snapshot   = true

  # Performance Insights (free tier)
  performance_insights_enabled          = true
  performance_insights_retention_period = 7

  # Cost Optimization
  multi_az               = false # Single AZ for cost savings
  deletion_protection    = var.environment == "production"
  skip_final_snapshot    = var.environment != "production"
  final_snapshot_identifier = var.environment == "production" ? "propnica-final-${var.environment}" : null

  # Apply changes immediately in non-production
  apply_immediately = var.environment != "production"

  tags = {
    Name = "propnica-db-${var.environment}"
  }
}

# ===========================================
# Parameter Group
# ===========================================

resource "aws_db_parameter_group" "main" {
  family = "postgres15"
  name   = "propnica-${var.environment}"

  # Optimize for small instance
  parameter {
    name  = "shared_preload_libraries"
    value = "pg_stat_statements"
  }

  parameter {
    name  = "log_min_duration_statement"
    value = "1000" # Log queries taking > 1 second
  }

  tags = {
    Name = "propnica-pg-${var.environment}"
  }
}

# ===========================================
# Store Credentials in SSM Parameter Store
# ===========================================

resource "aws_ssm_parameter" "db_host" {
  name        = "/propnica/${var.environment}/database/host"
  description = "RDS PostgreSQL host"
  type        = "String"
  value       = aws_db_instance.main.address
}

resource "aws_ssm_parameter" "db_port" {
  name        = "/propnica/${var.environment}/database/port"
  description = "RDS PostgreSQL port"
  type        = "String"
  value       = tostring(aws_db_instance.main.port)
}

resource "aws_ssm_parameter" "db_name" {
  name        = "/propnica/${var.environment}/database/name"
  description = "RDS PostgreSQL database name"
  type        = "String"
  value       = var.db_name
}

resource "aws_ssm_parameter" "db_username" {
  name        = "/propnica/${var.environment}/database/username"
  description = "RDS PostgreSQL username"
  type        = "String"
  value       = var.db_username
}

resource "aws_ssm_parameter" "db_password" {
  name        = "/propnica/${var.environment}/database/password"
  description = "RDS PostgreSQL password"
  type        = "SecureString"
  value       = random_password.db_password.result
}

resource "aws_ssm_parameter" "database_url" {
  name        = "/propnica/${var.environment}/database/url"
  description = "Full DATABASE_URL connection string"
  type        = "SecureString"
  value       = "postgresql://${var.db_username}:${random_password.db_password.result}@${aws_db_instance.main.address}:${aws_db_instance.main.port}/${var.db_name}?sslmode=require"
}

# ===========================================
# Outputs
# ===========================================

output "db_endpoint" {
  description = "RDS instance endpoint"
  value       = aws_db_instance.main.endpoint
}

output "db_address" {
  description = "RDS instance address (hostname)"
  value       = aws_db_instance.main.address
}

output "db_port" {
  description = "RDS instance port"
  value       = aws_db_instance.main.port
}

output "db_name" {
  description = "Database name"
  value       = aws_db_instance.main.db_name
}

output "database_url_ssm_parameter" {
  description = "SSM parameter path for DATABASE_URL"
  value       = aws_ssm_parameter.database_url.name
}

output "lambda_security_group_id" {
  description = "Security group ID for Lambda functions"
  value       = aws_security_group.lambda.id
}

output "rds_security_group_id" {
  description = "Security group ID for RDS"
  value       = aws_security_group.rds.id
}
