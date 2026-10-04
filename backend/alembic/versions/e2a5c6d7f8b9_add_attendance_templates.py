"""modelos de atendimento

Revision ID: e2a5c6d7f8b9
Revises: d1f4b5c6e7a8
Create Date: 2026-10-04

"""
from alembic import op
import sqlalchemy as sa

revision = "e2a5c6d7f8b9"
down_revision = "d1f4b5c6e7a8"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "attendance_templates",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("name", sa.String(length=120), nullable=False, unique=True),
        sa.Column("title", sa.String(length=255), nullable=True),
        sa.Column("problem_description", sa.Text(), nullable=True),
        sa.Column("symptoms", sa.Text(), nullable=True),
        sa.Column("diagnosis", sa.Text(), nullable=True),
        sa.Column("cause", sa.Text(), nullable=True),
        sa.Column("solution", sa.Text(), nullable=True),
        sa.Column("commands_used", sa.Text(), nullable=True),
        sa.Column("created_by_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_attendance_templates_id", "attendance_templates", ["id"])


def downgrade() -> None:
    op.drop_index("ix_attendance_templates_id", table_name="attendance_templates")
    op.drop_table("attendance_templates")
