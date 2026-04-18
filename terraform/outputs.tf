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
