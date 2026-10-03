from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import or_
from typing import List
from app import schemas, models
from app.database import get_db
from app.auth import get_current_user, require_permission

PROJECT_ACTION_TITLES = {
    "CREATE": "Projeto criado",
    "UPDATE": "Projeto atualizado",
    "DELETE": "Projeto excluído",
}

router = APIRouter(
    prefix="/projects",
    tags=["Projects"]
)

@router.get("/", response_model=List[schemas.ProjectResponse])
def list_projects(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_permission("project:read")),
    status: str = None,
    store_id: int = None
):
    query = db.query(models.Project)
    if status:
        query = query.filter(models.Project.status == status)
    if store_id:
        query = query.filter(models.Project.store_id == store_id)
    return query.order_by(models.Project.created_at.desc()).all()

@router.post("/", response_model=schemas.ProjectResponse, status_code=status.HTTP_201_CREATED)
def create_project(
    project_in: schemas.ProjectCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_permission("project:create"))
):
    if project_in.store_id:
        store = db.query(models.Store).filter(models.Store.id == project_in.store_id).first()
        if not store:
            raise HTTPException(status_code=404, detail="Store not found")

    project = models.Project(**project_in.model_dump(), owner_id=current_user.id)
    db.add(project)
    db.commit()
    db.refresh(project)
    
    # Audit log
    audit_log = models.AuditLog(
        user_id=current_user.id,
        username=current_user.username,
        action="CREATE",
        entity_type="project",
        entity_id=project.id,
        details=f"Project '{project.title}' created."
    )
    db.add(audit_log)
    db.commit()
    
    return project

@router.get("/{project_id}", response_model=schemas.ProjectResponse)
def get_project(
    project_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_permission("project:read"))
):
    project = db.query(models.Project).filter(models.Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return project

@router.put("/{project_id}", response_model=schemas.ProjectResponse)
def update_project(
    project_id: int,
    project_in: schemas.ProjectUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_permission("project:update"))
):
    project = db.query(models.Project).filter(models.Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    if project_in.store_id is not None:
        store = db.query(models.Store).filter(models.Store.id == project_in.store_id).first()
        if not store:
            raise HTTPException(status_code=404, detail="Store not found")
            
    if project_in.owner_id is not None:
        new_owner = db.query(models.User).filter(models.User.id == project_in.owner_id).first()
        if not new_owner:
            raise HTTPException(status_code=404, detail="User not found")

    update_data = project_in.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(project, key, value)
        
    db.commit()
    db.refresh(project)
    
    audit_log = models.AuditLog(
        user_id=current_user.id,
        username=current_user.username,
        action="UPDATE",
        entity_type="project",
        entity_id=project.id,
        details=f"Project '{project.title}' updated."
    )
    db.add(audit_log)
    db.commit()
    
    return project

@router.delete("/{project_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_project(
    project_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_permission("project:delete"))
):
    project = db.query(models.Project).filter(models.Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
        
    db.delete(project)
    
    audit_log = models.AuditLog(
        user_id=current_user.id,
        username=current_user.username,
        action="DELETE",
        entity_type="project",
        entity_id=project_id,
        details=f"Project '{project.title}' deleted."
    )
    db.add(audit_log)
    db.commit()
    
    return None

# --- Project Notes ---

@router.post("/{project_id}/notes", response_model=schemas.ProjectNoteResponse, status_code=status.HTTP_201_CREATED)
def create_project_note(
    project_id: int,
    note_in: schemas.ProjectNoteCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_permission("project:update"))
):
    project = db.query(models.Project).filter(models.Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    note = models.ProjectNote(
        project_id=project_id,
        author_id=current_user.id,
        note=note_in.note
    )
    db.add(note)
    db.commit()
    db.refresh(note)
    return note

@router.get("/{project_id}/notes", response_model=List[schemas.ProjectNoteResponse])
def get_project_notes(
    project_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_permission("project:read"))
):
    project = db.query(models.Project).filter(models.Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    return db.query(models.ProjectNote).filter(models.ProjectNote.project_id == project_id).order_by(models.ProjectNote.created_at.asc()).all()

@router.put("/{project_id}/notes/{note_id}", response_model=schemas.ProjectNoteResponse)
def update_project_note(
    project_id: int,
    note_id: int,
    note_in: schemas.ProjectNoteCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_permission("project:update"))
):
    note = db.query(models.ProjectNote).filter(
        models.ProjectNote.id == note_id,
        models.ProjectNote.project_id == project_id
    ).first()
    if not note:
        raise HTTPException(status_code=404, detail="Project Note not found")
        
    if note.author_id != current_user.id:
        # Só o autor ou admin pode editar? O prompt não especificou, vamos deixar só o autor ou admin.
        has_admin = current_user.has_permission("users:write")
        if not has_admin:
            raise HTTPException(status_code=403, detail="Not authorized to edit this note")

    note.note = note_in.note
    db.commit()
    db.refresh(note)
    return note

