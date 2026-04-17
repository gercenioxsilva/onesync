import os
from pathlib import Path

from sqlalchemy import select

from app.core.config import settings
from app.core.database import Base, SessionLocal, engine
from app.slices.collaborators.application.services import CollaboratorService
from app.slices.tenants.infrastructure.models import TenantModel


def load_tracker_path() -> Path:
    env_path = os.getenv("TRACKER_CSV_PATH", "")
    if env_path:
        return Path(env_path)
    return Path("/data/01_TRACKER_TIME.csv")


def main() -> None:
    tracker_path = load_tracker_path()
    Base.metadata.create_all(bind=engine)

    if not tracker_path.exists():
        raise FileNotFoundError(f"Arquivo CSV não encontrado: {tracker_path}")

    db = SessionLocal()
    try:
        tenant = db.scalar(
            select(TenantModel).where(TenantModel.cnpj == settings.auth_bootstrap_tenant_cnpj)
        )
        if not tenant:
            raise RuntimeError("Tenant bootstrap não encontrado para seed")

        summary = CollaboratorService(db).import_from_csv(
            tenant.id,
            tracker_path.read_bytes(),
            update_existing=True,
            enrich_from_txt=True,
        )
        print(
            "Seed concluído. "
            f"Novos: {summary['imported']} | "
            f"Atualizados: {summary['updated']} | "
            f"Ignorados: {summary['skipped']} | "
            f"Enriquecidos por txt: {summary['enriched_from_txt']}"
        )
    finally:
        db.close()


if __name__ == "__main__":
    main()
