from sqlalchemy import select
from sqlalchemy.orm import Session

from app.slices.okrs.api.schemas import KeyResultOut, ObjectiveOut
from app.slices.okrs.domain.entities import KeyResult, Objective
from app.slices.okrs.infrastructure.models import OkrKeyResultModel, OkrObjectiveModel


def _kr_to_entity(m: OkrKeyResultModel) -> KeyResult:
    return KeyResult(
        id=m.id,
        title=m.title,
        metric_type=m.metric_type,
        unit=m.unit,
        initial_value=m.initial_value,
        target_value=m.target_value,
        current_value=m.current_value,
    )


def _build_objective_out(
    obj_model: OkrObjectiveModel, kr_models: list[OkrKeyResultModel]
) -> ObjectiveOut:
    krs = [_kr_to_entity(k) for k in kr_models]
    objective = Objective(
        id=obj_model.id,
        title=obj_model.title,
        description=obj_model.description,
        cycle=obj_model.cycle,
        collaborator_id=obj_model.collaborator_id,
        key_results=krs,
    )
    kr_outs = [
        KeyResultOut(
            id=k.id,
            objective_id=obj_model.id,
            title=k.title,
            metric_type=k.metric_type,
            unit=k.unit,
            initial_value=k.initial_value,
            target_value=k.target_value,
            current_value=k.current_value,
            progress_pct=round(kr_entity.progress_pct(), 1),
            status=kr_entity.status(),
        )
        for k, kr_entity in zip(kr_models, krs, strict=True)
    ]
    return ObjectiveOut(
        id=obj_model.id,
        tenant_id=obj_model.tenant_id,
        collaborator_id=obj_model.collaborator_id,
        title=obj_model.title,
        description=obj_model.description,
        cycle=obj_model.cycle,
        progress_pct=round(objective.progress_pct(), 1),
        status=objective.status(),
        key_results=kr_outs,
    )


class OkrService:
    def __init__(self, db: Session):
        self.db = db

    def _get_krs(self, objective_id: str) -> list[OkrKeyResultModel]:
        return list(
            self.db.scalars(
                select(OkrKeyResultModel).where(OkrKeyResultModel.objective_id == objective_id)
            ).all()
        )

    def _get_objective(self, tenant_id: str, objective_id: str) -> OkrObjectiveModel:
        obj = self.db.scalar(
            select(OkrObjectiveModel).where(
                (OkrObjectiveModel.id == objective_id) & (OkrObjectiveModel.tenant_id == tenant_id)
            )
        )
        if not obj:
            raise ValueError("Objetivo não encontrado")
        return obj

    def list_objectives(self, tenant_id: str, cycle: str | None = None) -> list[ObjectiveOut]:
        query = select(OkrObjectiveModel).where(OkrObjectiveModel.tenant_id == tenant_id)
        if cycle:
            query = query.where(OkrObjectiveModel.cycle == cycle)
        objectives = list(self.db.scalars(query).all())
        return [_build_objective_out(obj, self._get_krs(obj.id)) for obj in objectives]

    def create_objective(
        self,
        tenant_id: str,
        title: str,
        description: str,
        cycle: str,
        collaborator_id: str | None,
    ) -> ObjectiveOut:
        obj = OkrObjectiveModel(
            tenant_id=tenant_id,
            title=title.strip(),
            description=description.strip(),
            cycle=cycle,
            collaborator_id=collaborator_id or None,
        )
        self.db.add(obj)
        self.db.commit()
        self.db.refresh(obj)
        return _build_objective_out(obj, [])

    def update_objective(
        self,
        tenant_id: str,
        objective_id: str,
        title: str | None,
        description: str | None,
        cycle: str | None,
        collaborator_id: str | None,
    ) -> ObjectiveOut:
        obj = self._get_objective(tenant_id, objective_id)
        if title is not None:
            obj.title = title.strip()
        if description is not None:
            obj.description = description.strip()
        if cycle is not None:
            obj.cycle = cycle
        if collaborator_id is not None:
            obj.collaborator_id = collaborator_id or None
        self.db.commit()
        self.db.refresh(obj)
        return _build_objective_out(obj, self._get_krs(obj.id))

    def delete_objective(self, tenant_id: str, objective_id: str) -> None:
        obj = self._get_objective(tenant_id, objective_id)
        self.db.delete(obj)
        self.db.commit()

    def add_key_result(
        self,
        tenant_id: str,
        objective_id: str,
        title: str,
        metric_type: str,
        unit: str,
        initial_value: float,
        target_value: float,
        current_value: float,
    ) -> ObjectiveOut:
        obj = self._get_objective(tenant_id, objective_id)
        kr = OkrKeyResultModel(
            tenant_id=tenant_id,
            objective_id=obj.id,
            title=title.strip(),
            metric_type=metric_type,
            unit=unit,
            initial_value=initial_value,
            target_value=target_value,
            current_value=current_value,
        )
        self.db.add(kr)
        self.db.commit()
        self.db.refresh(obj)
        return _build_objective_out(obj, self._get_krs(obj.id))

    def update_key_result(
        self,
        tenant_id: str,
        kr_id: str,
        title: str | None,
        metric_type: str | None,
        unit: str | None,
        initial_value: float | None,
        target_value: float | None,
        current_value: float | None,
    ) -> ObjectiveOut:
        kr = self.db.scalar(
            select(OkrKeyResultModel).where(
                (OkrKeyResultModel.id == kr_id) & (OkrKeyResultModel.tenant_id == tenant_id)
            )
        )
        if not kr:
            raise ValueError("Key Result não encontrado")
        if title is not None:
            kr.title = title.strip()
        if metric_type is not None:
            kr.metric_type = metric_type
        if unit is not None:
            kr.unit = unit
        if initial_value is not None:
            kr.initial_value = initial_value
        if target_value is not None:
            kr.target_value = target_value
        if current_value is not None:
            kr.current_value = current_value
        self.db.commit()
        obj = self._get_objective(tenant_id, kr.objective_id)
        return _build_objective_out(obj, self._get_krs(obj.id))

    def update_kr_progress(self, tenant_id: str, kr_id: str, current_value: float) -> ObjectiveOut:
        return self.update_key_result(
            tenant_id,
            kr_id,
            title=None,
            metric_type=None,
            unit=None,
            initial_value=None,
            target_value=None,
            current_value=current_value,
        )

    def delete_key_result(self, tenant_id: str, kr_id: str) -> None:
        kr = self.db.scalar(
            select(OkrKeyResultModel).where(
                (OkrKeyResultModel.id == kr_id) & (OkrKeyResultModel.tenant_id == tenant_id)
            )
        )
        if not kr:
            raise ValueError("Key Result não encontrado")
        self.db.delete(kr)
        self.db.commit()
