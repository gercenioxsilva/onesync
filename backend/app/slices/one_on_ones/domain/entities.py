from dataclasses import dataclass
from datetime import date


@dataclass
class OneOnOneSession:
    collaborator_id: str
    meeting_date: date
    mood_score: int | None
    summary: str
    next_steps: str

    def risk_signal(self) -> str:
        if self.mood_score is None:
            return "NEUTRO"
        if self.mood_score <= 4:
            return "ATENCAO"
        if self.mood_score <= 7:
            return "ESTAVEL"
        return "POSITIVO"
