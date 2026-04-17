from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy.orm import Session

from app.core.auth import AuthContext, require_roles
from app.core.database import get_db
from app.slices.one_on_ones.api.schemas import OneOnOneCreate, OneOnOneOut, OneOnOneUpdate
from app.slices.one_on_ones.application.services import OneOnOneService

router = APIRouter(prefix="/api/one-on-ones", tags=["one-on-ones"])


@router.post("", response_model=OneOnOneOut, status_code=201)
def create_one_on_one(
    payload: OneOnOneCreate,
    db: Session = Depends(get_db),
    current_user: AuthContext = Depends(require_roles("OWNER", "ADMIN", "TECH_LEAD")),
):
    try:
        return OneOnOneService(db).create(
            current_user.tenant_id,
            payload.collaborator_id,
            payload.meeting_date,
            payload.mood_score,
            payload.summary,
            payload.next_steps,
            payload.next_meeting_date,
        )
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@router.get("/collaborator/{collaborator_id}", response_model=list[OneOnOneOut])
def list_by_collaborator(
    collaborator_id: str,
    db: Session = Depends(get_db),
    current_user: AuthContext = Depends(require_roles("OWNER", "ADMIN", "TECH_LEAD", "MEMBER")),
):
    return OneOnOneService(db).list_by_collaborator(current_user.tenant_id, collaborator_id)


@router.put("/{one_on_one_id}", response_model=OneOnOneOut)
def update_one_on_one(
    one_on_one_id: str,
    payload: OneOnOneUpdate,
    db: Session = Depends(get_db),
    current_user: AuthContext = Depends(require_roles("OWNER", "ADMIN", "TECH_LEAD")),
):
    try:
        return OneOnOneService(db).update(
            current_user.tenant_id,
            one_on_one_id,
            payload.collaborator_id,
            payload.meeting_date,
            payload.mood_score,
            payload.summary,
            payload.next_steps,
            payload.next_meeting_date,
        )
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@router.delete("/{one_on_one_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_one_on_one(
    one_on_one_id: str,
    db: Session = Depends(get_db),
    current_user: AuthContext = Depends(require_roles("OWNER", "ADMIN", "TECH_LEAD")),
):
    try:
        OneOnOneService(db).delete(current_user.tenant_id, one_on_one_id)
        return Response(status_code=status.HTTP_204_NO_CONTENT)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
