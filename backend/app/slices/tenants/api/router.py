from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.auth import AuthContext, get_current_user, require_roles
from app.core.database import get_db
from app.slices.tenants.api.schemas import TenantOut, UpdateTenantRequest
from app.slices.tenants.infrastructure.models import TenantModel

router = APIRouter(prefix="/api/tenants", tags=["tenants"])


@router.get("/me", response_model=TenantOut)
def get_tenant(
    current_user: AuthContext = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    tenant = db.scalar(
        select(TenantModel).where(TenantModel.id == current_user.tenant_id)
    )
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant não encontrado")
    return tenant


@router.patch("/me", response_model=TenantOut)
def update_tenant(
    payload: UpdateTenantRequest,
    current_user: AuthContext = Depends(require_roles("OWNER", "ADMIN")),
    db: Session = Depends(get_db),
):
    tenant = db.scalar(
        select(TenantModel).where(TenantModel.id == current_user.tenant_id)
    )
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant não encontrado")

    if payload.name is not None:
        tenant.name = payload.name.strip()
    if payload.email is not None:
        tenant.email = payload.email.strip().lower()
    if payload.address is not None:
        tenant.address = payload.address.strip()
    if payload.phone is not None:
        tenant.phone = payload.phone.strip()
    if payload.collaborator_quota is not None:
        tenant.collaborator_quota = payload.collaborator_quota

    db.commit()
    db.refresh(tenant)
    return tenant
