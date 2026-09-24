from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import User, Role
from app.schemas import UserCreate, UserUpdate, UserResponse, RoleResponse
from app.auth import get_password_hash, require_permission, get_current_active_user
from app.services.audit import record_audit_log

router = APIRouter(tags=["Gestão de Usuários"])

@router.get("/users", response_model=List[UserResponse])
def list_users(
    skip: int = 0, 
    limit: int = 100, 
    db: Session = Depends(get_db),
    _: User = Depends(require_permission("users:read"))
):
    users = db.query(User).offset(skip).limit(limit).all()
    return users

@router.post("/users", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def create_user(
    user_in: UserCreate, 
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("users:write"))
):
    # Check if username already exists
    if db.query(User).filter(User.username == user_in.username).first():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Nome de usuário já cadastrado"
        )
    # Check if email already exists
    if db.query(User).filter(User.email == user_in.email).first():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="E-mail já cadastrado"
        )
    # Check role if provided
    role_name = None
    if user_in.role_id is not None:
        role = db.query(Role).filter(Role.id == user_in.role_id).first()
        if not role:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Perfil com ID {user_in.role_id} não encontrado"
            )
        role_name = role.name

    new_user = User(
        username=user_in.username,
        email=user_in.email,
        hashed_password=get_password_hash(user_in.password),
        is_active=user_in.is_active,
        role_id=user_in.role_id
    )
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
            "role": role_name,
            "is_active": new_user.is_active,
        },
    )

    db.commit()
    db.refresh(new_user)
    return new_user

@router.get("/users/{user_id}", response_model=UserResponse)
def get_user_by_id(
    user_id: int, 
    db: Session = Depends(get_db),
    _: User = Depends(require_permission("users:read"))
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Usuário não encontrado"
        )
    return user

@router.put("/users/{user_id}", response_model=UserResponse)
def update_user(
    user_id: int,
    user_in: UserUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("users:write"))
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Usuário não encontrado"
        )

    updated_fields = {}

    # If updating email, ensure it's not taken by another user
    if user_in.email and user_in.email != user.email:
        existing = db.query(User).filter(User.email == user_in.email).first()
        if existing and existing.id != user_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="E-mail já cadastrado por outro usuário"
            )
        user.email = user_in.email
        updated_fields["email"] = user_in.email

    if user_in.password is not None:
        user.hashed_password = get_password_hash(user_in.password)
        updated_fields["password_changed"] = True

    if user_in.role_id is not None:
        role = db.query(Role).filter(Role.id == user_in.role_id).first()
        if not role:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Perfil com ID {user_in.role_id} não encontrado"
            )
        user.role_id = user_in.role_id
        updated_fields["role"] = role.name

    if user_in.is_active is not None:
        # Prevent self-deactivation if current user is editing themselves
        if user_id == current_user.id and not user_in.is_active:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Não é permitido desativar o próprio usuário logado"
            )
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
    current_user: User = Depends(require_permission("users:write"))
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Usuário não encontrado"
        )
    if user.id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Não é permitido excluir o próprio usuário logado"
        )
    
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
    _: User = Depends(require_permission("roles:read"))
):
    roles = db.query(Role).all()
    return roles
