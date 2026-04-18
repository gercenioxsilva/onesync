import uuid
from datetime import UTC, datetime

from sqlalchemy import DateTime, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class PdiModel(Base):
    __tablename__ = "pdis"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    tenant_id: Mapped[str] = mapped_column(String(36), ForeignKey("tenants.id", ondelete="CASCADE"), index=True)
    collaborator_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("collaborators.id", ondelete="CASCADE"),
        index=True,
    )
    cycle: Mapped[str] = mapped_column(String(16), default="2026_H1")
    objective: Mapped[str] = mapped_column(String(500), default="")
    progress: Mapped[int] = mapped_column(Integer, default=0)
    status: Mapped[str] = mapped_column(String(24), default="NAO_INICIADO")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(UTC))
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(UTC), onupdate=lambda: datetime.now(UTC))
