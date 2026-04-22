variable "aws_region" {
  description = "Região AWS onde os recursos serão criados"
  type        = string
  default     = "us-east-1"
}

variable "project" {
  description = "Nome do projeto (usado como prefixo nos recursos)"
  type        = string
  default     = "onesync"
}

variable "environment" {
  description = "Nome do ambiente"
  type        = string
  default     = "mvp"
}

variable "domain_name" {
  description = "Domínio principal da aplicação (ex: seudominio.com.br)"
  type        = string
}

# ── Compute ───────────────────────────────────────────────────────────────────

variable "ec2_instance_type" {
  description = "Tipo de instância EC2 para o backend"
  type        = string
  default     = "t3.small"
}

variable "ec2_key_pair_name" {
  description = "Nome do Key Pair para acesso SSH (deve existir na AWS). Deixe vazio para desabilitar SSH."
  type        = string
  default     = ""
}

# ── Database ──────────────────────────────────────────────────────────────────

variable "db_instance_class" {
  description = "Classe da instância RDS"
  type        = string
  default     = "db.t3.micro"
}

variable "db_name" {
  description = "Nome do banco de dados PostgreSQL"
  type        = string
  default     = "onesync_db"
}

variable "db_username" {
  description = "Usuário master do RDS"
  type        = string
  default     = "onesync_admin"
}

variable "db_password" {
  description = "Senha master do RDS (mínimo 16 caracteres)"
  type        = string
  sensitive   = true
}

variable "db_allocated_storage" {
  description = "Armazenamento alocado em GB"
  type        = number
  default     = 20
}

# ── App secrets ───────────────────────────────────────────────────────────────

variable "jwt_secret" {
  description = "Chave secreta JWT (gere com: openssl rand -hex 32)"
  type        = string
  sensitive   = true
}

variable "bootstrap_owner_email" {
  description = "Email do usuário admin inicial"
  type        = string
  default     = "admin@onesync.app"
}

variable "bootstrap_owner_password" {
  description = "Senha do usuário admin inicial"
  type        = string
  sensitive   = true
  default     = "Mude@MeSenha123"
}

variable "google_client_id" {
  description = "Google OAuth Client ID (opcional)"
  type        = string
  default     = ""
  sensitive   = true
}

variable "ses_from_email" {
  description = "Email verificado no SES usado como remetente das notificacoes"
  type        = string
  default     = ""
}

# ── Networking ────────────────────────────────────────────────────────────────

variable "vpc_cidr" {
  description = "CIDR block da VPC"
  type        = string
  default     = "10.0.0.0/16"
}
