from dataclasses import dataclass
from enum import StrEnum


class MetaStatus(StrEnum):
    NOT_STARTED = "NAO_INICIADO"
    IN_PROGRESS = "EM_ANDAMENTO"
    COMPLETED = "CONCLUIDO"


@dataclass
class PDI:
    collaborator_id: str
    cycle: str
    objective: str
    progress: int

    def can_close(self) -> bool:
        return self.progress >= 80
