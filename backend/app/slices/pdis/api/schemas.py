from pydantic import BaseModel, Field


class PdiCreate(BaseModel):
    collaborator_id: str = Field(min_length=1)
    cycle: str = "2026_H1"
    objective: str
    progress: int = Field(ge=0, le=100, default=0)


class PdiOut(BaseModel):
    id: str
    collaborator_id: str
    cycle: str
    objective: str
    progress: int
    status: str

    class Config:
        from_attributes = True
