resource "aws_secretsmanager_secret" "app" {
  name                    = "${local.prefix}/app-secrets"
  description             = "Segredos da aplicação OneSync MVP"
  recovery_window_in_days = 7

  tags = { Name = "${local.prefix}-app-secrets" }
}

resource "aws_secretsmanager_secret_version" "app" {
  secret_id = aws_secretsmanager_secret.app.id

  secret_string = jsonencode({
    DATABASE_URL             = "postgresql://${var.db_username}:${var.db_password}@${aws_db_instance.main.endpoint}/${var.db_name}"
    AUTH_SECRET_KEY          = var.jwt_secret
    BOOTSTRAP_OWNER_EMAIL    = var.bootstrap_owner_email
    BOOTSTRAP_OWNER_PASSWORD = var.bootstrap_owner_password
    GOOGLE_CLIENT_ID         = var.google_client_id
    GOOGLE_CLIENT_SECRET     = var.google_client_secret
    SES_FROM_EMAIL           = var.ses_from_email
  })

  depends_on = [aws_db_instance.main]
}
