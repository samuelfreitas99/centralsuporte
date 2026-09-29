"""add_user_identity_and_user_roles

Revision ID: c1a2f3e4d5b6
Revises: b3cb0736f865
Create Date: 2026-09-29 10:40:00.000000

"""
from typing import Sequence, Union
import logging

from alembic import op
import sqlalchemy as sa


logger = logging.getLogger("alembic.runtime.migration")

# revision identifiers, used by Alembic.
revision: str = 'c1a2f3e4d5b6'
down_revision: Union[str, None] = 'b3cb0736f865'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Create user_roles table for M:N relation
    op.create_table(
        'user_roles',
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('role_id', sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(['role_id'], ['roles.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('user_id', 'role_id')
    )

    # 2. Add identity and profile columns to users
    op.add_column('users', sa.Column('full_name', sa.String(length=150), nullable=True))
    op.add_column('users', sa.Column('display_name', sa.String(length=100), nullable=True))
    op.add_column('users', sa.Column('avatar_url', sa.String(length=512), nullable=True))
    op.add_column('users', sa.Column('phone', sa.String(length=50), nullable=True))
    op.add_column('users', sa.Column('job_title', sa.String(length=100), nullable=True))
    op.add_column('users', sa.Column('department_id', sa.Integer(), nullable=True))
    op.add_column('users', sa.Column('last_login_at', sa.DateTime(timezone=True), nullable=True))
    op.add_column('users', sa.Column('preferences', sa.Text(), nullable=True))

    op.create_index(op.f('ix_users_department_id'), 'users', ['department_id'], unique=False)
    op.create_foreign_key('fk_users_department_id', 'users', 'departments', ['department_id'], ['id'], ondelete='SET NULL')

    # 3. Data Migration and Validation from users.role_id to user_roles
    conn = op.get_bind()

    total_users = conn.execute(sa.text("SELECT COUNT(*) FROM users")).scalar()
    users_with_role = conn.execute(sa.text("SELECT COUNT(*) FROM users WHERE role_id IS NOT NULL")).scalar()
    users_without_role = conn.execute(sa.text("SELECT COUNT(*) FROM users WHERE role_id IS NULL")).scalar()
    invalid_roles = conn.execute(sa.text("""
        SELECT COUNT(*) FROM users u 
        WHERE u.role_id IS NOT NULL 
        AND NOT EXISTS (SELECT 1 FROM roles r WHERE r.id = u.role_id)
    """)).scalar()

    logger.info(
        f"[RBAC Migration] Total users: {total_users}, With role: {users_with_role}, "
        f"Without role: {users_without_role}, Invalid role_id references: {invalid_roles}"
    )

    if invalid_roles > 0:
        logger.warning(f"[RBAC Migration] Detected {invalid_roles} users with invalid role_id! They will be skipped.")

    # Populate user_roles
    conn.execute(sa.text("""
        INSERT INTO user_roles (user_id, role_id)
        SELECT u.id, u.role_id
        FROM users u
        JOIN roles r ON u.role_id = r.id
        WHERE u.role_id IS NOT NULL
        ON CONFLICT DO NOTHING
    """))

    migrated_count = conn.execute(sa.text("SELECT COUNT(*) FROM user_roles")).scalar()
    logger.info(f"[RBAC Migration] Successfully migrated {migrated_count} user-role relationships into user_roles.")

    # 4. Safely drop old role_id column and foreign key constraint
    op.drop_constraint('users_role_id_fkey', 'users', type_='foreignkey')
    op.drop_column('users', 'role_id')


def downgrade() -> None:
    # 1. Restore role_id column
    op.add_column('users', sa.Column('role_id', sa.Integer(), nullable=True))
    op.create_foreign_key('users_role_id_fkey', 'users', 'roles', ['role_id'], ['id'])

    # 2. Backfill role_id from user_roles (primary role)
    conn = op.get_bind()
    conn.execute(sa.text("""
        UPDATE users u
        SET role_id = (
            SELECT ur.role_id 
            FROM user_roles ur 
            WHERE ur.user_id = u.id 
            ORDER BY ur.role_id ASC 
            LIMIT 1
        )
    """))

    # 3. Drop identity columns
    op.drop_constraint('fk_users_department_id', 'users', type_='foreignkey')
    op.drop_index(op.f('ix_users_department_id'), table_name='users')
    op.drop_column('users', 'preferences')
    op.drop_column('users', 'last_login_at')
    op.drop_column('users', 'department_id')
    op.drop_column('users', 'job_title')
    op.drop_column('users', 'phone')
    op.drop_column('users', 'avatar_url')
    op.drop_column('users', 'display_name')
    op.drop_column('users', 'full_name')

    # 4. Drop user_roles table
    op.drop_table('user_roles')
