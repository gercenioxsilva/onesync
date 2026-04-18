import uuid
from datetime import UTC, datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class AIConfigModel(Base):
    __tablename__ = "ai_configs"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    tenant_id: Mapped[str] = mapped_column(String(36), ForeignKey("tenants.id", ondelete="CASCADE"), index=True, unique=True)

    # Provider: openai, gemini, azure
    provider: Mapped[str] = mapped_column(String(50), default="openai")

    # API credentials (will be encrypted in production)
    api_key: Mapped[str] = mapped_column(String(500), default="")

    # Model configuration
    model_name: Mapped[str] = mapped_column(String(100), default="gpt-4-turbo")

    # Processing settings
    auto_process_enabled: Mapped[bool] = mapped_column(Boolean, default=False)

    # Custom prompt template
    prompt_template: Mapped[str] = mapped_column(Text, default="""Analyze this 1:1 meeting transcription between a manager and a team member.
Extract the following information in JSON format:
{
    "summary": "Executive summary of the conversation (max 500 chars)",
    "next_steps": "Action items agreed upon (max 500 chars)",
    "mood_score": mood as integer 1-10,
    "risk_signal": "RISCO, NEUTRO, or OPORTUNIDADE",
    "key_points": ["point1", "point2", ...]
}

Transcription:
{transcription}""")

    # Temperature for model (0.0-1.0)
    temperature: Mapped[float] = mapped_column(default=0.7)

    # Max tokens to use
    max_tokens: Mapped[int] = mapped_column(default=1000)

    # Quota/month for automatic processing (free tier: 10, paid: unlimited)
    monthly_quota: Mapped[int] = mapped_column(default=10)
    monthly_usage: Mapped[int] = mapped_column(default=0)

    created_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(UTC))
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(UTC), onupdate=lambda: datetime.now(UTC))


class AIProcessingLogModel(Base):
    __tablename__ = "ai_processing_logs"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    tenant_id: Mapped[str] = mapped_column(String(36), ForeignKey("tenants.id", ondelete="CASCADE"), index=True)
    one_on_one_id: Mapped[str] = mapped_column(String(36), ForeignKey("one_on_ones.id", ondelete="CASCADE"), index=True)

    # Processing info
    provider: Mapped[str] = mapped_column(String(50))
    model_used: Mapped[str] = mapped_column(String(100))

    # Status: processing, completed, failed
    status: Mapped[str] = mapped_column(String(20), default="processing")

    # Input/Output
    input_type: Mapped[str] = mapped_column(String(50), default="transcription")
    input_source: Mapped[str] = mapped_column(String(500), default="")

    # AI Response
    ai_response: Mapped[str] = mapped_column(Text, default="")

    # Extracted data
    extracted_summary: Mapped[str] = mapped_column(Text, default="")
    extracted_next_steps: Mapped[str] = mapped_column(Text, default="")
    extracted_mood_score: Mapped[int] = mapped_column(default=0)
    extracted_risk_signal: Mapped[str] = mapped_column(String(20), default="NEUTRO")
    extracted_key_points: Mapped[str] = mapped_column(Text, default="[]")

    # Cost tracking
    input_tokens: Mapped[int] = mapped_column(default=0)
    output_tokens: Mapped[int] = mapped_column(default=0)
    estimated_cost: Mapped[float] = mapped_column(default=0.0)

    # Error handling
    error_message: Mapped[str] = mapped_column(Text, default="")
    retry_count: Mapped[int] = mapped_column(default=0)

    # User who triggered processing
    processed_by_user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(UTC), index=True)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(UTC), onupdate=lambda: datetime.now(UTC))
