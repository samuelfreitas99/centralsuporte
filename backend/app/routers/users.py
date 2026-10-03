from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Request, status, Query
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import (
    User,
    Role,
    Department,
    Task,
    task_assignments,
    Attendance,
    Project,
    MaintenanceRecord,
    KnowledgeArticle,
    Permission,
)
from app.schemas import (
    PasswordChangeRequest,
    UserCreate,
    UserUpdate,
    UserProfileSelfUpdate,
    UserProfileResponse,
    UserResponse,
    UserStatsResponse,
    RoleResponse,
    RoleCreate,
    RoleUpdate,
    PermissionResponse,
)
from app.auth import get_password_hash, require_permission, get_current_active_user, verify_password
from app.services.audit import record_audit_log

router = APIRouter(tags=["Gestão de Usuários"])

def check_last_admin(db: Session, user: User):
    is_admin = any(r.name == 'Administrador' for r in user.roles)
    if not is_admin:
        return
    admin_count = db.query(User).join(User.roles).filter(Role.name == 'Administrador', User.is_active == True).count()
    if admin_count <= 1:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Não é possível alterar as permissões, desativar ou remover o último administrador ativo do sistema."
        )


@router.get("/users", response_model=List[UserResponse])
def list_users(
    skip: int = 0,
    limit: int = 100,
    is_active: Optional[bool] = Query(None, description="Filtrar por status ativo/inativo"),
    db: Session = Depends(get_db),
    _: User = Depends(require_permission("users:read")),
):
    query = db.query(User)
    if is_active is not None:
        query = query.filter(User.is_active == is_active)
    users = query.offset(skip).limit(limit).all()
    return users


@router.post("/users", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def create_user(
    user_in: UserCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("users:write")),
):
    # Check if username already exists
    if db.query(User).filter(User.username == user_in.username).first():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Nome de usuário já cadastrado",
        )
    # Check if email already exists
    if db.query(User).filter(User.email == user_in.email).first():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="E-mail já cadastrado",
        )

    # Validate department if provided
    department_name = None
    if user_in.department_id is not None:
        dept = db.query(Department).filter(Department.id == user_in.department_id).first()
        if not dept:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Departamento com ID {user_in.department_id} não encontrado",
            )
        if dept.status == "inativa":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Departamento selecionado está inativo",
            )
        department_name = dept.name

    # Validate and collect roles
    target_role_ids = []
    if user_in.role_ids:
        target_role_ids = user_in.role_ids
    elif user_in.role_id is not None:
        target_role_ids = [user_in.role_id]

    roles_to_assign = []
    for r_id in target_role_ids:
        role = db.query(Role).filter(Role.id == r_id).first()
        if not role:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Perfil com ID {r_id} não encontrado",
            )
        roles_to_assign.append(role)

    new_user = User(
        username=user_in.username,
        email=user_in.email,
        hashed_password=get_password_hash(user_in.password),
        is_active=user_in.is_active,
        full_name=user_in.full_name,
        display_name=user_in.display_name,
        avatar_url=user_in.avatar_url,
        phone=user_in.phone,
        job_title=user_in.job_title,
        department_id=user_in.department_id,
        preferences=user_in.preferences,
    )
    new_user.roles = roles_to_assign
    db.add(new_user)
    db.flush()

    record_audit_log(
        db=db,
        action="CREATE",
        entity_type="user",
        entity_id=new_user.id,
        user=current_user,
        details={
            "username": new_user.username,
            "email": new_user.email,
            "roles": [r.name for r in roles_to_assign],
            "department": department_name,
            "job_title": new_user.job_title,
            "is_active": new_user.is_active,
        },
    )

    db.commit()
    db.refresh(new_user)
    return new_user


