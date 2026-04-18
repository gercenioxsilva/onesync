from dataclasses import dataclass
from datetime import UTC, datetime
from enum import StrEnum


class RiskLevel(StrEnum):
    LOW = "BAIXO"
    MEDIUM = "MEDIO"
    HIGH = "ALTO"


class PdiStatus(StrEnum):
    NO_PLAN = "NO_PLANO"
    IN_PROGRESS = "EM_ANDAMENTO"
    ATTENTION = "ATENCAO"
    DONE = "CONCLUIDO"


@dataclass
class Collaborator:
    id: str
    name: str
    role: str
    focus: str
    risk: RiskLevel
    pdi_status: PdiStatus
    updated_at: datetime

    def escalate_risk(self) -> None:
        if self.risk == RiskLevel.LOW:
            self.risk = RiskLevel.MEDIUM
        elif self.risk == RiskLevel.MEDIUM:
            self.risk = RiskLevel.HIGH
        self.updated_at = datetime.now(UTC)

    def reduce_risk(self) -> None:
        if self.risk == RiskLevel.HIGH:
            self.risk = RiskLevel.MEDIUM
        elif self.risk == RiskLevel.MEDIUM:
            self.risk = RiskLevel.LOW
        self.updated_at = datetime.now(UTC)

    def start_pdi(self) -> None:
        if self.pdi_status == PdiStatus.NO_PLAN:
            self.pdi_status = PdiStatus.IN_PROGRESS
        self.updated_at = datetime.now(UTC)
