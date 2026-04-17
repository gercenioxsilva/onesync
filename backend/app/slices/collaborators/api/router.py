from fastapi import APIRouter, Depends, File, HTTPException, Query, Response, UploadFile, status
from fastapi.responses import PlainTextResponse
from sqlalchemy.orm import Session

from app.core.auth import AuthContext, get_current_user, require_roles
from app.core.database import get_db
from app.slices.collaborators.api.schemas import (
    CollaboratorCreate,
    CollaboratorImportSummary,
    CollaboratorOut,
    CollaboratorRiskAction,
    CollaboratorUpdate,
)
from app.slices.collaborators.application.services import CollaboratorService

router = APIRouter(prefix="/api/collaborators", tags=["collaborators"])


@router.get("", response_model=list[CollaboratorOut])
def list_collaborators(
    db: Session = Depends(get_db),
    current_user: AuthContext = Depends(get_current_user),
):
    return CollaboratorService(db).list_all_enriched(current_user.tenant_id)


@router.get("/import-template", response_class=PlainTextResponse)
def download_import_template():
    return CollaboratorService.build_csv_template()


@router.post("", response_model=CollaboratorOut, status_code=201)
def create_collaborator(
    payload: CollaboratorCreate,
    db: Session = Depends(get_db),
    current_user: AuthContext = Depends(require_roles("OWNER", "ADMIN", "TECH_LEAD")),
):
    return CollaboratorService(db).create(
        current_user.tenant_id,
        payload.name,
        payload.email,
        payload.squad,
        payload.tech_lead_id,
        payload.role,
        payload.focus,
    )


@router.get("/{collaborator_id}", response_model=CollaboratorOut)
def get_collaborator(
    collaborator_id: str,
    db: Session = Depends(get_db),
    current_user: AuthContext = Depends(get_current_user),
):
    try:
        return CollaboratorService(db).get_by_id_enriched(current_user.tenant_id, collaborator_id)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@router.post("/import-csv", response_model=CollaboratorImportSummary)
async def import_collaborators_csv(
    file: UploadFile = File(...),
    update_existing: bool = Query(default=False),
    enrich_from_txt: bool = Query(default=True),
    db: Session = Depends(get_db),
    current_user: AuthContext = Depends(require_roles("OWNER", "ADMIN", "TECH_LEAD")),
):
    if not file.filename.lower().endswith(".csv"):
        raise HTTPException(status_code=400, detail="Envie um arquivo .csv")

    try:
        content = await file.read()
        return CollaboratorService(db).import_from_csv(
            current_user.tenant_id,
            content,
            update_existing=update_existing,
            enrich_from_txt=enrich_from_txt,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.put("/{collaborator_id}", response_model=CollaboratorOut)
def update_collaborator(
    collaborator_id: str,
    payload: CollaboratorUpdate,
    db: Session = Depends(get_db),
    current_user: AuthContext = Depends(require_roles("OWNER", "ADMIN", "TECH_LEAD")),
):
    try:
        return CollaboratorService(db).update(
            current_user.tenant_id,
            collaborator_id,
            payload.name,
            payload.email,
            payload.squad,
            payload.tech_lead_id,
            payload.role,
            payload.focus,
        )
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@router.delete("/{collaborator_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_collaborator(
    collaborator_id: str,
    db: Session = Depends(get_db),
    current_user: AuthContext = Depends(require_roles("OWNER", "ADMIN")),
):
    try:
        CollaboratorService(db).delete(current_user.tenant_id, collaborator_id)
        return Response(status_code=status.HTTP_204_NO_CONTENT)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@router.patch("/{collaborator_id}/risk", response_model=CollaboratorOut)
def update_risk(
    collaborator_id: str,
    payload: CollaboratorRiskAction,
    db: Session = Depends(get_db),
    current_user: AuthContext = Depends(require_roles("OWNER", "ADMIN", "TECH_LEAD")),
):
    try:
        return CollaboratorService(db).change_risk(current_user.tenant_id, collaborator_id, payload.action)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@router.post("/{collaborator_id}/start-pdi", response_model=CollaboratorOut)
def start_pdi(
    collaborator_id: str,
    db: Session = Depends(get_db),
    current_user: AuthContext = Depends(require_roles("OWNER", "ADMIN", "TECH_LEAD")),
):
    try:
        return CollaboratorService(db).start_pdi(current_user.tenant_id, collaborator_id)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