@router.get("/users/me/profile", response_model=UserProfileResponse)
def get_my_profile(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """Retrieve full profile of currently authenticated user (including private fields)."""
    return current_user


@router.put("/users/me/profile", response_model=UserProfileResponse)
def update_my_profile(
    profile_in: UserProfileSelfUpdate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """
    Allows the authenticated user to update their own display settings.
    Administrative fields (role, job_title, department_id, is_active) cannot be altered here.
    """
    updated_fields = {}
    if profile_in.display_name is not None:
        current_user.display_name = profile_in.display_name
        updated_fields["display_name"] = profile_in.display_name

    if profile_in.avatar_url is not None:
        current_user.avatar_url = profile_in.avatar_url
        updated_fields["avatar_url"] = profile_in.avatar_url

    if profile_in.phone is not None:
        current_user.phone = profile_in.phone
        updated_fields["phone"] = profile_in.phone

    if profile_in.preferences is not None:
        current_user.preferences = profile_in.preferences
        updated_fields["preferences_updated"] = True

    record_audit_log(
        db=db,
        action="UPDATE",
        entity_type="user",
        entity_id=current_user.id,
        user=current_user,
        details={"self_update": True, "updated_fields": updated_fields},
    )

    db.commit()
    db.refresh(current_user)
    return current_user


@router.post("/users/me/password", status_code=status.HTTP_204_NO_CONTENT)
def change_my_password(
    payload: PasswordChangeRequest,
    request: Request,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """Qualquer usuário ativo pode trocar a própria senha informando a atual."""
    if not verify_password(payload.current_password, current_user.hashed_password):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Senha atual incorreta")
    if payload.new_password == payload.current_password:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="A nova senha deve ser diferente da atual")

    current_user.hashed_password = get_password_hash(payload.new_password)
    record_audit_log(
        db=db,
        action="PASSWORD_CHANGED",
        entity_type="user",
        entity_id=current_user.id,
        user=current_user,
        details={"self_service": True},
        ip_address=request.client.host if request.client else None,
        user_agent=request.headers.get("user-agent"),
    )
    db.commit()


@router.get("/users/{user_id}/profile", response_model=UserProfileResponse)
def get_user_profile(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """
    Retrieve profile of any user.
    If the caller is the user themselves or holds administrative/managerial privileges,
    private fields (email, phone, preferences) are disclosed.
    Otherwise, private fields are masked.
    """
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Usuário não encontrado",
        )

    # Check permission for private data: self or users with users:read / admin
    can_view_private = (
        current_user.id == user_id
        or current_user.has_role("Administrador", "Gestor")
        or current_user.has_permission("users:read")
    )

    profile_data = {
        "id": user.id,
        "username": user.username,
        "full_name": user.full_name,
        "display_name": user.display_name,
        "avatar_url": user.avatar_url,
        "job_title": user.job_title,
        "department_id": user.department_id,
        "department": user.department,
        "is_active": user.is_active,
        "last_login_at": user.last_login_at,
        "roles": user.roles,
        "email": user.email if can_view_private else None,
        "phone": user.phone if can_view_private else None,
        "preferences": user.preferences if can_view_private else None,
    }

    return profile_data


@router.get("/users/{user_id}/stats", response_model=UserStatsResponse)
def get_user_stats(
    user_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_active_user),
):
    """
    Returns aggregated operational metrics for a user using efficient SQL aggregates.
    """
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Usuário não encontrado",
        )

    # 1. Open tasks assigned to user
    open_tasks = (
        db.query(func.count(Task.id))
        .join(task_assignments, Task.id == task_assignments.c.task_id)
        .filter(
            task_assignments.c.user_id == user_id,
            Task.status.in_(["pendente", "em_andamento"]),
        )
        .scalar()
        or 0
    )

    # 2. Resolved attendances
    resolved_attendances = (
        db.query(func.count(Attendance.id))
        .filter(
            Attendance.technician_id == user_id,
            Attendance.status == "resolvido",
        )
        .scalar()
        or 0
    )

    # 3. Active projects owned
    active_projects = (
        db.query(func.count(Project.id))
        .filter(
            Project.owner_id == user_id,
            Project.status.in_(["planejado", "em_andamento"]),
        )
        .scalar()
        or 0
    )

    # 4. Completed maintenances
    completed_maintenances = (
        db.query(func.count(MaintenanceRecord.id))
        .filter(
            MaintenanceRecord.technician_id == user_id,
            MaintenanceRecord.status == "concluida",
        )
        .scalar()
        or 0
    )

    # 5. Authored knowledge articles
    authored_articles = (
        db.query(func.count(KnowledgeArticle.id))
        .filter(
            KnowledgeArticle.author_id == user_id,
            KnowledgeArticle.status == "publicado",
        )
        .scalar()
        or 0
    )

    return UserStatsResponse(
        user_id=user_id,
        open_tasks=open_tasks,
        resolved_attendances=resolved_attendances,
        active_projects=active_projects,
        completed_maintenances=completed_maintenances,
        authored_articles=authored_articles,
    )


