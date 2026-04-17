from sqlalchemy import select

from app.core.database import SessionLocal
from app.slices.collaborators.infrastructure.models import CollaboratorModel
from app.slices.pdis.infrastructure.models import PdiModel
from app.slices.tenants.infrastructure.models import TenantModel  # noqa: F401


def run() -> tuple[int, int]:
    db = SessionLocal()
    try:
        updated = 0
        collabs = list(db.scalars(select(CollaboratorModel)).all())

        for collab in collabs:
            latest_status = db.execute(
                select(PdiModel.status)
                .where(
                    (PdiModel.tenant_id == collab.tenant_id)
                    & (PdiModel.collaborator_id == collab.id)
                )
                .order_by(PdiModel.updated_at.desc(), PdiModel.created_at.desc())
                .limit(1)
            ).scalar_one_or_none()

            resolved = "NO_PLANO" if latest_status in (None, "NAO_INICIADO") else latest_status
            if collab.pdi_status != resolved:
                collab.pdi_status = resolved
                updated += 1

        db.commit()
        return len(collabs), updated
    finally:
        db.close()


if __name__ == "__main__":
    total, updated = run()
    print(f"BACKFILL_OK total={total} updated={updated}")
