"""compras: purchase_requests e purchase_quotes

Revision ID: d1f4b5c6e7a8
Revises: c9e3a4b5d6f7
Create Date: 2026-10-04

"""
from alembic import op
import sqlalchemy as sa

revision = "d1f4b5c6e7a8"
down_revision = "c9e3a4b5d6f7"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "purchase_requests",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("title", sa.String(length=200), nullable=False),
        sa.Column("reason", sa.Text(), nullable=True),
        sa.Column("quantity", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("status", sa.String(length=30), nullable=False, server_default="aguardando_aprovacao"),
        sa.Column("requester_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("approver_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("chosen_quote_id", sa.Integer(), nullable=True),
        sa.Column("decision_note", sa.Text(), nullable=True),
        sa.Column("decided_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("received_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("stock_item_id", sa.Integer(), sa.ForeignKey("stock_items.id", ondelete="SET NULL"), nullable=True),
        sa.Column("project_id", sa.Integer(), sa.ForeignKey("projects.id", ondelete="SET NULL"), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    for col in ("id", "status", "requester_id", "stock_item_id", "project_id"):
        op.create_index(f"ix_purchase_requests_{col}", "purchase_requests", [col])
    op.create_table(
        "purchase_quotes",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("request_id", sa.Integer(), sa.ForeignKey("purchase_requests.id", ondelete="CASCADE"), nullable=False),
        sa.Column("supplier", sa.String(length=150), nullable=False),
        sa.Column("unit_price", sa.Float(), nullable=False),
        sa.Column("delivery_days", sa.Integer(), nullable=True),
        sa.Column("link", sa.String(length=500), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_purchase_quotes_id", "purchase_quotes", ["id"])
    op.create_index("ix_purchase_quotes_request_id", "purchase_quotes", ["request_id"])
    op.create_foreign_key(
        "fk_purchase_requests_chosen_quote", "purchase_requests", "purchase_quotes",
        ["chosen_quote_id"], ["id"], ondelete="SET NULL",
    )


def downgrade() -> None:
    op.drop_constraint("fk_purchase_requests_chosen_quote", "purchase_requests", type_="foreignkey")
    op.drop_index("ix_purchase_quotes_request_id", table_name="purchase_quotes")
    op.drop_index("ix_purchase_quotes_id", table_name="purchase_quotes")
    op.drop_table("purchase_quotes")
    for col in ("id", "status", "requester_id", "stock_item_id", "project_id"):
        op.drop_index(f"ix_purchase_requests_{col}", table_name="purchase_requests")
    op.drop_table("purchase_requests")
