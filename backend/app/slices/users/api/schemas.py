from datetime import datetime

from pydantic import BaseModel, Field

ROLES = ["OWNER", "ADMIN", "TECH_LEAD", "MEMBER"]


class UserOut(BaseModel):
    id: str
    tenant_id: str
    full_name: str
    email: str
    role: str
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True


class InviteUserRequest(BaseModel):
    full_name: str = Field(min_length=2, max_length=120)
    email: str = Field(min_length=5, max_length=255)
    role: str = Field(default="MEMBER", pattern="^(ADMIN|TECH_LEAD|MEMBER)$")
    password: str = Field(min_length=8, max_length=120)


class UpdateUserRoleRequest(BaseModel):
    role: str = Field(pattern="^(ADMIN|TECH_LEAD|MEMBER)$")
