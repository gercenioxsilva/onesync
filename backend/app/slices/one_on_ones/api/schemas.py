from datetime import date

from pydantic import BaseModel, Field


class OneOnOneCreate(BaseModel):
    collaborator_id: str = Field(min_length=1)
    meeting_date: date
    mood_score: int = Field(ge=0, le=10, default=5)
    summary: str = ""
    next_steps: str = ""
    next_meeting_date: date | None = None


class OneOnOneUpdate(OneOnOneCreate):
    pass


class OneOnOneOut(BaseModel):
    id: str
    collaborator_id: str
    meeting_date: date
    mood_score: int | None
    summary: str
    next_steps: str
    next_meeting_date: date | None
    risk_signal: str

    class Config:
        from_attributes = True
