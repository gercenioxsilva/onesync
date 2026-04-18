from datetime import UTC, date, datetime
import uuid

from sqlalchemy import Date, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class OneOnOneModel(Base):
    __tablename__ = "one_on_ones"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    tenant_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("tenants.id", ondelete="CASCADE"), index=True
    )
    collaborator_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("collaborators.id", ondelete="CASCADE"),
        index=True,
    )
    meeting_date: Mapped[date] = mapped_column(Date, nullable=False)
    mood_score: Mapped[int] = mapped_column(Integer, nullable=True)
    summary: Mapped[str] = mapped_column(Text, default="")
    next_steps: Mapped[str] = mapped_column(Text, default="")
    next_meeting_date: Mapped[date] = mapped_column(Date, nullable=True)
    risk_signal: Mapped[str] = mapped_column(String(16), default="NEUTRO")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(UTC))
