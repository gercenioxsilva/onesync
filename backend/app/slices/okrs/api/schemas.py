from pydantic import BaseModel, ConfigDict, field_validator


class KeyResultCreate(BaseModel):
    title: str
    metric_type: str = "PERCENT"
    unit: str = ""
    initial_value: float = 0.0
    target_value: float = 100.0
    current_value: float = 0.0

    @field_validator("metric_type")
    @classmethod
    def validate_metric_type(cls, v: str) -> str:
        allowed = {"PERCENT", "NUMBER", "CURRENCY"}
        if v not in allowed:
            raise ValueError(f"metric_type deve ser um de: {allowed}")
        return v

    @field_validator("target_value")
    @classmethod
    def target_must_differ_from_initial(cls, v: float, info) -> float:
        initial = info.data.get("initial_value", 0.0)
        if v == initial:
            raise ValueError("target_value deve ser diferente de initial_value")
        return v


class KeyResultUpdate(BaseModel):
    title: str | None = None
    metric_type: str | None = None
    unit: str | None = None
    initial_value: float | None = None
    target_value: float | None = None
    current_value: float | None = None


class KeyResultProgressUpdate(BaseModel):
    current_value: float


class KeyResultOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    objective_id: str
    title: str
    metric_type: str
    unit: str
    initial_value: float
    target_value: float
    current_value: float
    progress_pct: float = 0.0
    status: str = "ATRASADO"


class ObjectiveCreate(BaseModel):
    title: str
    description: str = ""
    cycle: str = "2026_H1"
    collaborator_id: str | None = None


class ObjectiveUpdate(BaseModel):
    title: str | None = None
    description: str | None = None
    cycle: str | None = None
    collaborator_id: str | None = None


class ObjectiveOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    tenant_id: str
    collaborator_id: str | None = None
    title: str
    description: str
    cycle: str
    progress_pct: float = 0.0
    status: str = "SEM_KRS"
    key_results: list[KeyResultOut] = []
