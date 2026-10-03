from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import or_

from app.database import get_db
from app.models import Attendance, AttendanceNote, KnowledgeArticle, KnowledgeCategory, User
from app.auth import get_current_active_user, require_permission
from app.schemas import (
    AttendanceCreate,
    AttendanceUpdate,
    AttendanceResponse,
    AttendanceNoteCreate,
    AttendanceNoteResponse,
    KnowledgeArticleResponse,
)

router = APIRouter(prefix="/attendances", tags=["Attendances"])

def is_admin(user: User) -> bool:
    return user.has_role("Administrador")

@router.get("", response_model=List[AttendanceResponse])
def list_attendances(
    status: Optional[str] = None,
    technician_id: Optional[int] = None,
    has_otrs: Optional[bool] = None,
    project_id: Optional[int] = None,
    search: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("attendance:read")),
):
    query = db.query(Attendance)

    if status:
        query = query.filter(Attendance.status == status)

    if technician_id:
        query = query.filter(Attendance.technician_id == technician_id)

    if has_otrs is True:
        query = query.filter(Attendance.otrs_ticket.isnot(None), Attendance.otrs_ticket != "")
    elif has_otrs is False:
        query = query.filter(or_(Attendance.otrs_ticket.is_(None), Attendance.otrs_ticket == ""))

    if project_id is not None:
        query = query.filter(Attendance.project_id == project_id)

    if search:
        search_filter = or_(
            Attendance.title.ilike(f"%{search}%"),
            Attendance.otrs_ticket.ilike(f"%{search}%"),
            Attendance.equipment_name.ilike(f"%{search}%"),
            Attendance.requester_name.ilike(f"%{search}%"),
            Attendance.store_department.ilike(f"%{search}%"),
            Attendance.problem_description.ilike(f"%{search}%"),
            Attendance.diagnosis.ilike(f"%{search}%"),
            Attendance.solution.ilike(f"%{search}%"),
            Attendance.commands_used.ilike(f"%{search}%"),
        )
        query = query.filter(search_filter)

    return query.order_by(Attendance.created_at.desc()).all()

@router.post("", response_model=AttendanceResponse, status_code=status.HTTP_201_CREATED)
def create_attendance(
    payload: AttendanceCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("attendance:write")),
):
    assigned_tech_id = payload.technician_id or current_user.id

    attendance_obj = Attendance(
        title=payload.title,
        otrs_ticket=payload.otrs_ticket,
        otrs_url=payload.otrs_url,
        requester_name=payload.requester_name,
        technician_id=assigned_tech_id,
        status=payload.status or "em_andamento",
        equipment_name=payload.equipment_name,
        store_department=payload.store_department,
        problem_description=payload.problem_description,
        symptoms=payload.symptoms,
        diagnosis=payload.diagnosis,
        cause=payload.cause,
        solution=payload.solution,
        commands_used=payload.commands_used,
        internal_notes=payload.internal_notes,
        project_id=payload.project_id,
    )
    db.add(attendance_obj)
    db.commit()
    db.refresh(attendance_obj)
    return attendance_obj

@router.get("/{attendance_id}", response_model=AttendanceResponse)
def get_attendance(
    attendance_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("attendance:read")),
):
    attendance_obj = db.query(Attendance).filter(Attendance.id == attendance_id).first()
    if not attendance_obj:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Atendimento não encontrado")
    return attendance_obj

@router.put("/{attendance_id}", response_model=AttendanceResponse)
def update_attendance(
    attendance_id: int,
    payload: AttendanceUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("attendance:write")),
):
    attendance_obj = db.query(Attendance).filter(Attendance.id == attendance_id).first()
    if not attendance_obj:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Atendimento não encontrado")

    if not is_admin(current_user) and attendance_obj.technician_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Apenas o técnico responsável ou administrador pode alterar este atendimento")

    update_data = payload.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(attendance_obj, key, value)

    db.commit()
    db.refresh(attendance_obj)
    return attendance_obj

