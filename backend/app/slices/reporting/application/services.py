from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.slices.collaborators.infrastructure.models import CollaboratorModel
from app.slices.one_on_ones.infrastructure.models import OneOnOneModel
from app.slices.pdis.infrastructure.models import PdiModel


class ReportingService:
    def __init__(self, db: Session):
        self.db = db

    def dashboard_summary(self, tenant_id: str) -> dict:
        total_collaborators = self.db.scalar(
            select(func.count(CollaboratorModel.id)).where(CollaboratorModel.tenant_id == tenant_id)
        )
        high_risk = self.db.scalar(
            select(func.count(CollaboratorModel.id)).where(
                (CollaboratorModel.tenant_id == tenant_id) & (CollaboratorModel.risk == "ALTO")
            )
        )
        pdi_in_progress = self.db.scalar(
            select(func.count(PdiModel.id)).where(
                (PdiModel.tenant_id == tenant_id) & (PdiModel.status == "EM_ANDAMENTO")
            )
        )
        recent_ones = self.db.scalar(
            select(func.count(OneOnOneModel.id)).where(OneOnOneModel.tenant_id == tenant_id)
        )

        return {
            "total_collaborators": total_collaborators or 0,
            "high_risk_count": high_risk or 0,
            "pdi_in_progress": pdi_in_progress or 0,
            "total_one_on_ones": recent_ones or 0,
        }

    def risk_breakdown(self, tenant_id: str) -> dict:
        low = self.db.scalar(
            select(func.count(CollaboratorModel.id)).where(
                (CollaboratorModel.tenant_id == tenant_id) & (CollaboratorModel.risk == "BAIXO")
            )
        )
        medium = self.db.scalar(
            select(func.count(CollaboratorModel.id)).where(
                (CollaboratorModel.tenant_id == tenant_id) & (CollaboratorModel.risk == "MEDIO")
            )
        )
        high = self.db.scalar(
            select(func.count(CollaboratorModel.id)).where(
                (CollaboratorModel.tenant_id == tenant_id) & (CollaboratorModel.risk == "ALTO")
            )
        )
        return {"low": low or 0, "medium": medium or 0, "high": high or 0}

    def heatmap(self, tenant_id: str) -> list[dict]:
        """Get collaborators with next 1:1 date and PDI progress enriched"""
        collaborators = list(
            self.db.scalars(
                select(CollaboratorModel)
                .where(CollaboratorModel.tenant_id == tenant_id)
                .order_by(CollaboratorModel.name)
            )
        )

        result = []
        for collab in collaborators:
            # Get next 1:1 (most recent next_meeting_date)
            next_one_on_one = self.db.scalar(
                select(OneOnOneModel.next_meeting_date)
                .where(OneOnOneModel.collaborator_id == collab.id)
                .where(OneOnOneModel.next_meeting_date.isnot(None))
                .order_by(OneOnOneModel.next_meeting_date.desc())
                .limit(1)
            )

            # Get latest PDI and its progress
            latest_pdi = self.db.scalar(
                select(PdiModel.progress)
                .where((PdiModel.collaborator_id == collab.id) & (PdiModel.tenant_id == tenant_id))
                .order_by(PdiModel.created_at.desc())
                .limit(1)
            )

            result.append(
                {
                    "id": collab.id,
                    "name": collab.name,
                    "email": collab.email,
                    "risk": collab.risk,
                    "next_one_on_one": next_one_on_one.isoformat() if next_one_on_one else None,
                    "progress": latest_pdi or 0,
                }
            )

        return result
