"""web push: push_subscriptions e reminders.pushed_at

Revision ID: b8d2f3a4c5e6
Revises: a7c1e2d3f4b5
Create Date: 2026-10-03

"""
from alembic import op
import sqlalchemy as sa

revision = "b8d2f3a4c5e6"
down_revision = "a7c1e2d3f4b5"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("reminders", sa.Column("pushed_at", sa.DateTime(timezone=True), nullable=True))
    # Lembretes que já existiam não viram push retroativo.
    op.execute("UPDATE reminders SET pushed_at = now() WHERE remind_at <= now()")
    op.create_table(
        "push_subscriptions",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("endpoint", sa.Text(), nullable=False),
        sa.Column("p256dh", sa.String(length=255), nullable=False),
        sa.Column("auth", sa.String(length=255), nullable=False),
        sa.Column("user_agent", sa.String(length=255), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.UniqueConstraint("endpoint", name="uq_push_subscriptions_endpoint"),
    )
    op.create_index("ix_push_subscriptions_id", "push_subscriptions", ["id"])
    op.create_index("ix_push_subscriptions_user_id", "push_subscriptions", ["user_id"])


def downgrade() -> None:
    op.drop_index("ix_push_subscriptions_user_id", table_name="push_subscriptions")
    op.drop_index("ix_push_subscriptions_id", table_name="push_subscriptions")
    op.drop_table("push_subscriptions")
    op.drop_column("reminders", "pushed_at")
