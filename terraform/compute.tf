locals {
  user_data = <<-EOF
    #!/bin/bash
    set -euo pipefail
    exec > >(tee /var/log/onesync-init.log | logger -t onesync-init) 2>&1

    echo "=== Instalando dependências ==="
    dnf update -y
    dnf install -y docker aws-cli jq
    systemctl enable --now docker
    usermod -aG docker ec2-user

    echo "=== Autenticando no ECR ==="
    aws ecr get-login-password --region ${var.aws_region} \
      | docker login --username AWS --password-stdin ${aws_ecr_repository.backend.repository_url}

    echo "=== Carregando segredos do Secrets Manager ==="
    SECRETS=$(aws secretsmanager get-secret-value \
      --secret-id ${aws_secretsmanager_secret.app.arn} \
      --region ${var.aws_region} \
      --query SecretString --output text)

    DATABASE_URL=$(echo $SECRETS | jq -r '.DATABASE_URL')
    AUTH_SECRET_KEY=$(echo $SECRETS | jq -r '.AUTH_SECRET_KEY')
    BOOTSTRAP_EMAIL=$(echo $SECRETS | jq -r '.BOOTSTRAP_OWNER_EMAIL')
    BOOTSTRAP_PASSWORD=$(echo $SECRETS | jq -r '.BOOTSTRAP_OWNER_PASSWORD')
    GOOGLE_CLIENT_ID=$(echo $SECRETS | jq -r '.GOOGLE_CLIENT_ID')

    echo "=== Iniciando container do backend ==="
    docker pull ${aws_ecr_repository.backend.repository_url}:latest

    docker run -d \
      --name onesync-backend \
      --restart unless-stopped \
      -p 8000:8000 \
      --log-driver awslogs \
      --log-opt awslogs-region=${var.aws_region} \
      --log-opt awslogs-group=${aws_cloudwatch_log_group.backend.name} \
      --log-opt awslogs-stream=ec2-backend \
      -e DATABASE_URL="$DATABASE_URL" \
      -e ENVIRONMENT=production \
      -e CORS_ORIGINS='["https://${var.domain_name}","https://www.${var.domain_name}"]' \
      -e AUTH_SECRET_KEY="$AUTH_SECRET_KEY" \
      -e AUTH_BOOTSTRAP_ENABLED=true \
      -e AUTH_BOOTSTRAP_OWNER_EMAIL="$BOOTSTRAP_EMAIL" \
      -e AUTH_BOOTSTRAP_OWNER_PASSWORD="$BOOTSTRAP_PASSWORD" \
      -e AUTH_BOOTSTRAP_PLAN=FREE \
      -e AUTH_BOOTSTRAP_IMPORT_COLLABORATORS=false \
      -e ENABLE_SCHEMA_AUTOCREATE=false \
      -e GOOGLE_CLIENT_ID="$GOOGLE_CLIENT_ID" \
      ${aws_ecr_repository.backend.repository_url}:latest

    echo "=== Setup concluído ==="
  EOF
}

resource "aws_instance" "backend" {
  ami                    = data.aws_ami.amazon_linux_2023.id
  instance_type          = var.ec2_instance_type
  subnet_id              = aws_subnet.public[0].id
  vpc_security_group_ids = [aws_security_group.ec2.id]
  iam_instance_profile   = aws_iam_instance_profile.ec2.name
  key_name               = var.ec2_key_pair_name != "" ? var.ec2_key_pair_name : null

  user_data                   = base64encode(local.user_data)
  user_data_replace_on_change = true

  root_block_device {
    volume_type           = "gp3"
    volume_size           = 30
    delete_on_termination = true
    encrypted             = true
  }

  metadata_options {
    http_tokens = "required" # IMDSv2 obrigatório
  }

  tags = { Name = "${local.prefix}-backend" }

  depends_on = [
    aws_ecr_repository.backend,
    aws_secretsmanager_secret_version.app,
    aws_cloudwatch_log_group.backend,
  ]
}
