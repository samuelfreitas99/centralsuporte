import os
import logging
from sqlalchemy.orm import Session
from app.models import Role, Permission, User
from app.auth import get_password_hash

logger = logging.getLogger(__name__)

INITIAL_PERMISSIONS = [
    {"name": "users:read", "description": "Visualizar usuários e perfis"},
    {"name": "users:write", "description": "Criar, editar e desativar usuários"},
    {"name": "roles:read", "description": "Visualizar perfis e permissões"},
    {"name": "knowledge:read", "description": "Consultar base de conhecimento"},
    {"name": "knowledge:write", "description": "Criar e editar artigos de conhecimento"},
    {"name": "attendance:read", "description": "Visualizar atendimentos internos"},
    {"name": "attendance:write", "description": "Registrar atendimentos internos"},
    {"name": "equipment:read", "description": "Visualizar inventário de equipamentos"},
    {"name": "equipment:write", "description": "Gerenciar inventário de equipamentos"},
    {"name": "tasks:read", "description": "Visualizar tarefas e checklists"},
    {"name": "tasks:write", "description": "Criar e atualizar tarefas e checklists"},
]

ROLE_PERMISSIONS_MAP = {
    "Administrador": [p["name"] for p in INITIAL_PERMISSIONS],
    "Gestor": [
        "users:read", "roles:read", "knowledge:read", "knowledge:write",
        "attendance:read", "attendance:write", "equipment:read", "equipment:write",
        "tasks:read", "tasks:write"
    ],
    "Técnico": [
        "knowledge:read", "knowledge:write", "attendance:read", "attendance:write",
        "equipment:read", "equipment:write", "tasks:read", "tasks:write"
    ],
    "Consulta": [
        "knowledge:read", "attendance:read", "equipment:read", "tasks:read"
    ]
}

def init_db_data(db: Session):
    # 1. Seed Permissions
    permission_objs = {}
    for p_data in INITIAL_PERMISSIONS:
        perm = db.query(Permission).filter(Permission.name == p_data["name"]).first()
        if not perm:
            perm = Permission(name=p_data["name"], description=p_data["description"])
            db.add(perm)
            db.flush()
        permission_objs[p_data["name"]] = perm

    # 2. Seed Roles
    for role_name, perm_names in ROLE_PERMISSIONS_MAP.items():
        role = db.query(Role).filter(Role.name == role_name).first()
        if not role:
            role = Role(name=role_name, description=f"Perfil de {role_name}")
            db.add(role)
            db.flush()
        
        # Sync permissions
        current_perms = {p.name for p in role.permissions}
        for p_name in perm_names:
            if p_name not in current_perms and p_name in permission_objs:
                role.permissions.append(permission_objs[p_name])

    # 3. Seed Default Admin User
    admin_role = db.query(Role).filter(Role.name == "Administrador").first()
    admin_user = db.query(User).filter(User.username == "admin").first()
    if not admin_user:
        default_pwd = os.environ.get("DEFAULT_ADMIN_PASSWORD", "admin123")
        admin_user = User(
            username="admin",
            email="admin@centralsuporte.local",
            hashed_password=get_password_hash(default_pwd),
            is_active=True,
            role_id=admin_role.id if admin_role else None
        )
        db.add(admin_user)
        logger.info("Default admin user created: admin")

    db.commit()
