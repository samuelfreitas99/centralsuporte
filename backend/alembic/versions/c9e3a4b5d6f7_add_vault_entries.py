"""cofre de senhas: vault_entries

Revision ID: c9e3a4b5d6f7
Revises: b8d2f3a4c5e6
Create Date: 2026-10-04

"""
from alembic import op
import sqlalchemy as sa

revision = "c9e3a4b5d6f7"
down_revision = "b8d2f3a4c5e6"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "vault_entries",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("title", sa.String(length=150), nullable=False),
        sa.Column("system_url", sa.String(length=500), nullable=True),
        sa.Column("category", sa.String(length=50), nullable=True),
        sa.Column("visibility", sa.String(length=20), nullable=False, server_default="equipe"),
        sa.Column("owner_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("store_id", sa.Integer(), sa.ForeignKey("stores.id", ondelete="SET NULL"), nullable=True),
        sa.Column("equipment_id", sa.Integer(), sa.ForeignKey("equipment.id", ondelete="SET NULL"), nullable=True),
        sa.Column("nonce", sa.LargeBinary(), nullable=False),
        sa.Column("ciphertext", sa.LargeBinary(), nullable=False),
        sa.Column("auth_tag", sa.LargeBinary(), nullable=False),
        sa.Column("key_version", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    for col in ("id", "visibility", "owner_id", "store_id", "equipment_id"):
        op.create_index(f"ix_vault_entries_{col}", "vault_entries", [col])


def downgrade() -> None:
    for col in ("id", "visibility", "owner_id", "store_id", "equipment_id"):
        op.drop_index(f"ix_vault_entries_{col}", table_name="vault_entries")
    op.drop_table("vault_entries")
