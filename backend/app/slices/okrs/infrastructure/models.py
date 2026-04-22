from datetime import UTC, datetime
import uuid

from sqlalchemy import DateTime, Float, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class OkrObjectiveModel(Base):
    __tablename__ = "okr_objectives"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    tenant_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("tenants.id", ondelete="CASCADE"), index=True
    )
    collaborator_id: Mapped[str | None] = mapped_column(
        String(36),
        ForeignKey("collaborators.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str] = mapped_column(String(1000), default="")
    cycle: Mapped[str] = mapped_column(String(20), default="2026_H1", index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(UTC))
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=lambda: datetime.now(UTC), onupdate=lambda: datetime.now(UTC)
    )


class OkrKeyResultModel(Base):
    __tablename__ = "okr_key_results"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    tenant_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("tenants.id", ondelete="CASCADE"), index=True
    )
    objective_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("okr_objectives.id", ondelete="CASCADE"), index=True
    )
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    metric_type: Mapped[str] = mapped_column(String(16), default="PERCENT")
    unit: Mapped[str] = mapped_column(String(32), default="")
    initial_value: Mapped[float] = mapped_column(Float, default=0.0)
    target_value: Mapped[float] = mapped_column(Float, default=100.0)
    current_value: Mapped[float] = mapped_column(Float, default=0.0)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(UTC))
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=lambda: datetime.now(UTC), onupdate=lambda: datetime.now(UTC)
    )
