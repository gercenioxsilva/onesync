from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from app.slices.collaborators.domain.entities import Collaborator, PdiStatus, RiskLevel
from app.slices.collaborators.infrastructure.models import CollaboratorModel
from app.slices.one_on_ones.infrastructure.models import OneOnOneModel
from app.slices.pdis.infrastructure.models import PdiModel


class CollaboratorRepository:
    def __init__(self, db: Session):
        self.db = db

    def list_all(self, tenant_id: str) -> list[CollaboratorModel]:
        query = (
            select(CollaboratorModel)
            .where(CollaboratorModel.tenant_id == tenant_id)
            .order_by(CollaboratorModel.name)
        )
        return list(self.db.scalars(query).all())

    def get_by_id(self, tenant_id: str, collaborator_id: str) -> CollaboratorModel | None:
        query = select(CollaboratorModel).where(
            (CollaboratorModel.id == collaborator_id) & (CollaboratorModel.tenant_id == tenant_id)
        )
        return self.db.scalar(query)

    def get_by_name(self, tenant_id: str, name: str) -> CollaboratorModel | None:
        query = select(CollaboratorModel).where(
            (CollaboratorModel.tenant_id == tenant_id) & (CollaboratorModel.name == name)
        )
        return self.db.scalar(query)

    def add(self, model: CollaboratorModel) -> CollaboratorModel:
        self.db.add(model)
        self.db.commit()
        self.db.refresh(model)
        return model

    def save(self, model: CollaboratorModel) -> CollaboratorModel:
        self.db.add(model)
        self.db.commit()
        self.db.refresh(model)
        return model

    def delete(self, model: CollaboratorModel) -> None:
        self.db.execute(
            delete(OneOnOneModel).where(
                (OneOnOneModel.collaborator_id == model.id)
                & (OneOnOneModel.tenant_id == model.tenant_id)
            )
        )
        self.db.execute(
            delete(PdiModel).where(
                (PdiModel.collaborator_id == model.id) & (PdiModel.tenant_id == model.tenant_id)
            )
        )
        self.db.delete(model)
        self.db.commit()

    @staticmethod
    def to_domain(model: CollaboratorModel) -> Collaborator:
        return Collaborator(
            id=model.id,
            name=model.name,
            role=model.role,
            focus=model.focus,
            risk=RiskLevel(model.risk),
            pdi_status=PdiStatus(model.pdi_status),
            updated_at=model.updated_at,
        )
