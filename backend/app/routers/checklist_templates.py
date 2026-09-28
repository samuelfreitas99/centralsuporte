from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from app.database import get_db
from app.models import ChecklistTemplate, ChecklistTemplateItem, User
from app.schemas import ChecklistTemplateCreate, ChecklistTemplateUpdate, ChecklistTemplateResponse
from app.auth import get_current_active_user, require_permission
from app.services.audit import record_audit_log

router = APIRouter(prefix="/checklist-templates", tags=["Checklist Templates"])

@router.get("", response_model=List[ChecklistTemplateResponse])
def list_checklist_templates(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("maintenances:read")),
    maintenance_type: str = None
):
    query = db.query(ChecklistTemplate)
    if maintenance_type:
        query = query.filter(ChecklistTemplate.maintenance_type == maintenance_type)
    return query.order_by(ChecklistTemplate.name).all()

@router.post("", response_model=ChecklistTemplateResponse, status_code=status.HTTP_201_CREATED)
def create_checklist_template(
    payload: ChecklistTemplateCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("maintenances:write")),
):
    template_dict = payload.model_dump(exclude={"items"})
    template = ChecklistTemplate(**template_dict)
    db.add(template)
    db.flush()

    if payload.items:
        for item in payload.items:
            db.add(ChecklistTemplateItem(template_id=template.id, title=item.title, position=item.position))
            
    db.commit()
    db.refresh(template)
    record_audit_log(db=db, action="CREATE", entity_type="checklist_template", entity_id=template.id, user=current_user)
    return template

@router.get("/{id}", response_model=ChecklistTemplateResponse)
def get_checklist_template(
    id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("maintenances:read")),
):
    template = db.query(ChecklistTemplate).filter(ChecklistTemplate.id == id).first()
    if not template:
        raise HTTPException(status_code=404, detail="Template não encontrado")
    return template

@router.put("/{id}", response_model=ChecklistTemplateResponse)
def update_checklist_template(
    id: int,
    payload: ChecklistTemplateUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("maintenances:write")),
):
    template = db.query(ChecklistTemplate).filter(ChecklistTemplate.id == id).first()
    if not template:
        raise HTTPException(status_code=404, detail="Template não encontrado")

    update_data = payload.model_dump(exclude={"items"}, exclude_unset=True)
    for k, v in update_data.items():
        setattr(template, k, v)
        
    if payload.items is not None:
        db.query(ChecklistTemplateItem).filter(ChecklistTemplateItem.template_id == id).delete()
        for item in payload.items:
            db.add(ChecklistTemplateItem(template_id=template.id, title=item.title, position=item.position))
            
    db.commit()
    db.refresh(template)
    record_audit_log(db=db, action="UPDATE", entity_type="checklist_template", entity_id=template.id, user=current_user)
    return template

@router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_checklist_template(
    id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("maintenances:write")),
):
    template = db.query(ChecklistTemplate).filter(ChecklistTemplate.id == id).first()
    if not template:
        raise HTTPException(status_code=404, detail="Template não encontrado")
        
    db.delete(template)
    db.commit()
    record_audit_log(db=db, action="DELETE", entity_type="checklist_template", entity_id=id, user=current_user)
