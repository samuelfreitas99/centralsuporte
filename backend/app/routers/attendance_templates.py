"""Modelos de atendimento: textos prontos para problemas recorrentes (impressora, PDV travado...)."""
from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload

from app.auth import require_permission
from app.database import get_db
from app.models import AttendanceTemplate, User
from app.schemas import AttendanceTemplateBase, AttendanceTemplateResponse
from app.services.audit import record_audit_log

router = APIRouter(prefix="/attendance-templates", tags=["Attendances"])


def _get(db: Session, template_id: int) -> AttendanceTemplate:
    tpl = db.get(AttendanceTemplate, template_id)
    if not tpl:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Modelo não encontrado")
    return tpl


def _ensure_unique(db: Session, name: str, exclude_id: int | None = None) -> None:
    q = db.query(AttendanceTemplate).filter(AttendanceTemplate.name.ilike(name.strip()))
    if exclude_id:
        q = q.filter(AttendanceTemplate.id != exclude_id)
    if q.first():
        raise HTTPException(status.HTTP_409_CONFLICT, "Já existe um modelo com esse nome")


@router.get("", response_model=List[AttendanceTemplateResponse])
def list_templates(db: Session = Depends(get_db), current_user: User = Depends(require_permission("attendance:read"))):
    return db.query(AttendanceTemplate).options(joinedload(AttendanceTemplate.created_by)).order_by(AttendanceTemplate.name).all()


@router.post("", response_model=AttendanceTemplateResponse, status_code=status.HTTP_201_CREATED)
def create_template(
    payload: AttendanceTemplateBase,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("attendance:write")),
):
    _ensure_unique(db, payload.name)
    tpl = AttendanceTemplate(**payload.model_dump(), created_by_id=current_user.id)
    tpl.name = tpl.name.strip()
    db.add(tpl)
    db.flush()
    record_audit_log(db=db, action="CREATE", entity_type="attendance_template", entity_id=tpl.id, user=current_user, details={"name": tpl.name})
    db.commit()
    db.refresh(tpl)
    return tpl


@router.put("/{template_id}", response_model=AttendanceTemplateResponse)
def update_template(
    template_id: int,
    payload: AttendanceTemplateBase,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("attendance:write")),
):
    tpl = _get(db, template_id)
    _ensure_unique(db, payload.name, exclude_id=tpl.id)
    for key, value in payload.model_dump().items():
        setattr(tpl, key, value)
    tpl.name = tpl.name.strip()
    record_audit_log(db=db, action="UPDATE", entity_type="attendance_template", entity_id=tpl.id, user=current_user, details={"name": tpl.name})
    db.commit()
    db.refresh(tpl)
    return tpl


@router.delete("/{template_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_template(
    template_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("attendance:write")),
):
    tpl = _get(db, template_id)
    record_audit_log(db=db, action="DELETE", entity_type="attendance_template", entity_id=tpl.id, user=current_user, details={"name": tpl.name})
    db.delete(tpl)
    db.commit()
