from typing import List, Optional
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import or_, func

from app.database import get_db
from app.models import (
    MaintenanceRecord,
    Equipment,
    EquipmentHistory,
    Store,
    User,
    Checklist,
    ChecklistItem,
)
from app.auth import get_current_active_user
from app.schemas import (
    MaintenanceRecordCreate,
    MaintenanceRecordUpdate,
    MaintenanceRecordStatusUpdate,
    MaintenanceRecordResponse,
    MaintenanceSummaryMetrics,
    ChecklistCreate,
    ChecklistResponse,
)

router = APIRouter(prefix="/maintenances", tags=["Maintenances"])


def is_admin_or_manager(user: User) -> bool:
    return bool(user.role and user.role.name in ["Administrador", "Gestor"])


@router.get("/metrics/summary", response_model=MaintenanceSummaryMetrics)
def get_maintenance_metrics(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    total = db.query(func.count(MaintenanceRecord.id)).scalar() or 0
    agendadas = db.query(func.count(MaintenanceRecord.id)).filter(MaintenanceRecord.status == "agendada").scalar() or 0
    em_andamento = db.query(func.count(MaintenanceRecord.id)).filter(MaintenanceRecord.status == "em_andamento").scalar() or 0
    concluidas = db.query(func.count(MaintenanceRecord.id)).filter(MaintenanceRecord.status == "concluida").scalar() or 0
    preventivas = db.query(func.count(MaintenanceRecord.id)).filter(MaintenanceRecord.maintenance_type == "preventiva").scalar() or 0
    corretivas = db.query(func.count(MaintenanceRecord.id)).filter(MaintenanceRecord.maintenance_type == "corretiva").scalar() or 0

    return MaintenanceSummaryMetrics(
        total=total,
        agendadas=agendadas,
        em_andamento=em_andamento,
        concluidas=concluidas,
        preventivas=preventivas,
        corretivas=corretivas,
    )


@router.get("", response_model=List[MaintenanceRecordResponse])
def list_maintenances(
    status: Optional[str] = None,
    maintenance_type: Optional[str] = None,
    priority: Optional[str] = None,
    equipment_id: Optional[int] = None,
    store_id: Optional[int] = None,
    technician_id: Optional[int] = None,
    search: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    query = db.query(MaintenanceRecord)

    if status:
        query = query.filter(MaintenanceRecord.status == status)

    if maintenance_type:
        query = query.filter(MaintenanceRecord.maintenance_type == maintenance_type)

    if priority:
        query = query.filter(MaintenanceRecord.priority == priority)

    if equipment_id:
        query = query.filter(MaintenanceRecord.equipment_id == equipment_id)

    if store_id:
        query = query.filter(MaintenanceRecord.store_id == store_id)

    if technician_id:
        query = query.filter(MaintenanceRecord.technician_id == technician_id)

    if search:
        search_filter = or_(
            MaintenanceRecord.title.ilike(f"%{search}%"),
            MaintenanceRecord.description.ilike(f"%{search}%"),
            MaintenanceRecord.diagnosis.ilike(f"%{search}%"),
            MaintenanceRecord.procedure_performed.ilike(f"%{search}%"),
            MaintenanceRecord.internal_notes.ilike(f"%{search}%"),
        )
        query = query.filter(search_filter)

    return query.order_by(MaintenanceRecord.created_at.desc()).all()


@router.get("/{id}", response_model=MaintenanceRecordResponse)
def get_maintenance(
    id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    maintenance = db.query(MaintenanceRecord).filter(MaintenanceRecord.id == id).first()
    if not maintenance:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Registro de manutenção não encontrado",
        )
    return maintenance


@router.post("", response_model=MaintenanceRecordResponse, status_code=status.HTTP_201_CREATED)
def create_maintenance(
    payload: MaintenanceRecordCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    # Verify equipment exists
    equipment = db.query(Equipment).filter(Equipment.id == payload.equipment_id).first()
    if not equipment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Equipamento ID {payload.equipment_id} não encontrado",
        )

    # If store_id not provided, inherit from equipment
    store_id = payload.store_id or equipment.store_id
    technician_id = payload.technician_id or current_user.id

    maintenance_dict = payload.model_dump(exclude={"checklist_title", "checklist_items"})
    maintenance_dict["store_id"] = store_id
    maintenance_dict["technician_id"] = technician_id

    maintenance = MaintenanceRecord(**maintenance_dict)
    db.add(maintenance)
    db.flush()

    # Optional checklist generation
    if payload.checklist_items:
        checklist_title = payload.checklist_title or f"Checklist de Manutenção: {maintenance.title}"
        checklist = Checklist(
            title=checklist_title,
            description=f"Procedimento de verificação preventiva/corretiva para {equipment.hostname or equipment.model or 'equipamento'}",
            maintenance_id=maintenance.id,
            creator_id=current_user.id,
        )
        db.add(checklist)
        db.flush()

        for idx, item_title in enumerate(payload.checklist_items):
            db.add(
                ChecklistItem(
                    checklist_id=checklist.id,
                    title=item_title,
                    position=idx,
                )
            )

    # Log into Equipment History
    type_label = payload.maintenance_type.capitalize()
    history = EquipmentHistory(
        equipment_id=equipment.id,
        user_id=current_user.id,
        event_type="manutencao",
        description=f"Manutenção {type_label} registrada/agendada: {maintenance.title}. Status: {maintenance.status}",
    )
    db.add(history)

    # If maintenance is in progress, update equipment status to em_manutencao
    if maintenance.status == "em_andamento":
        equipment.status = "em_manutencao"

    db.commit()
    db.refresh(maintenance)
    return maintenance


@router.put("/{id}", response_model=MaintenanceRecordResponse)
def update_maintenance(
    id: int,
    payload: MaintenanceRecordUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    maintenance = db.query(MaintenanceRecord).filter(MaintenanceRecord.id == id).first()
    if not maintenance:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Registro de manutenção não encontrado",
        )

    update_data = payload.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(maintenance, field, value)

    # Sync equipment status if changed to em_andamento
    if payload.status == "em_andamento" and maintenance.equipment:
        maintenance.equipment.status = "em_manutencao"
    elif payload.status == "concluida" and maintenance.equipment and maintenance.equipment.status == "em_manutencao":
        maintenance.equipment.status = "ativo"

    db.commit()
    db.refresh(maintenance)
    return maintenance


@router.patch("/{id}/status", response_model=MaintenanceRecordResponse)
def update_maintenance_status(
    id: int,
    payload: MaintenanceRecordStatusUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    maintenance = db.query(MaintenanceRecord).filter(MaintenanceRecord.id == id).first()
    if not maintenance:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Registro de manutenção não encontrado",
        )

    maintenance.status = payload.status
    if payload.result:
        maintenance.result = payload.result
    if payload.procedure_performed:
        maintenance.procedure_performed = payload.procedure_performed
    if payload.performed_date:
        maintenance.performed_date = payload.performed_date
    elif payload.status == "concluida" and not maintenance.performed_date:
        maintenance.performed_date = datetime.utcnow()

    # If concluded, log history and return equipment status
    if payload.status == "concluida":
        equipment = maintenance.equipment
        type_label = maintenance.maintenance_type.capitalize()
        res_label = maintenance.result or "Sucesso"

        history = EquipmentHistory(
            equipment_id=maintenance.equipment_id,
            user_id=current_user.id,
            event_type="manutencao",
            description=f"Manutenção {type_label} Concluída: {maintenance.title}. Resultado: {res_label}. Procedimento: {maintenance.procedure_performed or 'Realizado conforme checklist'}",
        )
        db.add(history)

        if equipment and equipment.status == "em_manutencao":
            equipment.status = "ativo"
            history_eq = EquipmentHistory(
                equipment_id=equipment.id,
                user_id=current_user.id,
                event_type="mudanca_status",
                description="Status retornado para Ativo após conclusão dos procedimentos de manutenção.",
            )
            db.add(history_eq)

    elif payload.status == "em_andamento" and maintenance.equipment:
        maintenance.equipment.status = "em_manutencao"

    db.commit()
    db.refresh(maintenance)
    return maintenance


@router.post("/{id}/checklists", response_model=ChecklistResponse, status_code=status.HTTP_201_CREATED)
def create_maintenance_checklist(
    id: int,
    payload: ChecklistCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    maintenance = db.query(MaintenanceRecord).filter(MaintenanceRecord.id == id).first()
    if not maintenance:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Registro de manutenção não encontrado",
        )

    checklist = Checklist(
        title=payload.title,
        description=payload.description,
        maintenance_id=maintenance.id,
        creator_id=current_user.id,
    )
    db.add(checklist)
    db.flush()

    if payload.items:
        for idx, item in enumerate(payload.items):
            db.add(
                ChecklistItem(
                    checklist_id=checklist.id,
                    title=item.title,
                    position=item.position if item.position is not None else idx,
                )
            )

    db.commit()
    db.refresh(checklist)
    return checklist


@router.delete("/{id}")
def delete_maintenance(
    id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    maintenance = db.query(MaintenanceRecord).filter(MaintenanceRecord.id == id).first()
    if not maintenance:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Registro de manutenção não encontrado",
        )

    if not is_admin_or_manager(current_user) and maintenance.technician_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Permissão insuficiente para excluir este registro de manutenção",
        )

    db.delete(maintenance)
    db.commit()
    return {"message": "Registro de manutenção excluído com sucesso"}
