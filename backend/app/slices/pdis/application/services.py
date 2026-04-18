from sqlalchemy import select
from sqlalchemy.orm import Session

from app.slices.collaborators.infrastructure.models import CollaboratorModel
from app.slices.pdis.infrastructure.models import PdiModel


class PdiService:
    def __init__(self, db: Session):
        self.db = db

    @staticmethod
    def _pdi_status_from_progress(progress: int) -> str:
        if progress >= 80:
            return "CONCLUIDO"
        if progress > 0:
            return "EM_ANDAMENTO"
        return "NAO_INICIADO"

    @staticmethod
    def _collaborator_status_from_pdi(pdi_status: str) -> str:
        if pdi_status == "NAO_INICIADO":
            return "NO_PLANO"
        return pdi_status

    def create_or_update(
        self,
        tenant_id: str,
        collaborator_id: str,
        cycle: str,
        objective: str,
        progress: int,
    ) -> PdiModel:
        collaborator = self.db.scalar(
            select(CollaboratorModel).where(
                (CollaboratorModel.id == collaborator_id)
                & (CollaboratorModel.tenant_id == tenant_id)
            )
        )
        if not collaborator:
            raise ValueError("Colaborador não encontrado para este tenant")

        existing = self.db.scalar(
            select(PdiModel).where(
                (PdiModel.tenant_id == tenant_id)
                & (PdiModel.collaborator_id == collaborator_id)
                & (PdiModel.cycle == cycle)
            )
        )
        if existing:
            existing.objective = objective
            existing.progress = progress
            existing.status = self._pdi_status_from_progress(progress)
            collaborator.pdi_status = self._collaborator_status_from_pdi(existing.status)
            self.db.commit()
            self.db.refresh(existing)
            return existing

        model = PdiModel(
            tenant_id=tenant_id,
            collaborator_id=collaborator_id,
            cycle=cycle,
            objective=objective.strip(),
            progress=progress,
            status=self._pdi_status_from_progress(progress),
        )
        self.db.add(model)
        collaborator.pdi_status = self._collaborator_status_from_pdi(model.status)
        self.db.commit()
        self.db.refresh(model)
        return model

    def list_by_collaborator(self, tenant_id: str, collaborator_id: str) -> list[PdiModel]:
        query = select(PdiModel).where(
            (PdiModel.tenant_id == tenant_id) & (PdiModel.collaborator_id == collaborator_id)
        )
        return list(self.db.scalars(query).all())
