"""add collaborator email

Revision ID: 0002_collaborator_email
Revises: 0001_multi_tenant_rbac
Create Date: 2026-04-16 00:30:00.000000

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "0002_collaborator_email"
down_revision: Union[str, None] = "0001_multi_tenant_rbac"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "collaborators",
        sa.Column("email", sa.String(length=255), nullable=False, server_default=""),
    )


def downgrade() -> None:
    op.drop_column("collaborators", "email")
