"""add ai config and processing logs tables

Revision ID: 0003_ai_config
Revises: 0002_collaborator_email
Create Date: 2026-04-17 10:00:00.000000

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "0003_ai_config"
down_revision: Union[str, None] = "0002_collaborator_email"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create ai_configs table
    op.create_table(
        "ai_configs",
        sa.Column("id", sa.String(36), nullable=False),
        sa.Column("tenant_id", sa.String(36), nullable=False),
        sa.Column("provider", sa.String(50), nullable=False, server_default="openai"),
        sa.Column("api_key", sa.String(500), nullable=False, server_default=""),
        sa.Column("model_name", sa.String(100), nullable=False, server_default="gpt-4-turbo"),
        sa.Column("auto_process_enabled", sa.Boolean(), nullable=False, server_default="0"),
        sa.Column("prompt_template", sa.Text(), nullable=False),
        sa.Column("temperature", sa.Float(), nullable=False, server_default="0.7"),
        sa.Column("max_tokens", sa.Integer(), nullable=False, server_default="1000"),
        sa.Column("monthly_quota", sa.Integer(), nullable=False, server_default="10"),
        sa.Column("monthly_usage", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["tenant_id"], ["tenants.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("tenant_id", name="uq_ai_configs_tenant_id")
    )
    op.create_index("ix_ai_configs_tenant_id", "ai_configs", ["tenant_id"])
    
    # Create ai_processing_logs table
    op.create_table(
        "ai_processing_logs",
        sa.Column("id", sa.String(36), nullable=False),
        sa.Column("tenant_id", sa.String(36), nullable=False),
        sa.Column("one_on_one_id", sa.String(36), nullable=False),
        sa.Column("provider", sa.String(50), nullable=False),
        sa.Column("model_used", sa.String(100), nullable=False),
        sa.Column("status", sa.String(20), nullable=False, server_default="processing"),
        sa.Column("input_type", sa.String(50), nullable=False, server_default="transcription"),
        sa.Column("input_source", sa.String(500), nullable=False, server_default=""),
        sa.Column("ai_response", sa.Text(), nullable=False, server_default=""),
        sa.Column("extracted_summary", sa.Text(), nullable=False, server_default=""),
        sa.Column("extracted_next_steps", sa.Text(), nullable=False, server_default=""),
        sa.Column("extracted_mood_score", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("extracted_risk_signal", sa.String(20), nullable=False, server_default="NEUTRO"),
        sa.Column("extracted_key_points", sa.Text(), nullable=False, server_default="[]"),
        sa.Column("input_tokens", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("output_tokens", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("estimated_cost", sa.Float(), nullable=False, server_default="0.0"),
        sa.Column("error_message", sa.Text(), nullable=False, server_default=""),
        sa.Column("retry_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("processed_by_user_id", sa.String(36), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["tenant_id"], ["tenants.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["one_on_one_id"], ["one_on_ones.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["processed_by_user_id"], ["users.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id")
    )
    op.create_index("ix_ai_processing_logs_tenant_id", "ai_processing_logs", ["tenant_id"])
    op.create_index("ix_ai_processing_logs_one_on_one_id", "ai_processing_logs", ["one_on_one_id"])
    op.create_index("ix_ai_processing_logs_created_at", "ai_processing_logs", ["created_at"])


def downgrade() -> None:
    op.drop_index("ix_ai_processing_logs_created_at", table_name="ai_processing_logs")
    op.drop_index("ix_ai_processing_logs_one_on_one_id", table_name="ai_processing_logs")
    op.drop_index("ix_ai_processing_logs_tenant_id", table_name="ai_processing_logs")
    op.drop_table("ai_processing_logs")
    
    op.drop_index("ix_ai_configs_tenant_id", table_name="ai_configs")
    op.drop_table("ai_configs")