@router.get("/users/{user_id}", response_model=UserResponse)
def get_user_by_id(
    user_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(require_permission("users:read")),
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Usuário não encontrado",
        )
    return user


@router.put("/users/{user_id}", response_model=UserResponse)
def update_user(
    user_id: int,
    user_in: UserUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("users:write")),
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Usuário não encontrado",
        )

    updated_fields = {}

    # Email uniqueness check
    if user_in.email and user_in.email != user.email:
        existing = db.query(User).filter(User.email == user_in.email).first()
        if existing and existing.id != user_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="E-mail já cadastrado por outro usuário",
            )
        user.email = user_in.email
        updated_fields["email"] = user_in.email

    if user_in.password is not None:
        user.hashed_password = get_password_hash(user_in.password)
        updated_fields["password_changed"] = True

    # Department validation
    if user_in.department_id is not None:
        dept = db.query(Department).filter(Department.id == user_in.department_id).first()
        if not dept:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Departamento com ID {user_in.department_id} não encontrado",
            )
        if dept.status == "inativa":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Departamento selecionado está inativo",
            )
        user.department_id = user_in.department_id
        updated_fields["department"] = dept.name

    # Identity fields
    if user_in.full_name is not None:
        user.full_name = user_in.full_name
        updated_fields["full_name"] = user_in.full_name

    if user_in.display_name is not None:
        user.display_name = user_in.display_name
        updated_fields["display_name"] = user_in.display_name

    if user_in.avatar_url is not None:
        user.avatar_url = user_in.avatar_url
        updated_fields["avatar_url"] = user_in.avatar_url

    if user_in.phone is not None:
        user.phone = user_in.phone
        updated_fields["phone"] = user_in.phone

    if user_in.job_title is not None:
        user.job_title = user_in.job_title
        updated_fields["job_title"] = user_in.job_title

    if user_in.preferences is not None:
        user.preferences = user_in.preferences
        updated_fields["preferences_updated"] = True

    # Role updates (multi-role support)
    target_role_ids = None
    if user_in.role_ids is not None:
        target_role_ids = user_in.role_ids
    elif user_in.role_id is not None:
        target_role_ids = [user_in.role_id]

    if target_role_ids is not None:
        roles_to_assign = []
        for r_id in target_role_ids:
            role = db.query(Role).filter(Role.id == r_id).first()
            if not role:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Perfil com ID {r_id} não encontrado",
                )
            roles_to_assign.append(role)
        
        # Check last admin if removing Admin role
        was_admin = any(r.name == 'Administrador' for r in user.roles)
        will_be_admin = any(r.name == 'Administrador' for r in roles_to_assign)
        if was_admin and not will_be_admin:
            check_last_admin(db, user)

        user.roles = roles_to_assign
        updated_fields["roles"] = [r.name for r in roles_to_assign]

    if user_in.is_active is not None:
        # Prevent self-deactivation if current user is editing themselves
        if user_id == current_user.id and not user_in.is_active:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Não é permitido desativar o próprio usuário logado",
            )
        # Check last admin if deactivating
        if not user_in.is_active and user.is_active:
            check_last_admin(db, user)

        user.is_active = user_in.is_active
        updated_fields["is_active"] = user_in.is_active

    record_audit_log(
        db=db,
        action="UPDATE",
        entity_type="user",
        entity_id=user.id,
        user=current_user,
        details={"username": user.username, "updated_fields": updated_fields},
    )

    db.commit()
    db.refresh(user)
    return user


