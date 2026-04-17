"""multi tenant + users + rbac base

Revision ID: 0001_multi_tenant_rbac
Revises:
Create Date: 2026-04-16 00:00:00.000000

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "0001_multi_tenant_rbac"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


BOOTSTRAP_TENANT_ID = "11111111-1111-1111-1111-111111111111"


def upgrade() -> None:
    op.create_table(
        "tenants",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("name", sa.String(length=160), nullable=False),
        sa.Column("cnpj", sa.String(length=18), nullable=False),
        sa.Column("email", sa.String(length=255), nullable=False),
        sa.Column("address", sa.String(length=255), nullable=False),
        sa.Column("phone", sa.String(length=32), nullable=False),
        sa.Column("collaborator_quota", sa.Integer(), nullable=False),
        sa.Column("plan_type", sa.String(length=24), nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_tenants_cnpj", "tenants", ["cnpj"], unique=True)

    op.create_table(
        "users",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("tenant_id", sa.String(length=36), nullable=False),
        sa.Column("full_name", sa.String(length=120), nullable=False),
        sa.Column("email", sa.String(length=255), nullable=False),
        sa.Column("password_hash", sa.String(length=255), nullable=False),
        sa.Column("google_sub", sa.String(length=255), nullable=False),
        sa.Column("role", sa.String(length=24), nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["tenant_id"], ["tenants.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("tenant_id", "email", name="uq_users_tenant_email"),
    )
    op.create_index("ix_users_email", "users", ["email"], unique=False)
    op.create_index("ix_users_google_sub", "users", ["google_sub"], unique=False)
    op.create_index("ix_users_tenant_id", "users", ["tenant_id"], unique=False)

    op.add_column("collaborators", sa.Column("tenant_id", sa.String(length=36), nullable=True))
    op.add_column("collaborators", sa.Column("squad", sa.String(length=120), nullable=False, server_default=""))
    op.add_column("collaborators", sa.Column("tech_lead_id", sa.String(length=36), nullable=True))
    op.create_index("ix_collaborators_tenant_id", "collaborators", ["tenant_id"], unique=False)
    op.create_index("ix_collaborators_tech_lead_id", "collaborators", ["tech_lead_id"], unique=False)

    op.add_column("one_on_ones", sa.Column("tenant_id", sa.String(length=36), nullable=True))
    op.create_index("ix_one_on_ones_tenant_id", "one_on_ones", ["tenant_id"], unique=False)

    op.add_column("pdis", sa.Column("tenant_id", sa.String(length=36), nullable=True))
    op.create_index("ix_pdis_tenant_id", "pdis", ["tenant_id"], unique=False)

    op.execute(
        sa.text(
            """
            INSERT INTO tenants (id, name, cnpj, email, address, phone, collaborator_quota, plan_type, is_active, created_at, updated_at)
            VALUES (:id, 'Empresa Demo', '00000000000191', 'contato@empresa-demo.com', 'Endereço não informado', '+55 11 99999-9999', 25, 'FREE', true, now(), now())
            """
        ),
        {"id": BOOTSTRAP_TENANT_ID},
    )

    op.execute(
        sa.text(
            "UPDATE collaborators SET tenant_id = :tenant_id WHERE tenant_id IS NULL"
        ),
        {"tenant_id": BOOTSTRAP_TENANT_ID},
    )
    op.execute(
        sa.text(
            "UPDATE one_on_ones SET tenant_id = :tenant_id WHERE tenant_id IS NULL"
        ),
        {"tenant_id": BOOTSTRAP_TENANT_ID},
    )
    op.execute(
        sa.text(
            "UPDATE pdis SET tenant_id = :tenant_id WHERE tenant_id IS NULL"
        ),
        {"tenant_id": BOOTSTRAP_TENANT_ID},
    )

    op.alter_column("collaborators", "tenant_id", nullable=False)
    op.alter_column("one_on_ones", "tenant_id", nullable=False)
    op.alter_column("pdis", "tenant_id", nullable=False)

    op.create_foreign_key(
        "fk_collaborators_tenant",
        "collaborators",
        "tenants",
        ["tenant_id"],
        ["id"],
        ondelete="CASCADE",
    )
    op.create_foreign_key(
        "fk_collaborators_tech_lead",
        "collaborators",
        "collaborators",
        ["tech_lead_id"],
        ["id"],
        ondelete="SET NULL",
    )
    op.create_foreign_key(
        "fk_one_on_ones_tenant",
        "one_on_ones",
        "tenants",
        ["tenant_id"],
        ["id"],
        ondelete="CASCADE",
    )
    op.create_foreign_key(
        "fk_pdis_tenant",
        "pdis",
        "tenants",
        ["tenant_id"],
        ["id"],
        ondelete="CASCADE",
    )


def downgrade() -> None:
    op.drop_constraint("fk_pdis_tenant", "pdis", type_="foreignkey")
    op.drop_constraint("fk_one_on_ones_tenant", "one_on_ones", type_="foreignkey")
    op.drop_constraint("fk_collaborators_tech_lead", "collaborators", type_="foreignkey")
    op.drop_constraint("fk_collaborators_tenant", "collaborators", type_="foreignkey")

    op.drop_index("ix_pdis_tenant_id", table_name="pdis")
    op.drop_column("pdis", "tenant_id")

    op.drop_index("ix_one_on_ones_tenant_id", table_name="one_on_ones")
    op.drop_column("one_on_ones", "tenant_id")

    op.drop_index("ix_collaborators_tech_lead_id", table_name="collaborators")
    op.drop_index("ix_collaborators_tenant_id", table_name="collaborators")
    op.drop_column("collaborators", "tech_lead_id")
    op.drop_column("collaborators", "squad")
    op.drop_column("collaborators", "tenant_id")

    op.drop_index("ix_users_tenant_id", table_name="users")
    op.drop_index("ix_users_google_sub", table_name="users")
    op.drop_index("ix_users_email", table_name="users")
    op.drop_table("users")

    op.drop_index("ix_tenants_cnpj", table_name="tenants")
    op.drop_table("tenants")
