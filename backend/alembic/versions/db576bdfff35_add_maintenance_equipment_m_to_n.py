"""add_maintenance_equipment_m_to_n

Revision ID: db576bdfff35
Revises: c1a2f3e4d5b6
Create Date: 2026-09-29 18:33:37.029568

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'db576bdfff35'
down_revision: Union[str, None] = 'c1a2f3e4d5b6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Create maintenance_equipment table for N:N relation
    op.create_table(
        'maintenance_equipment',
        sa.Column('maintenance_id', sa.Integer(), nullable=False),
        sa.Column('equipment_id', sa.Integer(), nullable=False),
        sa.Column('added_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(['maintenance_id'], ['maintenance_records.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['equipment_id'], ['equipment.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('maintenance_id', 'equipment_id')
    )
    op.create_index(op.f('ix_maintenance_equipment_maintenance_id'), 'maintenance_equipment', ['maintenance_id'], unique=False)
    op.create_index(op.f('ix_maintenance_equipment_equipment_id'), 'maintenance_equipment', ['equipment_id'], unique=False)

    # 2. Migrate existing maintenance_records.equipment_id into maintenance_equipment
    conn = op.get_bind()
    conn.execute(sa.text("""
        INSERT INTO maintenance_equipment (maintenance_id, equipment_id, added_at)
        SELECT id, equipment_id, created_at
        FROM maintenance_records
        WHERE equipment_id IS NOT NULL
        ON CONFLICT (maintenance_id, equipment_id) DO NOTHING
    """))

    # 3. Make equipment_id nullable on maintenance_records for backward compatibility
    op.alter_column('maintenance_records', 'equipment_id', existing_type=sa.Integer(), nullable=True)


def downgrade() -> None:
    # Re-populate equipment_id if any are null
    conn = op.get_bind()
    conn.execute(sa.text("""
        UPDATE maintenance_records m
        SET equipment_id = sub.min_eq
        FROM (
            SELECT maintenance_id, MIN(equipment_id) as min_eq
            FROM maintenance_equipment
            GROUP BY maintenance_id
        ) sub
        WHERE m.id = sub.maintenance_id AND m.equipment_id IS NULL
    """))

    op.alter_column('maintenance_records', 'equipment_id', existing_type=sa.Integer(), nullable=False)
    op.drop_index(op.f('ix_maintenance_equipment_equipment_id'), table_name='maintenance_equipment')
    op.drop_index(op.f('ix_maintenance_equipment_maintenance_id'), table_name='maintenance_equipment')
    op.drop_table('maintenance_equipment')
