from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Reminder, User
from app.auth import get_current_active_user
from app.schemas import (
    ReminderCreate,
    ReminderUpdate,
    ReminderStatusUpdate,
    ReminderResponse,
)

router = APIRouter(prefix="/reminders", tags=["Reminders"])

def is_admin(user: User) -> bool:
    return user.has_role("Administrador")

@router.get("", response_model=List[ReminderResponse])
def list_reminders(
    status_filter: Optional[str] = Query(None, alias="status"),
    task_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    query = db.query(Reminder)
    if not is_admin(current_user):
        query = query.filter(Reminder.user_id == current_user.id)

    if status_filter:
        query = query.filter(Reminder.status == status_filter)
    if task_id:
        query = query.filter(Reminder.task_id == task_id)

    return query.order_by(Reminder.remind_at.asc()).all()

@router.post("", response_model=ReminderResponse, status_code=status.HTTP_201_CREATED)
def create_reminder(
    payload: ReminderCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    reminder = Reminder(
        title=payload.title,
        description=payload.description,
        remind_at=payload.remind_at,
        user_id=current_user.id,
        priority=payload.priority or "media",
        status=payload.status or "pendente",
        task_id=payload.task_id
    )
    db.add(reminder)
    db.commit()
    db.refresh(reminder)
    return reminder

@router.get("/{reminder_id}", response_model=ReminderResponse)
def get_reminder(
    reminder_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    reminder = db.query(Reminder).filter(Reminder.id == reminder_id).first()
    if not reminder:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Lembrete não encontrado")

    if not is_admin(current_user) and reminder.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Acesso não autorizado a este lembrete")

    return reminder

@router.put("/{reminder_id}", response_model=ReminderResponse)
def update_reminder(
    reminder_id: int,
    payload: ReminderUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    reminder = db.query(Reminder).filter(Reminder.id == reminder_id).first()
    if not reminder:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Lembrete não encontrado")

    if not is_admin(current_user) and reminder.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Permissão insuficiente para alterar este lembrete")

    if payload.title is not None:
        reminder.title = payload.title
    if payload.description is not None:
        reminder.description = payload.description
    if payload.remind_at is not None:
        reminder.remind_at = payload.remind_at
    if payload.priority is not None:
        reminder.priority = payload.priority
    if payload.status is not None:
        reminder.status = payload.status
    if payload.task_id is not None:
        reminder.task_id = payload.task_id

    db.commit()
    db.refresh(reminder)
    return reminder

@router.patch("/{reminder_id}/status", response_model=ReminderResponse)
def update_reminder_status(
    reminder_id: int,
    payload: ReminderStatusUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    reminder = db.query(Reminder).filter(Reminder.id == reminder_id).first()
    if not reminder:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Lembrete não encontrado")

    if not is_admin(current_user) and reminder.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Permissão insuficiente para alterar este lembrete")

    reminder.status = payload.status
    db.commit()
    db.refresh(reminder)
    return reminder

@router.delete("/{reminder_id}")
def delete_reminder(
    reminder_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    reminder = db.query(Reminder).filter(Reminder.id == reminder_id).first()
    if not reminder:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Lembrete não encontrado")

    if not is_admin(current_user) and reminder.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Acesso não autorizado para excluir este lembrete")

    db.delete(reminder)
    db.commit()
    return {"message": "Lembrete excluído com sucesso"}
