from sqlalchemy import select
from sqlalchemy.orm import Session

from app.slices.actions.infrastructure.models import ActionModel


class ActionService:
    def __init__(self, db: Session) -> None:
        self.db = db

    def list_all(self, tenant_id: str) -> list[ActionModel]:
        return list(
            self.db.scalars(
                select(ActionModel)
                .where(ActionModel.tenant_id == tenant_id)
                .order_by(ActionModel.created_at.desc())
            )
        )

    def create(self, tenant_id: str, **kwargs) -> ActionModel:
        action = ActionModel(tenant_id=tenant_id, **kwargs)
        self.db.add(action)
        self.db.commit()
        self.db.refresh(action)
        return action

    def update(self, tenant_id: str, action_id: str, **kwargs) -> ActionModel:
        action = self._get_or_raise(tenant_id, action_id)
        for key, value in kwargs.items():
            if value is not None:
                setattr(action, key, value)
        self.db.commit()
        self.db.refresh(action)
        return action

    def update_status(self, tenant_id: str, action_id: str, status: str) -> ActionModel:
        action = self._get_or_raise(tenant_id, action_id)
        action.status = status
        self.db.commit()
        self.db.refresh(action)
        return action

    def delete(self, tenant_id: str, action_id: str) -> None:
        action = self._get_or_raise(tenant_id, action_id)
        self.db.delete(action)
        self.db.commit()

    def _get_or_raise(self, tenant_id: str, action_id: str) -> ActionModel:
        action = self.db.scalar(
            select(ActionModel).where(
                ActionModel.id == action_id,
                ActionModel.tenant_id == tenant_id,
            )
        )
        if not action:
            raise ValueError(f"Action {action_id} not found")
        return action
