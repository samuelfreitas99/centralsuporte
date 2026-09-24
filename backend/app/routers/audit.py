from datetime import datetime
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import or_, desc

from app.database import get_db
from app.models import AuditLog, User
from app.schemas import AuditLogItem, AuditLogListResponse
from app.auth import get_current_active_user, require_permission

router = APIRouter(prefix="/audit-logs", tags=["audit-logs"])


@router.get("", response_model=AuditLogListResponse)
def get_audit_logs(
    page: int = Query(1, ge=1, description="Número da página"),
    limit: int = Query(30, ge=1, le=100, description="Itens por página"),
    action: Optional[str] = Query(None, description="Filtro por tipo de ação"),
    entity_type: Optional[str] = Query(None, description="Filtro por entidade"),
    username: Optional[str] = Query(None, description="Filtro por usuário"),
    search: Optional[str] = Query(None, description="Busca textual em detalhes/ação"),
    start_date: Optional[datetime] = Query(None, description="Data inicial"),
    end_date: Optional[datetime] = Query(None, description="Data final"),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("audit:read")),
):
    """
    Lista trilhas e logs de auditoria do sistema com filtros e paginação.
    Requer permissão 'audit:read' (Administrador ou Gestor).
    """
    query = db.query(AuditLog)

    if action:
        query = query.filter(AuditLog.action == action.upper())

    if entity_type:
        query = query.filter(AuditLog.entity_type == entity_type.lower())

    if username:
        query = query.filter(AuditLog.username.ilike(f"%{username}%"))

    if start_date:
        query = query.filter(AuditLog.created_at >= start_date)

    if end_date:
        query = query.filter(AuditLog.created_at <= end_date)

    if search:
        term = f"%{search.strip()}%"
        query = query.filter(
            or_(
                AuditLog.action.ilike(term),
                AuditLog.entity_type.ilike(term),
                AuditLog.username.ilike(term),
                AuditLog.details.ilike(term),
                AuditLog.ip_address.ilike(term),
            )
        )

    total = query.count()
    offset = (page - 1) * limit
    results = query.order_by(desc(AuditLog.created_at)).offset(offset).limit(limit).all()

    return AuditLogListResponse(
        total=total,
        page=page,
        limit=limit,
        results=results,
    )


@router.get("/metadata")
def get_audit_metadata(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("audit:read")),
):
    """
    Retorna ações distintas e tipos de entidades presentes nos logs de auditoria
    para preenchimento dos seletores de filtro no frontend.
    """
    actions = [
        row[0]
        for row in db.query(AuditLog.action).distinct().order_by(AuditLog.action).all()
        if row[0]
    ]
    entity_types = [
        row[0]
        for row in db.query(AuditLog.entity_type).distinct().order_by(AuditLog.entity_type).all()
        if row[0]
    ]

    # Pre-populate common ones if log is fresh
    default_actions = sorted(
        list(set(actions + ["CREATE", "UPDATE", "DELETE", "LOGIN", "STATUS_CHANGE", "PASSWORD_REVEAL"]))
    )
    default_entities = sorted(
        list(set(entity_types + ["user", "role", "attendance", "equipment", "maintenance", "knowledge", "task", "credential"]))
    )

    return {
        "actions": default_actions,
        "entity_types": default_entities,
    }


@router.get("/{id}", response_model=AuditLogItem)
def get_audit_log_by_id(
    id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("audit:read")),
):
    """
    Recupera um log de auditoria individual por ID com seus detalhes estruturados.
    """
    log = db.query(AuditLog).filter(AuditLog.id == id).first()
    if not log:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Log de auditoria não encontrado.",
        )
    return log
