from datetime import date

from sqlalchemy import desc, select
from sqlalchemy.orm import Session

from app.slices.collaborators.infrastructure.models import CollaboratorModel
from app.slices.one_on_ones.domain.entities import OneOnOneSession
from app.slices.one_on_ones.infrastructure.models import OneOnOneModel


class OneOnOneService:
    def __init__(self, db: Session):
        self.db = db

    def create(
        self,
        tenant_id: str,
        collaborator_id: str,
        meeting_date: date,
        mood_score: int | None,
        summary: str,
        next_steps: str,
        next_meeting_date: date | None,
    ) -> OneOnOneModel:
        collaborator = self.db.scalar(
            select(CollaboratorModel).where(
                (CollaboratorModel.id == collaborator_id)
                & (CollaboratorModel.tenant_id == tenant_id)
            )
        )
        if not collaborator:
            raise ValueError("Colaborador não encontrado para este tenant")

        session = OneOnOneSession(
            collaborator_id=collaborator_id,
            meeting_date=meeting_date,
            mood_score=mood_score,
            summary=summary,
            next_steps=next_steps,
        )
        model = OneOnOneModel(
            tenant_id=tenant_id,
            collaborator_id=collaborator_id,
            meeting_date=meeting_date,
            mood_score=mood_score,
            summary=summary.strip(),
            next_steps=next_steps.strip(),
            next_meeting_date=next_meeting_date,
            risk_signal=session.risk_signal(),
        )
        self.db.add(model)
        self.db.commit()
        self.db.refresh(model)
        return model

    def list_by_collaborator(self, tenant_id: str, collaborator_id: str) -> list[OneOnOneModel]:
        query = (
            select(OneOnOneModel)
            .where(
                (OneOnOneModel.collaborator_id == collaborator_id)
                & (OneOnOneModel.tenant_id == tenant_id)
            )
            .order_by(desc(OneOnOneModel.meeting_date))
        )
        return list(self.db.scalars(query).all())

    def update(
        self,
        tenant_id: str,
        one_on_one_id: str,
        collaborator_id: str,
        meeting_date: date,
        mood_score: int | None,
        summary: str,
        next_steps: str,
        next_meeting_date: date | None,
    ) -> OneOnOneModel:
        model = self.db.scalar(
            select(OneOnOneModel).where(
                (OneOnOneModel.id == one_on_one_id) & (OneOnOneModel.tenant_id == tenant_id)
            )
        )
        if not model:
            raise ValueError("Registro de 1:1 não encontrado")

        collaborator = self.db.scalar(
            select(CollaboratorModel).where(
                (CollaboratorModel.id == collaborator_id)
                & (CollaboratorModel.tenant_id == tenant_id)
            )
        )
        if not collaborator:
            raise ValueError("Colaborador não encontrado para este tenant")

        session = OneOnOneSession(
            collaborator_id=collaborator_id,
            meeting_date=meeting_date,
            mood_score=mood_score,
            summary=summary,
            next_steps=next_steps,
        )

        model.collaborator_id = collaborator_id
        model.meeting_date = meeting_date  # type: ignore[assignment]
        model.mood_score = mood_score  # type: ignore[assignment]
        model.summary = summary.strip()
        model.next_steps = next_steps.strip()
        model.next_meeting_date = next_meeting_date  # type: ignore[assignment]
        model.risk_signal = session.risk_signal()

        self.db.add(model)
        self.db.commit()
        self.db.refresh(model)
        return model

    def delete(self, tenant_id: str, one_on_one_id: str) -> None:
        model = self.db.scalar(
            select(OneOnOneModel).where(
                (OneOnOneModel.id == one_on_one_id) & (OneOnOneModel.tenant_id == tenant_id)
            )
        )
        if not model:
            raise ValueError("Registro de 1:1 não encontrado")
        self.db.delete(model)
        self.db.commit()
