from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import or_, distinct

from app.database import get_db
from app.models import Command, CommandStep, User
from app.auth import get_current_active_user
from app.schemas import (
    CommandCreate,
    CommandUpdate,
    CommandResponse,
)

router = APIRouter(prefix="/commands", tags=["Commands Library"])

def is_admin(user: User) -> bool:
    return bool(user.role and user.role.name == "Administrador")

@router.get("", response_model=List[CommandResponse])
def list_commands(
    system: Optional[str] = None,
    category: Optional[str] = None,
    search: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    query = db.query(Command)

    # Visibility rules: non-admins cannot see private commands of other users
    if not is_admin(current_user):
        query = query.filter(
            or_(
                Command.visibility.in_(["equipe", "todos"]),
                Command.author_id == current_user.id,
            )
        )

    if system:
        query = query.filter(Command.system.ilike(system))

    if category:
        query = query.filter(Command.category.ilike(category))

    if search:
        query = query.filter(
            or_(
                Command.title.ilike(f"%{search}%"),
                Command.description.ilike(f"%{search}%"),
                Command.command.ilike(f"%{search}%"),
                Command.notes.ilike(f"%{search}%"),
                Command.tags.ilike(f"%{search}%"),
                Command.id.in_(
                    db.query(CommandStep.command_id).filter(
                        or_(
                            CommandStep.title.ilike(f"%{search}%"),
                            CommandStep.description.ilike(f"%{search}%"),
                            CommandStep.command_text.ilike(f"%{search}%")
                        )
                    )
                )
            )
        )

    return query.order_by(Command.copies_count.desc(), Command.updated_at.desc()).all()

@router.get("/systems", response_model=List[str])
def list_systems(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    results = db.query(distinct(Command.system)).filter(Command.system.isnot(None)).all()
    return sorted([r[0] for r in results if r[0]])

@router.get("/categories", response_model=List[str])
def list_command_categories(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    results = db.query(distinct(Command.category)).filter(Command.category.isnot(None)).all()
    return sorted([r[0] for r in results if r[0]])

@router.post("", response_model=CommandResponse, status_code=status.HTTP_201_CREATED)
def create_command(
    payload: CommandCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    command_obj = Command(
        title=payload.title,
        description=payload.description,
        command=payload.command,
        system=payload.system or "Geral",
        category=payload.category,
        tags=payload.tags,
        notes=payload.notes,
        warning=payload.warning,
        author_id=current_user.id,
        visibility=payload.visibility or "equipe",
    )
    db.add(command_obj)
    db.flush()  # to get command_obj.id

    for step in payload.steps:
        db.add(CommandStep(
            command_id=command_obj.id,
            position=step.position,
            title=step.title,
            description=step.description,
            command_text=step.command_text
        ))

    db.commit()
    db.refresh(command_obj)
    return command_obj

@router.get("/{command_id}", response_model=CommandResponse)
def get_command(
    command_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    command_obj = db.query(Command).filter(Command.id == command_id).first()
    if not command_obj:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Comando não encontrado")

    if not is_admin(current_user) and command_obj.visibility == "privado" and command_obj.author_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Comando privado")

    return command_obj

@router.put("/{command_id}", response_model=CommandResponse)
def update_command(
    command_id: int,
    payload: CommandUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    command_obj = db.query(Command).filter(Command.id == command_id).first()
    if not command_obj:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Comando não encontrado")

    if not is_admin(current_user) and command_obj.author_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Apenas o autor ou administrador pode editar este comando")

    if payload.title is not None:
        command_obj.title = payload.title
    if payload.description is not None:
        command_obj.description = payload.description
    if payload.command is not None:
        command_obj.command = payload.command
    if payload.system is not None:
        command_obj.system = payload.system
    if payload.category is not None:
        command_obj.category = payload.category
    if payload.tags is not None:
        command_obj.tags = payload.tags
    if payload.notes is not None:
        command_obj.notes = payload.notes
    if payload.warning is not None:
        command_obj.warning = payload.warning
    if payload.visibility is not None:
        command_obj.visibility = payload.visibility

    if payload.steps is not None:
        db.query(CommandStep).filter(CommandStep.command_id == command_obj.id).delete()
        for step in payload.steps:
            db.add(CommandStep(
                command_id=command_obj.id,
                position=step.position,
                title=step.title,
                description=step.description,
                command_text=step.command_text
            ))

    db.commit()
    db.refresh(command_obj)
    return command_obj

@router.delete("/{command_id}")
def delete_command(
    command_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    command_obj = db.query(Command).filter(Command.id == command_id).first()
    if not command_obj:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Comando não encontrado")

    if not is_admin(current_user) and command_obj.author_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Apenas o autor ou administrador pode excluir este comando")

    db.delete(command_obj)
    db.commit()
    return {"message": "Comando excluído com sucesso"}

@router.post("/{command_id}/copy")
def record_command_copy(
    command_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    command_obj = db.query(Command).filter(Command.id == command_id).first()
    if not command_obj:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Comando não encontrado")

    command_obj.copies_count += 1
    db.commit()
    return {"status": "ok", "copies_count": command_obj.copies_count}
