from datetime import datetime
import re

from pydantic import BaseModel, Field, field_validator

EMAIL_REGEX = re.compile(r"^[^\s@]+@[^\s@]+\.[^\s@]+$")


def _validate_optional_email(value: str) -> str:
    normalized = (value or "").strip().lower()
    if not normalized:
        return ""
    if not EMAIL_REGEX.match(normalized):
        raise ValueError("Email do colaborador inválido")
    return normalized


class CollaboratorCreate(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    email: str = ""
    squad: str = ""
    tech_lead_id: str | None = None
    role: str = ""
    focus: str = ""

    _email_validator = field_validator("email")(_validate_optional_email)


class CollaboratorUpdate(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    email: str = ""
    squad: str = ""
    tech_lead_id: str | None = None
    role: str = ""
    focus: str = ""

    _email_validator = field_validator("email")(_validate_optional_email)


class CollaboratorRiskAction(BaseModel):
    action: str = Field(pattern="^(escalate|reduce)$")


class CollaboratorOut(BaseModel):
    id: str
    tenant_id: str
    name: str
    email: str
    squad: str
    tech_lead_id: str | None
    role: str
    focus: str
    risk: str
    pdi_status: str
    next_one_on_one: str | None = None
    progress: int = 0
    updated_at: datetime

    class Config:
        from_attributes = True


class CollaboratorImportSummary(BaseModel):
    imported: int
    updated: int
    skipped: int
    enriched_from_txt: int
    errors: list[str] = []
