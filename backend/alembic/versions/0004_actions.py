"""add actions table

Revision ID: 0004_actions
Revises: 0003_ai_config
Create Date: 2026-04-17 12:00:00.000000

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "0004_actions"
down_revision: Union[str, None] = "0003_ai_config"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "actions",
        sa.Column("id", sa.String(36), nullable=False),
        sa.Column("tenant_id", sa.String(36), nullable=False),
        sa.Column("collaborator_id", sa.String(36), nullable=True),
        sa.Column("title", sa.String(255), nullable=False),
        sa.Column("owner", sa.String(120), nullable=False, server_default=""),
        sa.Column("due_date", sa.String(10), nullable=False, server_default=""),
        sa.Column("category", sa.String(64), nullable=False, server_default=""),
        sa.Column("status", sa.String(24), nullable=False, server_default="NAO_INICIADO"),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["tenant_id"], ["tenants.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["collaborator_id"], ["collaborators.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_actions_tenant_id", "actions", ["tenant_id"])
    op.create_index("ix_actions_collaborator_id", "actions", ["collaborator_id"])


def downgrade() -> None:
    op.drop_index("ix_actions_collaborator_id", table_name="actions")
    op.drop_index("ix_actions_tenant_id", table_name="actions")
    op.drop_table("actions")
