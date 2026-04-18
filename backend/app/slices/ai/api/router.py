import logging
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.auth import AuthContext, get_current_user, require_roles
from app.core.database import get_db
from app.slices.ai.api.schemas import (
    AIConfigCreate,
    AIConfigUpdate,
    AIConfigOut,
    AIProcessingLogOut,
    ProcessOneOnOneRequest,
    ProcessOneOnOneResponse,
)
from app.slices.ai.application.services import AIProcessingService

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/ai", tags=["ai"])


@router.get("/config", response_model=AIConfigOut)
def get_ai_config(
    current_user: AuthContext = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get AI configuration for current tenant"""
    service = AIProcessingService(db)
    config = service.get_ai_config(current_user.tenant_id)

    if not config:
        raise HTTPException(
            status_code=404,
            detail="AI configuration not found. Please set up AI first."
        )

    return config


@router.post("/config", response_model=AIConfigOut, status_code=status.HTTP_201_CREATED)
def create_ai_config(
    payload: AIConfigCreate,
    current_user: AuthContext = Depends(require_roles("OWNER", "ADMIN")),
    db: Session = Depends(get_db),
):
    """Create AI configuration for current tenant (OWNER/ADMIN only)"""
    service = AIProcessingService(db)

    existing = service.get_ai_config(current_user.tenant_id)
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="AI configuration already exists for this tenant. Use PATCH to update."
        )

    try:
        config = service.create_ai_config(
            tenant_id=current_user.tenant_id,
            provider=payload.provider,
            api_key=payload.api_key,
            model_name=payload.model_name,
            auto_process_enabled=payload.auto_process_enabled,
            temperature=payload.temperature,
            max_tokens=payload.max_tokens,
            monthly_quota=payload.monthly_quota,
            prompt_template=payload.prompt_template,
        )

        logger.info(
            f"AI config created for tenant {current_user.tenant_id} with provider {payload.provider}"
        )
        return config

    except Exception as e:
        logger.error(f"Error creating AI config: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to create AI configuration: {str(e)}",
        )


@router.patch("/config", response_model=AIConfigOut)
def update_ai_config(
    payload: AIConfigUpdate,
    current_user: AuthContext = Depends(require_roles("OWNER", "ADMIN")),
    db: Session = Depends(get_db),
):
    """Update AI configuration for current tenant (OWNER/ADMIN only)"""
    service = AIProcessingService(db)

    config = service.get_ai_config(current_user.tenant_id)
    if not config:
        raise HTTPException(
            status_code=404,
            detail="AI configuration not found. Please create one first."
        )

    try:
        update_data = {k: v for k, v in payload.dict().items() if v is not None}

        config = service.update_ai_config(current_user.tenant_id, **update_data)

        logger.info(f"AI config updated for tenant {current_user.tenant_id}")
        return config

    except Exception as e:
        logger.error(f"Error updating AI config: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to update AI configuration: {str(e)}",
        )


@router.post("/process", response_model=ProcessOneOnOneResponse)
async def process_one_on_one(
    payload: ProcessOneOnOneRequest,
    current_user: AuthContext = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Process a 1:1 meeting with AI (extracts summary, next steps, mood, risks)"""
    service = AIProcessingService(db)

    try:
        result = await service.process_one_on_one(
            tenant_id=current_user.tenant_id,
            one_on_one_id=payload.one_on_one_id,
            transcription=payload.transcription,
            user_id=current_user.user_id,
            input_type=payload.input_type,
        )

        logger.info(
            f"Successfully processed 1:1 {payload.one_on_one_id} for user {current_user.user_id}. "
            f"Cost: ${result['estimated_cost']}"
        )

        return result

    except ValueError as e:
        logger.warning(f"Validation error processing 1:1: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )
    except Exception as e:
        logger.error(f"Error processing 1:1: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to process 1:1 with AI. Please try again later.",
        )


@router.get("/logs", response_model=list[AIProcessingLogOut])
def get_processing_logs(
    limit: int = 50,
    offset: int = 0,
    current_user: AuthContext = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get processing logs for current tenant"""
    service = AIProcessingService(db)

    try:
        logs = service.get_processing_logs(
            tenant_id=current_user.tenant_id,
            limit=min(limit, 100),
            offset=offset,
        )
        return logs
    except Exception as e:
        logger.error(f"Error fetching processing logs: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch processing logs",
        )


@router.get("/logs/{one_on_one_id}", response_model=AIProcessingLogOut)
def get_one_on_one_processing_log(
    one_on_one_id: str,
    current_user: AuthContext = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get processing log for a specific 1:1 meeting"""
    service = AIProcessingService(db)

    try:
        log = service.get_one_on_one_processing_log(one_on_one_id)

        if not log:
            raise HTTPException(
                status_code=404,
                detail="No processing log found for this 1:1 meeting",
            )

        if log.tenant_id != current_user.tenant_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied",
            )

        return log

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching processing log: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch processing log",
        )
