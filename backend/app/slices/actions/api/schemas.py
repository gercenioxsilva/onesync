from pydantic import BaseModel, ConfigDict


class ActionCreate(BaseModel):
    title: str
    owner: str = ""
    due_date: str = ""
    category: str = ""
    status: str = "NAO_INICIADO"
    collaborator_id: str | None = None


class ActionUpdate(BaseModel):
    title: str | None = None
    owner: str | None = None
    due_date: str | None = None
    category: str | None = None
    collaborator_id: str | None = None


class ActionStatusUpdate(BaseModel):
    status: str


class ActionOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    tenant_id: str
    collaborator_id: str | None = None
    title: str
    owner: str
    due_date: str
    category: str
    status: str
