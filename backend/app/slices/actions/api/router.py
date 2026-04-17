from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.auth import AuthContext, require_roles
from app.core.database import get_db
from app.slices.actions.api.schemas import ActionCreate, ActionOut, ActionStatusUpdate, ActionUpdate
from app.slices.actions.application.services import ActionService

router = APIRouter(prefix="/api/actions", tags=["actions"])


@router.get("", response_model=list[ActionOut])
def list_actions(
    db: Session = Depends(get_db),
    current_user: AuthContext = Depends(require_roles("OWNER", "ADMIN", "TECH_LEAD", "MEMBER")),
):
    return ActionService(db).list_all(current_user.tenant_id)


@router.post("", response_model=ActionOut, status_code=201)
def create_action(
    payload: ActionCreate,
    db: Session = Depends(get_db),
    current_user: AuthContext = Depends(require_roles("OWNER", "ADMIN", "TECH_LEAD")),
):
    return ActionService(db).create(
        tenant_id=current_user.tenant_id,
        title=payload.title,
        owner=payload.owner,
        due_date=payload.due_date,
        category=payload.category,
        status=payload.status,
        collaborator_id=payload.collaborator_id,
    )


@router.put("/{action_id}", response_model=ActionOut)
def update_action(
    action_id: str,
    payload: ActionUpdate,
    db: Session = Depends(get_db),
    current_user: AuthContext = Depends(require_roles("OWNER", "ADMIN", "TECH_LEAD")),
):
    try:
        return ActionService(db).update(
            tenant_id=current_user.tenant_id,
            action_id=action_id,
            title=payload.title,
            owner=payload.owner,
            due_date=payload.due_date,
            category=payload.category,
            collaborator_id=payload.collaborator_id,
        )
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@router.patch("/{action_id}/status", response_model=ActionOut)
def update_action_status(
    action_id: str,
    payload: ActionStatusUpdate,
    db: Session = Depends(get_db),
    current_user: AuthContext = Depends(require_roles("OWNER", "ADMIN", "TECH_LEAD", "MEMBER")),
):
    valid = {"NAO_INICIADO", "EM_ANDAMENTO", "CONCLUIDO"}
    if payload.status not in valid:
        raise HTTPException(status_code=422, detail=f"Status inválido. Use: {valid}")
    try:
        return ActionService(db).update_status(current_user.tenant_id, action_id, payload.status)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@router.delete("/{action_id}", status_code=204)
def delete_action(
    action_id: str,
    db: Session = Depends(get_db),
    current_user: AuthContext = Depends(require_roles("OWNER", "ADMIN", "TECH_LEAD")),
):
    try:
        ActionService(db).delete(current_user.tenant_id, action_id)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
