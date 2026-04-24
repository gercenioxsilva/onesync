"""add google_refresh_token to users

Revision ID: 0005_google_refresh_token
Revises: 0004_actions
Create Date: 2026-04-23 12:00:00.000000

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "0005_google_refresh_token"
down_revision: Union[str, None] = "0004_actions"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "users",
        sa.Column("google_refresh_token", sa.String(512), nullable=False, server_default=""),
    )


def downgrade() -> None:
    op.drop_column("users", "google_refresh_token")
