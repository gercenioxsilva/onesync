from typing import Optional
from pydantic import BaseModel, ConfigDict


class ActionCreate(BaseModel):
    title: str
    owner: str = ""
    due_date: str = ""
    category: str = ""
    status: str = "NAO_INICIADO"
    collaborator_id: Optional[str] = None


class ActionUpdate(BaseModel):
    title: Optional[str] = None
    owner: Optional[str] = None
    due_date: Optional[str] = None
    category: Optional[str] = None
    collaborator_id: Optional[str] = None


class ActionStatusUpdate(BaseModel):
    status: str


class ActionOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    tenant_id: str
    collaborator_id: Optional[str] = None
    title: str
    owner: str
    due_date: str
    category: str
    status: str
