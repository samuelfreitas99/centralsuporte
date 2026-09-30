"""remove_file_path_and_add_deleted_at_to_attachments

Revision ID: 253c127af363
Revises: db576bdfff35
Create Date: 2026-09-30 02:28:35.909219

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '253c127af363'
down_revision: Union[str, None] = 'db576bdfff35'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Add deleted_at column for soft delete support
    op.add_column('attachments', sa.Column('deleted_at', sa.DateTime(timezone=True), nullable=True))
    op.create_index(op.f('ix_attachments_deleted_at'), 'attachments', ['deleted_at'], unique=False)

    # 2. Data migration: ensure all stored_filename values are populated from file_path if missing
    conn = op.get_bind()
    conn.execute(sa.text("""
        UPDATE attachments
        SET stored_filename = regexp_replace(file_path, '^.*/', '')
        WHERE (stored_filename IS NULL OR stored_filename = '')
          AND file_path IS NOT NULL
    """))

    # 3. Drop file_path column from attachments table
    op.drop_column('attachments', 'file_path')


def downgrade() -> None:
    # 1. Re-add file_path column as nullable
    op.add_column('attachments', sa.Column('file_path', sa.String(length=512), nullable=True))

    # 2. Re-populate file_path using stored_filename
    conn = op.get_bind()
    conn.execute(sa.text("""
        UPDATE attachments
        SET file_path = '/app/uploads/' || stored_filename
        WHERE stored_filename IS NOT NULL
    """))

    # 3. Enforce NOT NULL on file_path
    op.alter_column('attachments', 'file_path', existing_type=sa.String(length=512), nullable=False)

    # 4. Drop index and deleted_at column
    op.drop_index(op.f('ix_attachments_deleted_at'), table_name='attachments')
    op.drop_column('attachments', 'deleted_at')
