from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import User
from app.schemas import LoginRequest, TokenResponse, UserResponse
from app.auth import verify_password, create_access_token, get_current_active_user
from app.services.audit import record_audit_log

router = APIRouter(prefix="/auth", tags=["Autenticação"])

@router.post("/login", response_model=TokenResponse)
def login(login_data: LoginRequest, request: Request, db: Session = Depends(get_db)):
    client_ip = request.client.host if request.client else None
    user_agent = request.headers.get("user-agent")

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
