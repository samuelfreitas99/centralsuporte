from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Checklist, ChecklistItem, User
from app.auth import require_permission
from app.schemas import (
    ChecklistCreate,
    ChecklistUpdate,
    ChecklistResponse,
    ChecklistItemCreate,
    ChecklistItemUpdate,
    ChecklistItemResponse,
)

router = APIRouter(prefix="/checklists", tags=["Checklists"])

def is_admin(user: User) -> bool:
    return bool(user.role and user.role.name == "Administrador")

@router.get("", response_model=List[ChecklistResponse])
def list_checklists(
    task_id: Optional[int] = None,
    project_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("tasks:read")),
):
    query = db.query(Checklist)
    if task_id is not None:
        query = query.filter(Checklist.task_id == task_id)
    if project_id is not None:
        query = query.filter(Checklist.project_id == project_id)
    return query.order_by(Checklist.created_at.desc()).all()

@router.post("", response_model=ChecklistResponse, status_code=status.HTTP_201_CREATED)
def create_checklist(
    payload: ChecklistCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("tasks:write")),
):
    checklist = Checklist(
        title=payload.title,
        description=payload.description,
        task_id=payload.task_id,
        project_id=payload.project_id,
        creator_id=current_user.id
    )
    if payload.items:
        for idx, item_data in enumerate(payload.items):
            item = ChecklistItem(
                title=item_data.title,
                position=item_data.position if item_data.position is not None else idx
            )
            checklist.items.append(item)

    db.add(checklist)
    db.commit()
    db.refresh(checklist)
    return checklist

@router.get("/{checklist_id}", response_model=ChecklistResponse)
def get_checklist(
    checklist_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("tasks:read")),
):
    checklist = db.query(Checklist).filter(Checklist.id == checklist_id).first()
    if not checklist:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Checklist não encontrado")
    return checklist

@router.put("/{checklist_id}", response_model=ChecklistResponse)
def update_checklist(
    checklist_id: int,
    payload: ChecklistUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("tasks:write")),
):
    checklist = db.query(Checklist).filter(Checklist.id == checklist_id).first()
    if not checklist:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Checklist não encontrado")

    update_data = payload.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(checklist, key, value)

    db.commit()
    db.refresh(checklist)
    return checklist

@router.delete("/{checklist_id}")
def delete_checklist(
    checklist_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("tasks:write")),
):
    checklist = db.query(Checklist).filter(Checklist.id == checklist_id).first()
    if not checklist:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Checklist não encontrado")

    db.delete(checklist)
    db.commit()
    return {"message": "Checklist excluído com sucesso"}

# --- Checklist Items Endpoints ---

@router.post("/{checklist_id}/items", response_model=ChecklistItemResponse, status_code=status.HTTP_201_CREATED)
def add_checklist_item(
    checklist_id: int,
    payload: ChecklistItemCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("tasks:write")),
):
    checklist = db.query(Checklist).filter(Checklist.id == checklist_id).first()
    if not checklist:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Checklist não encontrado")

    item = ChecklistItem(
        checklist_id=checklist.id,
        title=payload.title,
        position=payload.position or len(checklist.items)
    )
    db.add(item)
    db.commit()
    db.refresh(item)
    return item

@router.patch("/{checklist_id}/items/{item_id}", response_model=ChecklistItemResponse)
def update_checklist_item(
    checklist_id: int,
    item_id: int,
    payload: ChecklistItemUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("tasks:write")),
):
    item = db.query(ChecklistItem).filter(
        ChecklistItem.id == item_id,
        ChecklistItem.checklist_id == checklist_id
    ).first()
    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Item do checklist não encontrado")

    if payload.title is not None:
        item.title = payload.title
    if payload.position is not None:
        item.position = payload.position
    if payload.is_completed is not None:
        item.is_completed = payload.is_completed
        if payload.is_completed:
            item.completed_at = datetime.now(timezone.utc)
            item.completed_by_id = current_user.id
        else:
            item.completed_at = None
            item.completed_by_id = None

    db.commit()
    db.refresh(item)
    return item

@router.delete("/{checklist_id}/items/{item_id}")
def delete_checklist_item(
    checklist_id: int,
    item_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("tasks:write")),
):
    item = db.query(ChecklistItem).filter(
        ChecklistItem.id == item_id,
        ChecklistItem.checklist_id == checklist_id
    ).first()
    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Item do checklist não encontrado")

    db.delete(item)
    db.commit()
    return {"message": "Item do checklist removido com sucesso"}
