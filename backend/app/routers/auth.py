import os
from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy import func
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import AuditLog, User
from app.schemas import LoginRequest, TokenResponse, UserResponse
from app.auth import verify_password, create_access_token, get_current_active_user
from app.services.audit import record_audit_log

router = APIRouter(prefix="/auth", tags=["Autenticação"])

# Proteção contra tentativa e erro de senha (a Central pode ficar exposta na internet).
LOGIN_WINDOW = timedelta(minutes=int(os.environ.get("LOGIN_LOCK_MINUTES", "15")))
MAX_FAILS_PER_USER = int(os.environ.get("LOGIN_MAX_FAILS_PER_USER", "5"))
MAX_FAILS_PER_IP = int(os.environ.get("LOGIN_MAX_FAILS_PER_IP", "20"))


def _too_many_failures(db: Session, identifier: str, client_ip: str | None) -> bool:
    """Conta os LOGIN_FAILED recentes (já gravados na auditoria) por usuário e por IP."""
    since = datetime.now(timezone.utc) - LOGIN_WINDOW
    recent = db.query(func.count(AuditLog.id)).filter(AuditLog.action == "LOGIN_FAILED", AuditLog.created_at >= since)
    if recent.filter(func.lower(AuditLog.username) == identifier.lower()).scalar() >= MAX_FAILS_PER_USER:
        return True
    return bool(client_ip) and recent.filter(AuditLog.ip_address == client_ip).scalar() >= MAX_FAILS_PER_IP

@router.post("/login", response_model=TokenResponse)
def login(login_data: LoginRequest, request: Request, db: Session = Depends(get_db)):
    client_ip = request.client.host if request.client else None
    user_agent = request.headers.get("user-agent")

    if _too_many_failures(db, login_data.username, client_ip):
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"Muitas tentativas com senha errada. Aguarde {int(LOGIN_WINDOW.total_seconds() // 60)} minutos ou fale com o administrador.",
        )

    # Support login with either username or email
    user = db.query(User).filter(
        (User.username == login_data.username) | (User.email == login_data.username)
    ).first()
    
    if not user or not verify_password(login_data.password, user.hashed_password):
        record_audit_log(
            db=db,
            action="LOGIN_FAILED",
            entity_type="user",
            entity_id=user.id if user else None,
            username=login_data.username,
            ip_address=client_ip,
            user_agent=user_agent,
            details={"attempted_identifier": login_data.username, "reason": "Credenciais incorretas"},
        )
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Nome de usuário/e-mail ou senha incorretos",
            headers={"WWW-Authenticate": "Bearer"},
        )
        
    if not user.is_active:
        record_audit_log(
            db=db,
            action="LOGIN_BLOCKED",
            entity_type="user",
            entity_id=user.id,
            username=user.username,
            ip_address=client_ip,
            user_agent=user_agent,
            details={"reason": "Tentativa de login em conta desativada"},
        )
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Usuário inativo. Contate o administrador."
        )
        
    user.last_login_at = datetime.utcnow()
    access_token = create_access_token(data={"sub": user.username})

    record_audit_log(
        db=db,
        action="LOGIN",
        entity_type="user",
        entity_id=user.id,
        user=user,
        ip_address=client_ip,
        user_agent=user_agent,
        details={"auth_method": "JWT Bearer local"},
    )
    db.commit()

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": user
    }

@router.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_active_user)):
    return current_user
