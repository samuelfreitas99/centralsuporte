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
    return user.has_role("Administrador", "Gestor")


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
    project_id: Optional[int] = None,
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
        query = query.filter(
            or_(
                MaintenanceRecord.equipment_id == equipment_id,
                MaintenanceRecord.equipments.any(Equipment.id == equipment_id),
            )
        )

    if store_id:
        query = query.filter(MaintenanceRecord.store_id == store_id)

    if technician_id:
        query = query.filter(MaintenanceRecord.technician_id == technician_id)

    if project_id is not None:
        query = query.filter(MaintenanceRecord.project_id == project_id)

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
    equipment_ids = payload.equipment_ids or ([payload.equipment_id] if payload.equipment_id else [])
    if not equipment_ids:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Pelo menos um equipamento deve ser informado",
        )

    # Verify equipments exist
    equipments = db.query(Equipment).filter(Equipment.id.in_(equipment_ids)).all()
    found_ids = {eq.id for eq in equipments}
    missing_ids = set(equipment_ids) - found_ids
    if missing_ids:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Equipamento(s) não encontrado(s): {list(missing_ids)}",
        )

    primary_eq = equipments[0]
    store_id = payload.store_id or primary_eq.store_id
    department_id = payload.department_id or primary_eq.department_id
    technical_location_id = payload.technical_location_id or primary_eq.technical_location_id
    technician_id = payload.technician_id or current_user.id

    maintenance_dict = payload.model_dump(exclude={"checklist_title", "checklist_items", "checklist_template_id", "equipment_ids"})
    maintenance_dict["equipment_id"] = primary_eq.id
    maintenance_dict["store_id"] = store_id
    maintenance_dict["department_id"] = department_id
    maintenance_dict["technical_location_id"] = technical_location_id
    maintenance_dict["technician_id"] = technician_id

    maintenance = MaintenanceRecord(**maintenance_dict)
    maintenance.equipments = equipments
    db.add(maintenance)
    db.flush()

    # Optional checklist generation
    if payload.checklist_template_id:
        from app.models import ChecklistTemplate
        template = db.query(ChecklistTemplate).filter(ChecklistTemplate.id == payload.checklist_template_id).first()
        if template:
            checklist_title = payload.checklist_title or template.name
            checklist = Checklist(
                title=checklist_title,
                description=template.description,
                maintenance_id=maintenance.id,
                creator_id=current_user.id,
            )
            db.add(checklist)
            db.flush()
            for item in template.items:
                db.add(
                    ChecklistItem(
                        checklist_id=checklist.id,
                        title=item.title,
                        position=item.position,
                    )
                )
    elif payload.checklist_items:
        checklist_title = payload.checklist_title or f"Checklist de Manutenção: {maintenance.title}"
        eq_names = ", ".join(e.hostname or e.model or 'equipamento' for e in equipments[:3])
        if len(equipments) > 3:
            eq_names += f" e mais {len(equipments) - 3}"
        checklist = Checklist(
            title=checklist_title,
            description=f"Procedimento de verificação preventiva/corretiva para {eq_names}",
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

    # Log into Equipment History for all equipments
    type_label = payload.maintenance_type.capitalize()
    for eq in equipments:
        history = EquipmentHistory(
            equipment_id=eq.id,
            user_id=current_user.id,
            event_type="manutencao",
            description=f"Manutenção {type_label} registrada/agendada: {maintenance.title}. Status: {maintenance.status}",
        )
        db.add(history)
        if maintenance.status == "em_andamento":
            eq.status = "em_manutencao"

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

    old_equipments = list(maintenance.equipments) if maintenance.equipments else ([maintenance.equipment] if maintenance.equipment else [])
    old_eq_ids = {eq.id for eq in old_equipments}

    update_data = payload.model_dump(exclude_unset=True)
    new_equipment_ids = None
    if "equipment_ids" in update_data:
        new_equipment_ids = update_data.pop("equipment_ids")
    elif "equipment_id" in update_data and update_data["equipment_id"]:
        new_equipment_ids = [update_data["equipment_id"]]

    for field, value in update_data.items():
        setattr(maintenance, field, value)

    if new_equipment_ids is not None:
        if len(new_equipment_ids) == 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="A manutenção deve ter ao menos um equipamento vinculado",
            )
        new_equipments = db.query(Equipment).filter(Equipment.id.in_(new_equipment_ids)).all()
        found_ids = {eq.id for eq in new_equipments}
        missing_ids = set(new_equipment_ids) - found_ids
        if missing_ids:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Equipamento(s) não encontrado(s): {list(missing_ids)}",
            )
        maintenance.equipments = new_equipments
        maintenance.equipment_id = new_equipments[0].id

    db.flush()

    # Re-evaluate statuses if equipment or status changed
    current_equipments = list(maintenance.equipments) if maintenance.equipments else ([maintenance.equipment] if maintenance.equipment else [])
    current_eq_ids = {eq.id for eq in current_equipments}

    # For equipments that were removed from this maintenance
    removed_equipments = [eq for eq in old_equipments if eq.id not in current_eq_ids]
    for removed_eq in removed_equipments:
        if removed_eq.status == "em_manutencao":
            other_active = db.query(MaintenanceRecord).filter(
                MaintenanceRecord.id != maintenance.id,
                MaintenanceRecord.status == "em_andamento",
                or_(
                    MaintenanceRecord.equipment_id == removed_eq.id,
                    MaintenanceRecord.equipments.any(Equipment.id == removed_eq.id)
                )
            ).first()
            if not other_active:
                removed_eq.status = "ativo"

    # For current equipments
    for eq in current_equipments:
        if maintenance.status == "em_andamento":
            if eq.status != "em_manutencao":
                eq.status = "em_manutencao"
        elif maintenance.status in ["concluida", "cancelada"] and eq.status == "em_manutencao":
            other_active = db.query(MaintenanceRecord).filter(
                MaintenanceRecord.id != maintenance.id,
                MaintenanceRecord.status == "em_andamento",
                or_(
                    MaintenanceRecord.equipment_id == eq.id,
                    MaintenanceRecord.equipments.any(Equipment.id == eq.id)
                )
            ).first()
            if not other_active:
                eq.status = "ativo"

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

    # List of all equipments in this maintenance
    target_equipments = list(maintenance.equipments) if maintenance.equipments else ([maintenance.equipment] if maintenance.equipment else [])

    type_label = maintenance.maintenance_type.capitalize()
    res_label = maintenance.result or "Sucesso"

    if payload.status in ["concluida", "cancelada"]:
        for eq in target_equipments:
            if payload.status == "concluida":
                history = EquipmentHistory(
                    equipment_id=eq.id,
                    user_id=current_user.id,
                    event_type="manutencao",
                    description=f"Manutenção {type_label} Concluída: {maintenance.title}. Resultado: {res_label}. Procedimento: {maintenance.procedure_performed or 'Realizado conforme checklist'}",
                )
                db.add(history)

            if eq.status == "em_manutencao":
                other_active = db.query(MaintenanceRecord).filter(
                    MaintenanceRecord.id != maintenance.id,
                    MaintenanceRecord.status == "em_andamento",
                    or_(
                        MaintenanceRecord.equipment_id == eq.id,
                        MaintenanceRecord.equipments.any(Equipment.id == eq.id)
                    )
                ).first()

                if not other_active:
                    eq.status = "ativo"
                    history_eq = EquipmentHistory(
                        equipment_id=eq.id,
                        user_id=current_user.id,
                        event_type="mudanca_status",
                        description=f"Status retornado para Ativo após {payload.status} dos procedimentos de manutenção.",
                    )
                    db.add(history_eq)

    elif payload.status == "em_andamento":
        for eq in target_equipments:
            if eq.status != "em_manutencao":
                eq.status = "em_manutencao"

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