@router.delete("/{attendance_id}")
def delete_attendance(
    attendance_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("attendance:write")),
):
    attendance_obj = db.query(Attendance).filter(Attendance.id == attendance_id).first()
    if not attendance_obj:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Atendimento não encontrado")

    if not is_admin(current_user) and attendance_obj.technician_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Apenas o técnico responsável ou administrador pode excluir este atendimento")

    db.delete(attendance_obj)
    db.commit()
    return {"message": "Atendimento excluído com sucesso"}

@router.post("/{attendance_id}/notes", response_model=AttendanceNoteResponse, status_code=status.HTTP_201_CREATED)
def add_attendance_note(
    attendance_id: int,
    payload: AttendanceNoteCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("attendance:write")),
):
    attendance_obj = db.query(Attendance).filter(Attendance.id == attendance_id).first()
    if not attendance_obj:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Atendimento não encontrado")

    note_obj = AttendanceNote(
        attendance_id=attendance_id,
        author_id=current_user.id,
        note=payload.note,
    )
    db.add(note_obj)
    db.commit()
    db.refresh(note_obj)
    return note_obj

@router.post("/{attendance_id}/convert-to-knowledge", response_model=KnowledgeArticleResponse, status_code=status.HTTP_201_CREATED)
def convert_attendance_to_knowledge(
    attendance_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("attendance:write")),
):
    attendance_obj = db.query(Attendance).filter(Attendance.id == attendance_id).first()
    if not attendance_obj:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Atendimento não encontrado")

    # If already converted, return existing article
    if attendance_obj.knowledge_article_id:
        existing_article = db.query(KnowledgeArticle).filter(KnowledgeArticle.id == attendance_obj.knowledge_article_id).first()
        if existing_article:
            return existing_article

    # Pick or find default Category (e.g. "Procedimentos" or "Suporte Técnico")
    category = db.query(KnowledgeCategory).filter(KnowledgeCategory.name.ilike("Procedimentos")).first()
    category_id = category.id if category else None

    # Construct technical article content from attendance diagnosis and resolution
    content_sections = []
    if attendance_obj.problem_description:
        content_sections.append(f"### Descrição do Problema\n{attendance_obj.problem_description}")
    if attendance_obj.symptoms:
        content_sections.append(f"### Sintomas Observados\n{attendance_obj.symptoms}")
    if attendance_obj.diagnosis:
        content_sections.append(f"### Diagnóstico Técnico\n{attendance_obj.diagnosis}")
    if attendance_obj.cause:
        content_sections.append(f"### Causa Identificada\n{attendance_obj.cause}")
    if attendance_obj.solution:
        content_sections.append(f"### Solução Aplicada\n{attendance_obj.solution}")
    if attendance_obj.commands_used:
        content_sections.append(f"### Comandos Utilizados\n```bash\n{attendance_obj.commands_used}\n```")
    if attendance_obj.equipment_name:
        content_sections.append(f"**Equipamento Relacionado:** {attendance_obj.equipment_name}")
    if attendance_obj.otrs_ticket:
        content_sections.append(f"**Chamado OTRS de Origem:** #{attendance_obj.otrs_ticket}")

    full_content = "\n\n".join(content_sections) if content_sections else "Conteúdo originado de atendimento técnico."

    # Create Draft Knowledge Article (status="rascunho") for review
    article_obj = KnowledgeArticle(
        title=f"Procedimento: {attendance_obj.title}",
        summary=attendance_obj.problem_description[:450] if attendance_obj.problem_description else None,
        content=full_content,
        problem=attendance_obj.problem_description,
        solution=attendance_obj.solution,
        commands=attendance_obj.commands_used,
        category_id=category_id,
        author_id=current_user.id,
        status="rascunho",
        visibility="equipe",
    )
    db.add(article_obj)
    db.commit()
    db.refresh(article_obj)

    # Link attendance to knowledge article
    attendance_obj.knowledge_article_id = article_obj.id
    db.commit()

    return article_obj
