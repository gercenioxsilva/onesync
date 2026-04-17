#!/usr/bin/env python3
"""
Seed script: importa colaboradores do CSV para o banco da app,
atualiza existentes e enriquece cargo/foco com base nos .txt.
"""
import os
import sys
from pathlib import Path
from sqlalchemy import select

backend_path = Path(__file__).parent / "backend"
sys.path.insert(0, str(backend_path))

from app.core.config import settings
from app.core.database import SessionLocal, engine, Base
from app.slices.collaborators.application.services import CollaboratorService
from app.slices.tenants.infrastructure.models import TenantModel

Base.metadata.create_all(bind=engine)

tracker_path = Path(__file__).parent.parent / "01_TRACKER_TIME.csv"
os.environ.setdefault("PEOPLE_SOURCE_DIR", str(Path(__file__).parent.parent))

if not tracker_path.exists():
    print(f"❌ Arquivo não encontrado: {tracker_path}")
    sys.exit(1)

print("\n📥 Importando colaboradores de 01_TRACKER_TIME.csv com atualização e enriquecimento por .txt...\n")

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
        f"\n✨ Novos: {summary['imported']} | "
        f"Atualizados: {summary['updated']} | "
        f"Ignorados: {summary['skipped']} | "
        f"Enriquecidos por .txt: {summary['enriched_from_txt']}"
    )
    if summary["errors"]:
        print("\n⚠️ Primeiros avisos:")
        for item in summary["errors"][:10]:
            print(f" - {item}")
    print("\n💡 Dica: Agora execute 'python launcher.py' para iniciar a app")
except Exception as e:
    print(f"\n❌ Erro: {e}")
    sys.exit(1)
finally:
    db.close()
