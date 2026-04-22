from pydantic import BaseModel, Field


class LoginRequest(BaseModel):
    email: str | None = None
    username: str | None = None
    password: str = Field(min_length=1)


class GoogleLoginRequest(BaseModel):
    id_token: str = Field(min_length=1)
    tenant_cnpj: str | None = Field(default=None, min_length=14, max_length=18)


class RegisterTenantRequest(BaseModel):
    company_name: str = Field(min_length=2, max_length=160)
    cnpj: str = Field(min_length=14, max_length=18)
    email: str = Field(min_length=5, max_length=255)
    address: str = Field(min_length=5, max_length=255)
    phone: str = Field(min_length=8, max_length=32)
    collaborator_quota: int = Field(default=25, ge=1)
    plan_type: str = Field(default="FREE", pattern="^(FREE|CUSTOM)$")
    owner_name: str = Field(min_length=2, max_length=120)
    owner_email: str = Field(min_length=5, max_length=255)
    owner_password: str = Field(min_length=8, max_length=120)


class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user_id: str
    tenant_id: str
    role: str
    email: str


class TenantRegistrationResponse(BaseModel):
    tenant_id: str
    owner_user_id: str
    plan_type: str