@router.delete("/{project_id}/notes/{note_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_project_note(
    project_id: int,
    note_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_permission("project:update"))
):
    note = db.query(models.ProjectNote).filter(
        models.ProjectNote.id == note_id,
        models.ProjectNote.project_id == project_id
    ).first()
    if not note:
        raise HTTPException(status_code=404, detail="Project Note not found")
        
    if note.author_id != current_user.id:
        has_admin = current_user.has_permission("users:write")
        if not has_admin:
            raise HTTPException(status_code=403, detail="Not authorized to delete this note")

    db.delete(note)
    db.commit()
    return None

# --- Project Equipment ---

@router.post("/{project_id}/equipment/{equipment_id}", status_code=status.HTTP_201_CREATED)
def add_equipment_to_project(
    project_id: int,
    equipment_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_permission("project:update"))
):
    project = db.query(models.Project).filter(models.Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
        
    equipment = db.query(models.Equipment).filter(models.Equipment.id == equipment_id).first()
    if not equipment:
        raise HTTPException(status_code=404, detail="Equipment not found")
        
    # Check for duplicate
    assoc = db.query(models.project_equipment).filter_by(project_id=project_id, equipment_id=equipment_id).first()
    if assoc:
        raise HTTPException(status_code=400, detail="Equipment already linked to this project")
        
    project.equipment_list.append(equipment)
    
    audit_log = models.AuditLog(
        user_id=current_user.id,
        username=current_user.username,
        action="UPDATE",
        entity_type="project",
        entity_id=project_id,
        details=f"Equipment '{equipment.hostname or equipment.patrimony}' linked to project."
    )
    db.add(audit_log)
    db.commit()
    
    return {"message": "Equipment linked successfully"}

@router.delete("/{project_id}/equipment/{equipment_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_equipment_from_project(
    project_id: int,
    equipment_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_permission("project:update"))
):
    project = db.query(models.Project).filter(models.Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
        
    equipment = db.query(models.Equipment).filter(models.Equipment.id == equipment_id).first()
    if not equipment:
        raise HTTPException(status_code=404, detail="Equipment not found")
        
    if equipment not in project.equipment_list:
        raise HTTPException(status_code=404, detail="Equipment not linked to this project")
        
    project.equipment_list.remove(equipment)
    
    audit_log = models.AuditLog(
        user_id=current_user.id,
        username=current_user.username,
        action="UPDATE",
        entity_type="project",
        entity_id=project_id,
        details=f"Equipment '{equipment.hostname or equipment.patrimony}' unlinked from project."
    )
    db.add(audit_log)
    db.commit()
    
    return None

# --- Summary and Timeline ---

@router.get("/{project_id}/summary", response_model=schemas.ProjectSummaryResponse)
def get_project_summary(
    project_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_permission("project:read"))
):
    project = db.query(models.Project).filter(models.Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    tasks = db.query(models.Task.status).filter(models.Task.project_id == project_id).all()
    total_tasks = len(tasks)
    completed_tasks = sum(1 for t in tasks if t.status == "concluida")
    pending_tasks = total_tasks - completed_tasks

    if total_tasks > 0:
        progress = (completed_tasks / total_tasks) * 100
    else:
        progress = 100.0 if project.status == "concluido" else 0.0

    total_equipment = db.query(models.project_equipment).filter(models.project_equipment.c.project_id == project_id).count()
    total_maintenances = db.query(models.MaintenanceRecord).filter(models.MaintenanceRecord.project_id == project_id).count()
    total_attendances = db.query(models.Attendance).filter(models.Attendance.project_id == project_id).count()
    total_events = db.query(models.CalendarEvent).filter(models.CalendarEvent.project_id == project_id).count()
    total_stock = db.query(models.StockMovement).filter(models.StockMovement.project_id == project_id).count()

    return schemas.ProjectSummaryResponse(
        total_tasks=total_tasks,
        completed_tasks=completed_tasks,
        pending_tasks=pending_tasks,
        progress_percentage=round(progress, 2),
        total_equipment=total_equipment,
        total_maintenances=total_maintenances,
        total_attendances=total_attendances,
        total_events=total_events,
        total_stock_movements=total_stock
    )

@router.get("/{project_id}/timeline", response_model=List[schemas.ProjectTimelineEvent])
def get_project_timeline(
    project_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_permission("project:read"))
):
    project = db.query(models.Project).filter(models.Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    events = []
    
    # 1. Fetch ProjectNotes
    notes = db.query(models.ProjectNote).filter(models.ProjectNote.project_id == project_id).all()
    for note in notes:
        events.append(schemas.ProjectTimelineEvent(
            id=note.id,
            type="note",
            title="Nota Operacional",
            description=note.note,
            author=schemas.UserSimpleResponse.model_validate(note.author) if note.author else None,
            created_at=note.created_at
        ))
        
    # 2. Fetch AuditLogs related to project (títulos em linguagem de gente)
    audit_logs = db.query(models.AuditLog).filter(
        models.AuditLog.entity_type == "project",
        models.AuditLog.entity_id == project_id
    ).all()
    
    for log in audit_logs:
        events.append(schemas.ProjectTimelineEvent(
            id=log.id,
            type="audit",
            title=PROJECT_ACTION_TITLES.get(log.action, log.action.capitalize()),
            description="",
            author=schemas.UserSimpleResponse.model_validate(log.user) if log.user else None,
            created_at=log.created_at
        ))
        
    # Sort chronologically
    events.sort(key=lambda x: x.created_at)
    
    return events
