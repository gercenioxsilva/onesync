from dataclasses import dataclass, field


@dataclass
class KeyResult:
    id: str
    title: str
    metric_type: str
    unit: str
    initial_value: float
    target_value: float
    current_value: float

    def progress_pct(self) -> float:
        span = self.target_value - self.initial_value
        if span == 0:
            return 100.0 if self.current_value >= self.target_value else 0.0
        raw = (self.current_value - self.initial_value) / span * 100
        return max(0.0, min(100.0, raw))

    def status(self) -> str:
        pct = self.progress_pct()
        if pct >= 100:
            return "CONCLUIDO"
        if pct >= 70:
            return "NO_PRAZO"
        if pct >= 30:
            return "EM_RISCO"
        return "ATRASADO"


@dataclass
class Objective:
    id: str
    title: str
    description: str
    cycle: str
    collaborator_id: str | None
    key_results: list[KeyResult] = field(default_factory=list)

    def progress_pct(self) -> float:
        if not self.key_results:
            return 0.0
        return sum(kr.progress_pct() for kr in self.key_results) / len(self.key_results)

    def status(self) -> str:
        if not self.key_results:
            return "SEM_KRS"
        pct = self.progress_pct()
        if pct >= 100:
            return "CONCLUIDO"
        if pct >= 70:
            return "NO_PRAZO"
        if pct >= 30:
            return "EM_RISCO"
        return "ATRASADO"
