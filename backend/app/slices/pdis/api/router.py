from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.auth import AuthContext, require_roles
from app.core.database import get_db
from app.slices.pdis.api.schemas import PdiCreate, PdiOut
from app.slices.pdis.application.services import PdiService

router = APIRouter(prefix="/api/pdis", tags=["pdis"])


@router.post("", response_model=PdiOut, status_code=201)
def create_pdi(
    payload: PdiCreate,
    db: Session = Depends(get_db),
    current_user: AuthContext = Depends(require_roles("OWNER", "ADMIN", "TECH_LEAD")),
):
    try:
        return PdiService(db).create_or_update(
            current_user.tenant_id,
            payload.collaborator_id,
            payload.cycle,
            payload.objective,
            payload.progress,
        )
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@router.get("/collaborator/{collaborator_id}", response_model=list[PdiOut])
def list_by_collaborator(
    collaborator_id: str,
    db: Session = Depends(get_db),
    current_user: AuthContext = Depends(require_roles("OWNER", "ADMIN", "TECH_LEAD", "MEMBER")),
):
    return PdiService(db).list_by_collaborator(current_user.tenant_id, collaborator_id)
