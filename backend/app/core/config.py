from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "People 1:1 & PDI"
    environment: str = "local"
    # PostgreSQL default: postgresql://user:password@localhost:5432/people_db
    # SQLite fallback: sqlite:///./people.db
    database_url: str = "postgresql://postgres:postgres@localhost:5432/people_db"
    cors_origins: list[str] = ["http://localhost:5173"]
    auth_secret_key: str = "change-this-secret-key"
    auth_algorithm: str = "HS256"
    auth_access_token_expire_minutes: int = 480
    auth_bootstrap_enabled: bool = True
    auth_bootstrap_tenant_name: str = "Empresa Demo"
    auth_bootstrap_tenant_cnpj: str = "00000000000191"
    auth_bootstrap_tenant_email: str = "contato@empresa-demo.com"
    auth_bootstrap_tenant_address: str = "Endereço não informado"
    auth_bootstrap_tenant_phone: str = "+55 11 99999-9999"
    auth_bootstrap_collaborator_quota: int = 25
    auth_bootstrap_plan: str = "FREE"
    auth_bootstrap_owner_name: str = "Administrador"
    auth_bootstrap_owner_email: str = "admin@people.local"
    auth_bootstrap_owner_password: str = "admin123"
    auth_bootstrap_import_collaborators: bool = True
    tracker_csv_path: str = "/data/01_TRACKER_TIME.csv"
    people_source_dir: str = ""
    google_client_id: str = ""
    google_client_secret: str = ""
    enable_schema_autocreate: bool = False
    notifications_enabled: bool = True
    ses_from_email: str = ""
    ses_region: str = "us-east-1"

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")


settings = Settings()
