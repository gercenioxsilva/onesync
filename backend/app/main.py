import os
from pathlib import Path

from fastapi import Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import func, select

from app.core.auth import get_current_user, hash_password
from app.core.config import settings
from app.core.database import Base, SessionLocal, engine
from app.core.tasks import start_scheduler, stop_scheduler
from app.slices.actions.api.router import router as actions_router
from app.slices.actions.infrastructure import models as _action_models  # noqa: F401
from app.slices.ai.api.router import router as ai_router
from app.slices.ai.infrastructure import models as _ai_models  # noqa: F401
from app.slices.auth.api.router import router as auth_router
from app.slices.collaborators.api.router import router as collaborators_router
from app.slices.collaborators.application.services import CollaboratorService
from app.slices.collaborators.infrastructure import models as _collaborator_models  # noqa: F401
from app.slices.collaborators.infrastructure.models import CollaboratorModel
from app.slices.okrs.api.router import router as okrs_router
from app.slices.okrs.infrastructure import models as _okr_models  # noqa: F401
from app.slices.one_on_ones.api.router import router as one_on_ones_router
from app.slices.one_on_ones.infrastructure import models as _one_on_one_models  # noqa: F401
from app.slices.pdis.api.router import router as pdis_router
from app.slices.pdis.infrastructure import models as _pdi_models  # noqa: F401
from app.slices.reporting.api.router import router as reporting_router
from app.slices.tenants.api.router import router as tenants_router
from app.slices.tenants.infrastructure import models as _tenant_models  # noqa: F401
from app.slices.tenants.infrastructure.models import TenantModel
from app.slices.users.api.router import router as users_router
from app.slices.users.infrastructure import models as _user_models  # noqa: F401
from app.slices.users.infrastructure.models import UserModel


def _bootstrap_collaborators_if_needed(db, tenant_id: str) -> None:
    if not settings.auth_bootstrap_import_collaborators:
        return

    collaborators_count = db.scalar(
        select(func.count())
        .select_from(CollaboratorModel)
        .where(CollaboratorModel.tenant_id == tenant_id)
    )
    if collaborators_count and collaborators_count > 0:
        return

    tracker_path = Path(settings.tracker_csv_path)
    if not tracker_path.is_file():
        return

    if settings.people_source_dir:
        os.environ.setdefault("PEOPLE_SOURCE_DIR", settings.people_source_dir)

    CollaboratorService(db).import_from_csv(
        tenant_id,
        tracker_path.read_bytes(),
        update_existing=True,
        enrich_from_txt=True,
    )


app = FastAPI(title=settings.app_name)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def on_startup() -> None:
    if settings.enable_schema_autocreate:
        Base.metadata.create_all(bind=engine)

    if not settings.auth_bootstrap_enabled:
        return

    db = SessionLocal()
    try:
        tenant = db.scalar(
            select(TenantModel).where(TenantModel.cnpj == settings.auth_bootstrap_tenant_cnpj)
        )
        if not tenant:
            tenant = TenantModel(
                name=settings.auth_bootstrap_tenant_name,
                cnpj=settings.auth_bootstrap_tenant_cnpj,
                email=settings.auth_bootstrap_tenant_email,
                address=settings.auth_bootstrap_tenant_address,
                phone=settings.auth_bootstrap_tenant_phone,
                collaborator_quota=settings.auth_bootstrap_collaborator_quota,
                plan_type=settings.auth_bootstrap_plan,
            )
            db.add(tenant)
            db.flush()

        owner = db.scalar(
            select(UserModel).where(
                (UserModel.tenant_id == tenant.id)
                & (UserModel.email == settings.auth_bootstrap_owner_email.lower())
            )
        )
        if not owner:
            owner = UserModel(
                tenant_id=tenant.id,
                full_name=settings.auth_bootstrap_owner_name,
                email=settings.auth_bootstrap_owner_email.lower(),
                password_hash=hash_password(settings.auth_bootstrap_owner_password),
                role="OWNER",
            )
            db.add(owner)

        db.commit()

        _bootstrap_collaborators_if_needed(db, tenant.id)
    finally:
        db.close()

    # Start background task scheduler
    start_scheduler()


@app.on_event("shutdown")
def on_shutdown() -> None:
    """Shutdown background tasks"""
    stop_scheduler()


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


app.include_router(auth_router)
app.include_router(ai_router, dependencies=[Depends(get_current_user)])
app.include_router(collaborators_router, dependencies=[Depends(get_current_user)])
app.include_router(one_on_ones_router, dependencies=[Depends(get_current_user)])
app.include_router(pdis_router, dependencies=[Depends(get_current_user)])
app.include_router(reporting_router, dependencies=[Depends(get_current_user)])
app.include_router(users_router, dependencies=[Depends(get_current_user)])
app.include_router(tenants_router, dependencies=[Depends(get_current_user)])
app.include_router(actions_router, dependencies=[Depends(get_current_user)])
app.include_router(okrs_router, dependencies=[Depends(get_current_user)])
