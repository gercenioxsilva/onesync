import datetime
import json
import logging

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.slices.ai.application.ai_providers import get_provider
from app.slices.ai.infrastructure.models import AIConfigModel, AIProcessingLogModel
from app.slices.one_on_ones.infrastructure.models import OneOnOneModel

logger = logging.getLogger(__name__)


class AIProcessingService:
    """Service for processing 1:1 meetings with AI"""

    def __init__(self, db: Session):
        self.db = db

    async def process_one_on_one(
        self,
        tenant_id: str,
        one_on_one_id: str,
        transcription: str,
        user_id: str | None = None,
        input_type: str = "transcription",
    ) -> dict:
        """
        Process a 1:1 meeting with AI and update the database
        """
        try:
            # Get AI config for tenant
            ai_config = self.db.execute(
                select(AIConfigModel).where(AIConfigModel.tenant_id == tenant_id)
            ).scalar_one_or_none()

            if not ai_config:
                raise ValueError(f"AI configuration not found for tenant {tenant_id}")

            if not ai_config.api_key:
                raise ValueError("AI API key not configured for this tenant")

            # Check quota
            if ai_config.monthly_quota > 0 and ai_config.monthly_usage >= ai_config.monthly_quota:
                raise ValueError(
                    f"Monthly quota exceeded ({ai_config.monthly_usage}/{ai_config.monthly_quota})"
                )

            # Get 1:1 record to ensure it exists and belongs to tenant
            one_on_one = self.db.execute(
                select(OneOnOneModel).where(
                    OneOnOneModel.id == one_on_one_id,
                    OneOnOneModel.tenant_id == tenant_id,
                )
            ).scalar_one_or_none()

            if not one_on_one:
                raise ValueError(f"1:1 meeting {one_on_one_id} not found")

            # Create processing log
            log = AIProcessingLogModel(
                tenant_id=tenant_id,
                one_on_one_id=one_on_one_id,
                provider=ai_config.provider,
                model_used=ai_config.model_name,
                status="processing",
                input_type=input_type,
                input_source="",
                processed_by_user_id=user_id,
            )
            self.db.add(log)
            self.db.flush()  # Get the ID without committing

            # Prepare prompt
            prompt = ai_config.prompt_template.format(transcription=transcription)

            # Get provider and process
            provider = get_provider(
                ai_config.provider,
                ai_config.api_key,
                ai_config.model_name,
                ai_config.temperature,
                ai_config.max_tokens,
            )

            result = await provider.process_transcription(prompt)

            # Update log with results
            log.status = "completed"
            log.ai_response = result.get("raw_response", "")
            log.extracted_summary = result["summary"]
            log.extracted_next_steps = result["next_steps"]
            log.extracted_mood_score = result["mood_score"]
            log.extracted_risk_signal = result["risk_signal"]
            log.extracted_key_points = json.dumps(result.get("key_points", []))
            log.input_tokens = result["input_tokens"]
            log.output_tokens = result["output_tokens"]
            log.estimated_cost = result["cost"]
            log.updated_at = datetime.datetime.now(datetime.UTC)

            # Update 1:1 with extracted data
            one_on_one.summary = result["summary"]
            one_on_one.next_steps = result["next_steps"]
            one_on_one.mood_score = result["mood_score"]
            one_on_one.risk_signal = result["risk_signal"]

            # Update usage quota
            ai_config.monthly_usage += 1

            self.db.commit()

            logger.info(
                f"Successfully processed 1:1 {one_on_one_id} for tenant {tenant_id}. "
                f"Cost: ${result['cost']}, Tokens: {result['input_tokens']}/{result['output_tokens']}"
            )

            return {
                "log_id": log.id,
                "status": "completed",
                "extracted_summary": log.extracted_summary,
                "extracted_next_steps": log.extracted_next_steps,
                "extracted_mood_score": log.extracted_mood_score,
                "extracted_risk_signal": log.extracted_risk_signal,
                "input_tokens": log.input_tokens,
                "output_tokens": log.output_tokens,
                "estimated_cost": log.estimated_cost,
            }

        except Exception as e:
            logger.error(f"Error processing 1:1 {one_on_one_id}: {str(e)}")

            # Try to update log with error
            try:
                error_log: AIProcessingLogModel | None = self.db.execute(
                    select(AIProcessingLogModel).where(
                        AIProcessingLogModel.one_on_one_id == one_on_one_id,
                        AIProcessingLogModel.tenant_id == tenant_id,
                        AIProcessingLogModel.status == "processing",
                    )
                ).scalar_one_or_none()

                if error_log:
                    error_log.status = "failed"
                    error_log.error_message = str(e)
                    error_log.retry_count += 1
                    self.db.commit()
            except Exception as db_error:
                logger.error(f"Failed to update processing log: {str(db_error)}")

            raise

    def get_ai_config(self, tenant_id: str) -> AIConfigModel | None:
        """Get AI configuration for a tenant"""
        return self.db.execute(
            select(AIConfigModel).where(AIConfigModel.tenant_id == tenant_id)
        ).scalar_one_or_none()

    def create_ai_config(
        self,
        tenant_id: str,
        provider: str,
        api_key: str,
        model_name: str,
        auto_process_enabled: bool = False,
        temperature: float = 0.7,
        max_tokens: int = 1000,
        monthly_quota: int = 10,
        prompt_template: str = "",
    ) -> AIConfigModel:
        """Create or get AI configuration for a tenant"""
        # Check if already exists
        existing = self.get_ai_config(tenant_id)
        if existing:
            raise ValueError(f"AI config already exists for tenant {tenant_id}")

        config = AIConfigModel(
            tenant_id=tenant_id,
            provider=provider,
            api_key=api_key,
            model_name=model_name,
            auto_process_enabled=auto_process_enabled,
            temperature=temperature,
            max_tokens=max_tokens,
            monthly_quota=monthly_quota,
            prompt_template=prompt_template
            or AIConfigModel.__table__.columns["prompt_template"].default.arg,
        )

        self.db.add(config)
        self.db.commit()
        self.db.refresh(config)

        return config

    def update_ai_config(self, tenant_id: str, **kwargs) -> AIConfigModel:
        """Update AI configuration for a tenant"""
        config = self.get_ai_config(tenant_id)
        if not config:
            raise ValueError(f"AI config not found for tenant {tenant_id}")

        allowed_fields = {
            "provider",
            "api_key",
            "model_name",
            "auto_process_enabled",
            "temperature",
            "max_tokens",
            "monthly_quota",
            "prompt_template",
        }

        for key, value in kwargs.items():
            if key in allowed_fields and value is not None:
                setattr(config, key, value)

        config.updated_at = datetime.datetime.now(datetime.UTC)
        self.db.commit()
        self.db.refresh(config)

        return config

    def get_processing_logs(
        self,
        tenant_id: str,
        limit: int = 50,
        offset: int = 0,
    ) -> list[AIProcessingLogModel]:
        """Get processing logs for a tenant"""
        return list(
            self.db.execute(
                select(AIProcessingLogModel)
                .where(AIProcessingLogModel.tenant_id == tenant_id)
                .order_by(AIProcessingLogModel.created_at.desc())
                .limit(limit)
                .offset(offset)
            )
            .scalars()
            .all()
        )

    def get_one_on_one_processing_log(self, one_on_one_id: str) -> AIProcessingLogModel | None:
        """Get latest processing log for a 1:1 meeting"""
        return self.db.execute(
            select(AIProcessingLogModel)
            .where(AIProcessingLogModel.one_on_one_id == one_on_one_id)
            .order_by(AIProcessingLogModel.created_at.desc())
        ).scalar_one_or_none()
