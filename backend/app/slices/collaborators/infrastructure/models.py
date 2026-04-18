from datetime import UTC, datetime
import uuid

from sqlalchemy import DateTime, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class CollaboratorModel(Base):
    __tablename__ = "collaborators"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    tenant_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("tenants.id", ondelete="CASCADE"), index=True
    )
    name: Mapped[str] = mapped_column(String(120), nullable=False, index=True)
    email: Mapped[str] = mapped_column(String(255), default="")
    squad: Mapped[str] = mapped_column(String(120), default="")
    tech_lead_id: Mapped[str | None] = mapped_column(
        String(36),
        ForeignKey("collaborators.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    role: Mapped[str] = mapped_column(String(120), default="")
    focus: Mapped[str] = mapped_column(String(255), default="")
    risk: Mapped[str] = mapped_column(String(16), default="BAIXO")
    pdi_status: Mapped[str] = mapped_column(String(24), default="NO_PLANO")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(UTC))
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=lambda: datetime.now(UTC), onupdate=lambda: datetime.now(UTC)
    )
