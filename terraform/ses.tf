# ── SES — Identidade de domínio e DKIM ───────────────────────────────────────

resource "aws_ses_domain_identity" "main" {
  domain = var.domain_name
}

resource "aws_ses_domain_dkim" "main" {
  domain = aws_ses_domain_identity.main.domain
}

# ── DNS Records no Route 53 ───────────────────────────────────────────────────

# TXT: prova de propriedade do domínio para o SES
resource "aws_route53_record" "ses_verification" {
  zone_id = aws_route53_zone.main.zone_id
  name    = "_amazonses.${var.domain_name}"
  type    = "TXT"
  ttl     = 600
  records = [aws_ses_domain_identity.main.verification_token]
}

# CNAME x3: chaves DKIM para assinar os e-mails
resource "aws_route53_record" "ses_dkim" {
  count   = 3
  zone_id = aws_route53_zone.main.zone_id
  name    = "${aws_ses_domain_dkim.main.dkim_tokens[count.index]}._domainkey.${var.domain_name}"
  type    = "CNAME"
  ttl     = 600
  records = ["${aws_ses_domain_dkim.main.dkim_tokens[count.index]}.dkim.amazonses.com"]
}

# ── MAIL FROM: melhora entregabilidade e habilita DMARC ──────────────────────

resource "aws_ses_domain_mail_from" "main" {
  domain           = aws_ses_domain_identity.main.domain
  mail_from_domain = "mail.${var.domain_name}"
}

# MX: encaminha bounces/reclamações para o SES
resource "aws_route53_record" "ses_mail_from_mx" {
  zone_id = aws_route53_zone.main.zone_id
  name    = "mail.${var.domain_name}"
  type    = "MX"
  ttl     = 600
  records = ["10 feedback-smtp.${var.aws_region}.amazonses.com"]
}

# SPF: autoriza o SES a enviar em nome do subdomínio mail-from
resource "aws_route53_record" "ses_mail_from_spf" {
  zone_id = aws_route53_zone.main.zone_id
  name    = "mail.${var.domain_name}"
  type    = "TXT"
  ttl     = 600
  records = ["v=spf1 include:amazonses.com ~all"]
}

# ── Aguarda confirmação do SES (bloqueia até o domínio estar verificado) ──────

resource "aws_ses_domain_identity_verification" "main" {
  domain = aws_ses_domain_identity.main.id

  depends_on = [aws_route53_record.ses_verification]

  timeouts {
    create = "10m"
  }
}

# ── Outputs ───────────────────────────────────────────────────────────────────

output "ses_domain_arn" {
  description = "ARN da identidade SES do domínio"
  value       = aws_ses_domain_identity.main.arn
}

output "ses_sender" {
  description = "Endereço remetente configurado para notificações"
  value       = var.ses_from_email
}