@router.delete("/users/{user_id}", status_code=status.HTTP_200_OK)
def delete_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("users:write")),
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Usuário não encontrado",
        )
    if user.id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Não é permitido excluir o próprio usuário logado",
        )
    
    check_last_admin(db, user)

    deleted_username = user.username
    db.delete(user)

    record_audit_log(
        db=db,
        action="DELETE",
        entity_type="user",
        entity_id=user_id,
        user=current_user,
        details={"deleted_username": deleted_username},
    )

    db.commit()
    return {"message": "Usuário excluído com sucesso"}


@router.get("/roles", response_model=List[RoleResponse])
def list_roles(
    db: Session = Depends(get_db),
    _: User = Depends(require_permission("roles:read")),
):
    roles = db.query(Role).all()
    return roles


@router.post("/roles", response_model=RoleResponse)
def create_role(
    role_in: RoleCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("roles:write")),
):
    # Check if role with same name exists
    existing_role = db.query(Role).filter(Role.name == role_in.name).first()
    if existing_role:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Já existe um perfil com esse nome.",
        )
    
    new_role = Role(name=role_in.name, description=role_in.description)
    
    if role_in.permission_ids:
        perms = db.query(Permission).filter(Permission.id.in_(role_in.permission_ids)).all()
        new_role.permissions = perms
    
    db.add(new_role)
    db.commit()
    db.refresh(new_role)

    record_audit_log(
        db=db,
        action="CREATE",
        entity_type="role",
        entity_id=new_role.id,
        user=current_user,
        details={"name": new_role.name, "description": new_role.description},
    )

    return new_role


@router.put("/roles/{role_id}", response_model=RoleResponse)
def update_role(
    role_id: int,
    role_in: RoleUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("roles:write")),
):
    role = db.query(Role).filter(Role.id == role_id).first()
    if not role:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Perfil não encontrado",
        )
    
    if role.name == 'Administrador' and role_in.name and role_in.name != 'Administrador':
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Não é permitido alterar o nome do perfil 'Administrador'."
        )

    updated_fields = {}
    if role_in.name is not None:
        # Check conflict
        existing_role = db.query(Role).filter(Role.name == role_in.name, Role.id != role_id).first()
        if existing_role:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Já existe um perfil com esse nome.",
            )
        role.name = role_in.name
        updated_fields["name"] = role_in.name
    
    if role_in.description is not None:
        role.description = role_in.description
        updated_fields["description"] = role_in.description
    
    if role_in.permission_ids is not None:
        perms = db.query(Permission).filter(Permission.id.in_(role_in.permission_ids)).all()
        
        # Protect Admin from losing permissions
        if role.name == 'Administrador':
            # ensure users:write, roles:write, etc., are never dropped from Admin?
            # For safety, let's just make sure Admin gets all permissions always, or we don't let people strip it.
            # We can allow editing, but they can't remove roles:write from Admin
            has_roles_write = any(p.name == 'roles:write' for p in perms)
            if not has_roles_write:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Não é permitido remover a permissão 'roles:write' do Administrador."
                )
        role.permissions = perms
        updated_fields["permissions"] = [p.name for p in perms]

    record_audit_log(
        db=db,
        action="UPDATE",
        entity_type="role",
        entity_id=role.id,
        user=current_user,
        details={"role_name": role.name, "updated_fields": updated_fields},
    )

    db.commit()
    db.refresh(role)
    return role


@router.get("/permissions", response_model=List[PermissionResponse])
def list_permissions(
    db: Session = Depends(get_db),
    _: User = Depends(require_permission("roles:read")),
):
    perms = db.query(Permission).all()
    return perms
