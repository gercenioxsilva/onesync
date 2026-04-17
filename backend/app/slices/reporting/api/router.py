from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.auth import AuthContext, get_current_user
from app.core.database import get_db
from app.slices.reporting.application.services import ReportingService

router = APIRouter(prefix="/api/reporting", tags=["reporting"])


@router.get("/dashboard")
def get_dashboard(
    db: Session = Depends(get_db),
    current_user: AuthContext = Depends(get_current_user),
):
    return ReportingService(db).dashboard_summary(current_user.tenant_id)


@router.get("/risk-breakdown")
def get_risk_breakdown(
    db: Session = Depends(get_db),
    current_user: AuthContext = Depends(get_current_user),
):
    return ReportingService(db).risk_breakdown(current_user.tenant_id)


@router.get("/heatmap")
def get_heatmap(
    db: Session = Depends(get_db),
    current_user: AuthContext = Depends(get_current_user),
):
    return ReportingService(db).heatmap(current_user.tenant_id)
