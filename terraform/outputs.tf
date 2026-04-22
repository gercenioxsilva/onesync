output "frontend_url" {
  description = "URL do frontend via CloudFront"
  value       = "https://${var.domain_name}"
}

output "api_url" {
  description = "URL da API via ALB"
  value       = "https://api.${var.domain_name}"
}

output "cloudfront_domain" {
  description = "Domínio CloudFront (use para configurar DNS externo se necessário)"
  value       = aws_cloudfront_distribution.frontend.domain_name
}

output "alb_dns" {
  description = "DNS do ALB"
  value       = aws_lb.main.dns_name
}

output "ecr_backend_url" {
  description = "URL do repositório ECR para push das imagens do backend"
  value       = aws_ecr_repository.backend.repository_url
}

output "s3_frontend_bucket" {
  description = "Nome do bucket S3 para deploy do frontend"
  value       = aws_s3_bucket.frontend.bucket
}

output "ec2_public_ip" {
  description = "IP público da instância EC2 (apenas para debug)"
  value       = aws_instance.backend.public_ip
  sensitive   = false
}

output "rds_endpoint" {
  description = "Endpoint do RDS (interno à VPC)"
  value       = aws_db_instance.main.endpoint
  sensitive   = true
}

output "route53_nameservers" {
  description = "Nameservers do Route 53 — configure no seu registrador de domínio"
  value       = aws_route53_zone.main.name_servers
}

output "secrets_manager_arn" {
  description = "ARN do secret no Secrets Manager"
  value       = aws_secretsmanager_secret.app.arn
}

output "cloudfront_distribution_id" {
  description = "ID da distribuição CloudFront"
  value       = aws_cloudfront_distribution.frontend.id
}

# ── Arquivo de configuração para CI/CD ────────────────────────────────────────

resource "local_file" "cd_config" {
  filename = "${path.module}/../.cd-config.json"
  content = jsonencode({
    aws_region                   = var.aws_region
    ecr_registry                 = aws_ecr_repository.backend.repository_url
    frontend_bucket              = aws_s3_bucket.frontend.bucket
    cloudfront_distribution_id   = aws_cloudfront_distribution.frontend.id
    frontend_api_url             = "https://api.${var.domain_name}/api"
    domain_name                  = var.domain_name
    ec2_ssh_host                 = aws_instance.backend.public_ip
    ec2_ssh_user                 = "ec2-user"
    secrets_manager_secret_id    = aws_secretsmanager_secret.app.arn
    secrets_manager_secret_name  = aws_secretsmanager_secret.app.name
  })
}

output "cd_config_file" {
  description = "Arquivo de configuração gerado para CI/CD"
  value       = local_file.cd_config.filename
}

# ── SSM Parameters — lidos pelo CD pipeline (zero secrets extras no GitHub) ───

resource "aws_ssm_parameter" "ecr_registry" {
  name  = "/${var.project}/${var.environment}/ecr_registry"
  type  = "String"
  value = aws_ecr_repository.backend.repository_url
}

resource "aws_ssm_parameter" "frontend_bucket" {
  name  = "/${var.project}/${var.environment}/frontend_bucket"
  type  = "String"
  value = aws_s3_bucket.frontend.bucket
}

resource "aws_ssm_parameter" "cloudfront_distribution_id" {
  name  = "/${var.project}/${var.environment}/cloudfront_distribution_id"
  type  = "String"
  value = aws_cloudfront_distribution.frontend.id
}

resource "aws_ssm_parameter" "domain_name" {
  name  = "/${var.project}/${var.environment}/domain_name"
  type  = "String"
  value = var.domain_name
}

resource "aws_ssm_parameter" "ec2_instance_id" {
  name  = "/${var.project}/${var.environment}/ec2_instance_id"
  type  = "String"
  value = aws_instance.backend.id
}

resource "aws_ssm_parameter" "secrets_manager_arn" {
  name  = "/${var.project}/${var.environment}/secrets_manager_arn"
  type  = "String"
  value = aws_secretsmanager_secret.app.arn
}
