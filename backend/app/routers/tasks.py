from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import or_

from app.database import get_db
from app.models import Task, User
from app.auth import get_current_active_user, require_permission
from app.schemas import (
    TaskCreate,
    TaskUpdate,
    TaskStatusUpdate,
    TaskResponse,
)

router = APIRouter(prefix="/tasks", tags=["Tasks"])

def is_admin(user: User) -> bool:
    return bool(user.role and user.role.name == "Administrador")

@router.get("", response_model=List[TaskResponse])
def list_tasks(
    status_filter: Optional[str] = Query(None, alias="status"),
    priority_filter: Optional[str] = Query(None, alias="priority"),
    visibility_filter: Optional[str] = Query(None, alias="visibility"),
    category_filter: Optional[str] = Query(None, alias="category"),
    project_id: Optional[int] = Query(None),
    search: Optional[str] = None,
    assigned_to_me: Optional[bool] = False,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("tasks:read")),
):
    query = db.query(Task)

    # Visibility rules:
    # Admin sees everything.
    # Non-admin sees tasks that are:
    # 1. visibility in ('equipe', 'todos') OR
    # 2. creator_id == current_user.id OR
    # 3. assigned to current_user
    if not is_admin(current_user):
        query = query.filter(
            or_(
                Task.visibility.in_(["equipe", "todos"]),
                Task.creator_id == current_user.id,
                Task.assigned_users.any(User.id == current_user.id)
            )
        )

    if status_filter:
        query = query.filter(Task.status == status_filter)
    if priority_filter:
        query = query.filter(Task.priority == priority_filter)
    if visibility_filter:
        query = query.filter(Task.visibility == visibility_filter)
    if category_filter:
        query = query.filter(Task.category == category_filter)
    if search:
        query = query.filter(
            or_(
                Task.title.ilike(f"%{search}%"),
                Task.description.ilike(f"%{search}%"),
                Task.otrs_reference.ilike(f"%{search}%")
            )
        )
    if project_id is not None:
        query = query.filter(Task.project_id == project_id)
    if assigned_to_me:
        query = query.filter(Task.assigned_users.any(User.id == current_user.id))

    tasks = query.order_by(Task.created_at.desc()).all()
    return tasks

@router.post("", response_model=TaskResponse, status_code=status.HTTP_201_CREATED)
def create_task(
    payload: TaskCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("tasks:write")),
):
    task = Task(
        title=payload.title,
        description=payload.description,
        creator_id=current_user.id,
        priority=payload.priority or "media",
        status=payload.status or "pendente",
        due_date=payload.due_date,
        visibility=payload.visibility or "equipe",
        category=payload.category,
        otrs_reference=payload.otrs_reference,
        project_id=payload.project_id,
        project_stage=payload.project_stage,
    )
    if task.status == "concluida":
        task.completed_at = datetime.now(timezone.utc)

    if payload.assigned_user_ids:
        users = db.query(User).filter(User.id.in_(payload.assigned_user_ids)).all()
        task.assigned_users = users

    db.add(task)
    db.commit()
    db.refresh(task)
    return task

@router.get("/{task_id}", response_model=TaskResponse)
def get_task(
    task_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("tasks:read")),
):
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tarefa não encontrada")

    # Visibility check
    if not is_admin(current_user):
        is_assigned = any(u.id == current_user.id for u in task.assigned_users)
        if task.visibility == "privado" and task.creator_id != current_user.id and not is_assigned:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Acesso não autorizado a esta tarefa")

    return task

@router.put("/{task_id}", response_model=TaskResponse)
def update_task(
    task_id: int,
    payload: TaskUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("tasks:write")),
):
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tarefa não encontrada")

    # Only creator, assigned or admin can edit
    is_assigned = any(u.id == current_user.id for u in task.assigned_users)
    if not is_admin(current_user) and task.creator_id != current_user.id and not is_assigned:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Permissão insuficiente para alterar esta tarefa")

    update_data = payload.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        if key == 'status':
            if value == "concluida" and task.status != "concluida":
                task.completed_at = datetime.now(timezone.utc)
            elif value != "concluida":
                task.completed_at = None
            task.status = value
        elif key == 'assigned_user_ids':
            if value is not None:
                users = db.query(User).filter(User.id.in_(value)).all()
                task.assigned_users = users
        else:
            setattr(task, key, value)

    db.commit()
    db.refresh(task)
    return task

@router.patch("/{task_id}/status", response_model=TaskResponse)
def update_task_status(
    task_id: int,
    payload: TaskStatusUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("tasks:write")),
):
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tarefa não encontrada")

    if payload.status == "concluida" and task.status != "concluida":
        task.completed_at = datetime.now(timezone.utc)
    elif payload.status != "concluida":
        task.completed_at = None

    task.status = payload.status
    db.commit()
    db.refresh(task)
    return task

@router.delete("/{task_id}")
def delete_task(
    task_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("tasks:write")),
):
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tarefa não encontrada")

    if not is_admin(current_user) and task.creator_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Apenas o criador ou administrador pode excluir esta tarefa")

    db.delete(task)
    db.commit()
    return {"message": "Tarefa excluída com sucesso"}
