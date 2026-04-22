from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.auth import AuthContext, require_roles
from app.core.database import get_db
from app.slices.okrs.api.schemas import (
    KeyResultCreate,
    KeyResultProgressUpdate,
    KeyResultUpdate,
    ObjectiveCreate,
    ObjectiveOut,
    ObjectiveUpdate,
)
from app.slices.okrs.application.services import OkrService

router = APIRouter(prefix="/api/okrs", tags=["okrs"])

_WRITERS = ("OWNER", "ADMIN", "TECH_LEAD")
_ALL = ("OWNER", "ADMIN", "TECH_LEAD", "MEMBER")


@router.get("/objectives", response_model=list[ObjectiveOut])
def list_objectives(
    cycle: str | None = None,
    db: Session = Depends(get_db),
    current_user: AuthContext = Depends(require_roles(*_ALL)),
):
    return OkrService(db).list_objectives(current_user.tenant_id, cycle)


@router.post("/objectives", response_model=ObjectiveOut, status_code=201)
def create_objective(
    payload: ObjectiveCreate,
    db: Session = Depends(get_db),
    current_user: AuthContext = Depends(require_roles(*_WRITERS)),
):
    return OkrService(db).create_objective(
        tenant_id=current_user.tenant_id,
        title=payload.title,
        description=payload.description,
        cycle=payload.cycle,
        collaborator_id=payload.collaborator_id,
    )


@router.put("/objectives/{objective_id}", response_model=ObjectiveOut)
def update_objective(
    objective_id: str,
    payload: ObjectiveUpdate,
    db: Session = Depends(get_db),
    current_user: AuthContext = Depends(require_roles(*_WRITERS)),
):
    try:
        return OkrService(db).update_objective(
            tenant_id=current_user.tenant_id,
            objective_id=objective_id,
            title=payload.title,
            description=payload.description,
            cycle=payload.cycle,
            collaborator_id=payload.collaborator_id,
        )
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@router.delete("/objectives/{objective_id}", status_code=204)
def delete_objective(
    objective_id: str,
    db: Session = Depends(get_db),
    current_user: AuthContext = Depends(require_roles(*_WRITERS)),
):
    try:
        OkrService(db).delete_objective(current_user.tenant_id, objective_id)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@router.post("/objectives/{objective_id}/key-results", response_model=ObjectiveOut, status_code=201)
def add_key_result(
    objective_id: str,
    payload: KeyResultCreate,
    db: Session = Depends(get_db),
    current_user: AuthContext = Depends(require_roles(*_WRITERS)),
):
    try:
        return OkrService(db).add_key_result(
            tenant_id=current_user.tenant_id,
            objective_id=objective_id,
            title=payload.title,
            metric_type=payload.metric_type,
            unit=payload.unit,
            initial_value=payload.initial_value,
            target_value=payload.target_value,
            current_value=payload.current_value,
        )
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@router.put("/key-results/{kr_id}", response_model=ObjectiveOut)
def update_key_result(
    kr_id: str,
    payload: KeyResultUpdate,
    db: Session = Depends(get_db),
    current_user: AuthContext = Depends(require_roles(*_WRITERS)),
):
    try:
        return OkrService(db).update_key_result(
            tenant_id=current_user.tenant_id,
            kr_id=kr_id,
            title=payload.title,
            metric_type=payload.metric_type,
            unit=payload.unit,
            initial_value=payload.initial_value,
            target_value=payload.target_value,
            current_value=payload.current_value,
        )
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@router.patch("/key-results/{kr_id}/progress", response_model=ObjectiveOut)
def update_kr_progress(
    kr_id: str,
    payload: KeyResultProgressUpdate,
    db: Session = Depends(get_db),
    current_user: AuthContext = Depends(require_roles(*_ALL)),
):
    try:
        return OkrService(db).update_kr_progress(
            current_user.tenant_id, kr_id, payload.current_value
        )
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@router.delete("/key-results/{kr_id}", status_code=204)
def delete_key_result(
    kr_id: str,
    db: Session = Depends(get_db),
    current_user: AuthContext = Depends(require_roles(*_WRITERS)),
):
    try:
        OkrService(db).delete_key_result(current_user.tenant_id, kr_id)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
