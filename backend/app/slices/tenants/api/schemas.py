from datetime import datetime

from pydantic import BaseModel


class TenantOut(BaseModel):
    id: str
    name: str
    cnpj: str
    email: str
    address: str
    phone: str
    collaborator_quota: int
    plan_type: str
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True


class UpdateTenantRequest(BaseModel):
    name: str | None = None
    email: str | None = None
    address: str | None = None
    phone: str | None = None
    collaborator_quota: int | None = None
