"""add source to reminders (manual | automacao)

Revision ID: a7c1e2d3f4b5
Revises: 7192eafe6bf3
Create Date: 2026-10-03

"""
from alembic import op
import sqlalchemy as sa

revision = "a7c1e2d3f4b5"
down_revision = "7192eafe6bf3"
branch_labels = None
depends_on = None

# Prefixos usados pelas regras de automação antes da existência da coluna.
AUTOMATION_PREFIXES = ("🚨 Tarefa Atrasada:", "⏰ Prazo Próximo:", "🔧 Manutenção Programada:", "⚠️ Ativo Crítico:")


def upgrade() -> None:
    op.add_column(
        "reminders",
        sa.Column("source", sa.String(length=20), nullable=False, server_default="manual"),
    )
    op.create_index("ix_reminders_source", "reminders", ["source"])
    reminders = sa.table("reminders", sa.column("title", sa.String), sa.column("source", sa.String))
    op.execute(
        reminders.update()
        .where(sa.or_(*[reminders.c.title.startswith(p) for p in AUTOMATION_PREFIXES]))
        .values(source="automacao")
    )


def downgrade() -> None:
    op.drop_index("ix_reminders_source", table_name="reminders")
    op.drop_column("reminders", "source")
