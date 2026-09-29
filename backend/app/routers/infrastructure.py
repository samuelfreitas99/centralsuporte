from typing import List, Optional
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_

from app.database import get_db
from app.models import (
    User,
    Store,
    Department,
    Equipment,
    EquipmentHistory,
    License,
    LicenseAssignment,
    StockItem,
    StockMovement,
    TechnicalLocation,
)
from app.schemas import (
    StoreCreate,
    StoreUpdate,
    StoreResponse,
    DepartmentCreate,
    DepartmentUpdate,
    DepartmentResponse,
    TechnicalLocationCreate,
    TechnicalLocationUpdate,
    TechnicalLocationResponse,
    EquipmentCreate,
    EquipmentUpdate,
    EquipmentResponse,
    EquipmentHistoryCreate,
    EquipmentHistoryResponse,
    LicenseCreate,
    LicenseUpdate,
    LicenseResponse,
    LicenseAssignmentCreate,
    LicenseAssignmentResponse,
    StockItemCreate,
    StockItemUpdate,
    StockItemResponse,
    StockMovementCreate,
    StockMovementUpdate,
    StockMovementResponse,
)
from app.auth import get_current_active_user

router = APIRouter(
    prefix="/infrastructure",
    tags=["Infrastructure"],
)


# ============================================================================
# 1. LOJAS (STORES) & DEPARTAMENTOS
# ============================================================================

@router.get("/stores", response_model=List[StoreResponse])
def list_stores(
    status: Optional[str] = Query(None, description="Filtro por status: ativa, inativa, reforma"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    query = db.query(Store)
    if status:
        query = query.filter(Store.status == status)
    else:
        query = query.filter(Store.status != "inativa")
    return query.order_by(Store.name.asc()).all()


@router.post("/stores", response_model=StoreResponse, status_code=status.HTTP_201_CREATED)
def create_store(
    store_in: StoreCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    if store_in.code:
        existing = db.query(Store).filter(Store.code == store_in.code).first()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Código de loja '{store_in.code}' já está cadastrado.",
            )

    store = Store(**store_in.model_dump())
    db.add(store)
    db.commit()
    db.refresh(store)
    return store


@router.get("/stores/{store_id}", response_model=StoreResponse)
def get_store(
    store_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    store = db.query(Store).filter(Store.id == store_id).first()
    if not store:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Loja não encontrada.")
    return store


@router.put("/stores/{store_id}", response_model=StoreResponse)
def update_store(
    store_id: int,
    store_in: StoreUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    store = db.query(Store).filter(Store.id == store_id).first()
    if not store:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Loja não encontrada.")

    update_data = store_in.model_dump(exclude_unset=True)
    if "code" in update_data and update_data["code"] and update_data["code"] != store.code:
        existing = db.query(Store).filter(Store.code == update_data["code"]).first()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Código de loja '{update_data['code']}' já está cadastrado.",
            )

    for field, value in update_data.items():
        setattr(store, field, value)

    db.commit()
    db.refresh(store)
    return store


@router.delete("/stores/{store_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_store(
    store_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    store = db.query(Store).filter(Store.id == store_id).first()
    if not store:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Loja não encontrada.")

    # Check for active equipment or locations before archiving
    active_equipment = db.query(Equipment).filter(Equipment.store_id == store.id, Equipment.status != "descartado").first()
    if active_equipment:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Não é possível arquivar loja com equipamentos ativos.")
        
    store.status = "inativa"
    db.commit()
    return None


@router.get("/departments", response_model=List[DepartmentResponse])
def list_departments(
    store_id: Optional[int] = Query(None, description="Filtrar por loja"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    query = db.query(Department)
    if store_id:
        query = query.filter(Department.store_id == store_id)
    return query.order_by(Department.name.asc()).all()


@router.post("/departments", response_model=DepartmentResponse, status_code=status.HTTP_201_CREATED)
def create_department(
    dept_in: DepartmentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    if dept_in.store_id:
        store = db.query(Store).filter(Store.id == dept_in.store_id).first()
        if not store:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Loja informada não existe.")

    dept = Department(**dept_in.model_dump())
    db.add(dept)
    db.commit()
    db.refresh(dept)
    return dept


@router.put("/departments/{department_id}", response_model=DepartmentResponse)
def update_department(
    department_id: int,
    dept_in: DepartmentUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    dept = db.query(Department).filter(Department.id == department_id).first()
    if not dept:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Departamento não encontrado.")

    update_data = dept_in.model_dump(exclude_unset=True)
    if "store_id" in update_data and update_data["store_id"]:
        store = db.query(Store).filter(Store.id == update_data["store_id"]).first()
        if not store:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Loja informada não existe.")

    for field, value in update_data.items():
        setattr(dept, field, value)

    db.commit()
    db.refresh(dept)
    return dept


@router.delete("/departments/{department_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_department(
    department_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    dept = db.query(Department).filter(Department.id == department_id).first()
    if not dept:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Departamento não encontrado.")

    active_equipment = db.query(Equipment).filter(Equipment.department_id == dept.id, Equipment.status != "descartado").first()
    if active_equipment:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Não é possível arquivar setor com equipamentos ativos.")

    dept.status = "inativa"
    db.commit()
    return None

# ============================================================================
# 1.5 LOCAIS TÉCNICOS (TECHNICAL LOCATIONS)
# ============================================================================

@router.get("/locations", response_model=List[TechnicalLocationResponse])
def list_locations(
    store_id: Optional[int] = Query(None, description="Filtrar por loja"),
    department_id: Optional[int] = Query(None, description="Filtrar por departamento"),
    location_type: Optional[str] = Query(None, description="Filtrar por tipo"),
    q: Optional[str] = Query(None, description="Busca textual por nome"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    query = db.query(TechnicalLocation)

    if store_id:
        query = query.filter(TechnicalLocation.store_id == store_id)
    if department_id:
        query = query.filter(TechnicalLocation.department_id == department_id)
    if location_type:
        query = query.filter(TechnicalLocation.location_type == location_type)
    if q:
        query = query.filter(TechnicalLocation.name.ilike(f"%{q}%"))

    return query.order_by(TechnicalLocation.name.asc()).all()


@router.get("/locations/{location_id}", response_model=TechnicalLocationResponse)
def get_location(
    location_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    loc = db.query(TechnicalLocation).filter(TechnicalLocation.id == location_id).first()
    if not loc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Local técnico não encontrado.")
    return loc


@router.post("/locations", response_model=TechnicalLocationResponse, status_code=status.HTTP_201_CREATED)
def create_location(
    loc_in: TechnicalLocationCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    store = db.query(Store).filter(Store.id == loc_in.store_id).first()
    if not store:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Loja informada não existe.")

    if loc_in.department_id:
        dept = db.query(Department).filter(Department.id == loc_in.department_id).first()
        if not dept:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Departamento informado não existe.")
        if dept.store_id != loc_in.store_id:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Departamento não pertence à loja informada.")

    loc = TechnicalLocation(**loc_in.model_dump())
    db.add(loc)
    db.commit()
    db.refresh(loc)
    return loc


@router.put("/locations/{location_id}", response_model=TechnicalLocationResponse)
def update_location(
    location_id: int,
    loc_in: TechnicalLocationUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    loc = db.query(TechnicalLocation).filter(TechnicalLocation.id == location_id).first()
    if not loc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Local técnico não encontrado.")

    update_data = loc_in.model_dump(exclude_unset=True)
    
    new_store_id = update_data.get("store_id", loc.store_id)
    new_department_id = update_data.get("department_id", loc.department_id)

    if new_department_id:
        dept = db.query(Department).filter(Department.id == new_department_id).first()
        if not dept:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Departamento informado não existe.")
        if dept.store_id != new_store_id:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Departamento não pertence à loja do local técnico.")

    for key, value in update_data.items():
        setattr(loc, key, value)

    db.commit()
    db.refresh(loc)
    return loc


@router.delete("/locations/{location_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_location(
    location_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    loc = db.query(TechnicalLocation).filter(TechnicalLocation.id == location_id).first()
    if not loc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Local técnico não encontrado.")

    active_equipment = db.query(Equipment).filter(Equipment.technical_location_id == loc.id, Equipment.status != "descartado").first()
    if active_equipment:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Não é possível arquivar local técnico com equipamentos ativos.")

    loc.status = "inativa"
    db.commit()
    return None


# 2. EQUIPAMENTOS (EQUIPMENT) & HISTÓRICO
# ============================================================================

@router.get("/equipment", response_model=List[EquipmentResponse])
def list_equipment(
    q: Optional[str] = Query(None, description="Busca textual por hostname, patrimônio, IP, modelo"),
    store_id: Optional[int] = Query(None, description="Filtrar por loja"),
    department_id: Optional[int] = Query(None, description="Filtrar por departamento"),
    technical_location_id: Optional[int] = Query(None, description="Filtrar por local técnico"),
    equipment_type: Optional[str] = Query(None, description="Filtrar por tipo de equipamento"),
    status: Optional[str] = Query(None, description="Filtrar por status: ativo, em_manutencao, reserva, descartado"),
    project_id: Optional[int] = Query(None, description="Filtrar por projeto"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    query = db.query(Equipment)

    if q:
        search = f"%{q}%"
        query = query.filter(
            or_(
                Equipment.hostname.ilike(search),
                Equipment.patrimony.ilike(search),
                Equipment.ip_address.ilike(search),
                Equipment.mac_address.ilike(search),
                Equipment.brand.ilike(search),
                Equipment.model.ilike(search),
                Equipment.assigned_user.ilike(search),
                Equipment.serial_number.ilike(search),
            )
        )

    if store_id:
        query = query.filter(Equipment.store_id == store_id)
    if department_id:
        query = query.filter(Equipment.department_id == department_id)
    if technical_location_id:
        query = query.filter(Equipment.technical_location_id == technical_location_id)
    if equipment_type:
        query = query.filter(Equipment.equipment_type == equipment_type)
    if status:
        query = query.filter(Equipment.status == status)
    else:
        query = query.filter(Equipment.status != "descartado")

    if project_id:
        query = query.filter(Equipment.projects.any(id=project_id))

    return query.order_by(Equipment.hostname.asc(), Equipment.id.desc()).all()


@router.post("/equipment", response_model=EquipmentResponse, status_code=status.HTTP_201_CREATED)
def create_equipment(
    eq_in: EquipmentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    if eq_in.patrimony:
        existing = db.query(Equipment).filter(Equipment.patrimony == eq_in.patrimony).first()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Patrimônio '{eq_in.patrimony}' já está cadastrado em outro equipamento.",
            )

    if eq_in.technical_location_id:
        loc = db.query(TechnicalLocation).filter(TechnicalLocation.id == eq_in.technical_location_id).first()
        if not loc:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Local técnico não encontrado.")
        if eq_in.store_id and eq_in.store_id != loc.store_id:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Local técnico não pertence à loja selecionada.")
        if eq_in.department_id and loc.department_id and eq_in.department_id != loc.department_id:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Local técnico não pertence ao setor selecionado.")

    equipment = Equipment(**eq_in.model_dump())
    db.add(equipment)
    db.flush()

    # Initial history entry
    initial_event = EquipmentHistory(
        equipment_id=equipment.id,
        user_id=current_user.id,
        event_type="cadastro",
        description=f"Equipamento cadastrado por {current_user.username}.",
    )
    db.add(initial_event)
    db.commit()
    db.refresh(equipment)
    return equipment


@router.get("/equipment/{equipment_id}", response_model=EquipmentResponse)
def get_equipment(
    equipment_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    equipment = db.query(Equipment).filter(Equipment.id == equipment_id).first()
    if not equipment:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Equipamento não encontrado.")
    return equipment


@router.put("/equipment/{equipment_id}", response_model=EquipmentResponse)
def update_equipment(
    equipment_id: int,
    eq_in: EquipmentUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    equipment = db.query(Equipment).filter(Equipment.id == equipment_id).first()
    if not equipment:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Equipamento não encontrado.")

    update_data = eq_in.model_dump(exclude_unset=True)

    if "patrimony" in update_data and update_data["patrimony"] and update_data["patrimony"] != equipment.patrimony:
        existing = db.query(Equipment).filter(Equipment.patrimony == update_data["patrimony"]).first()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Patrimônio '{update_data['patrimony']}' já está em uso.",
            )

    new_store_id = update_data.get("store_id", equipment.store_id)
    new_department_id = update_data.get("department_id", equipment.department_id)
    new_tech_loc_id = update_data.get("technical_location_id", equipment.technical_location_id)

    if new_tech_loc_id:
        loc = db.query(TechnicalLocation).filter(TechnicalLocation.id == new_tech_loc_id).first()
        if not loc:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Local técnico não encontrado.")
        if new_store_id and new_store_id != loc.store_id:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Local técnico não pertence à loja selecionada.")
        if new_department_id and loc.department_id and new_department_id != loc.department_id:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Local técnico não pertence ao setor selecionado.")

    # Automatic history tracking for key infrastructure changes
    history_events = []
    if "ip_address" in update_data and update_data["ip_address"] != equipment.ip_address:
        history_events.append(
            f"Alteração de IP: {equipment.ip_address or 'nenhum'} → {update_data['ip_address']}"
        )
    if "mac_address" in update_data and update_data["mac_address"] != equipment.mac_address:
        history_events.append(
            f"Alteração de MAC: {equipment.mac_address or 'nenhum'} → {update_data['mac_address']}"
        )
    if "status" in update_data and update_data["status"] != equipment.status:
        history_events.append(
            f"Mudança de status: {equipment.status} → {update_data['status']}"
        )
    if "store_id" in update_data and update_data["store_id"] != equipment.store_id:
        history_events.append(
            f"Transferência de Loja (ID {equipment.store_id or 'nenhuma'} → {update_data['store_id']})"
        )
    if "assigned_user" in update_data and update_data["assigned_user"] != equipment.assigned_user:
        history_events.append(
            f"Alteração de responsável: {equipment.assigned_user or 'nenhum'} → {update_data['assigned_user']}"
        )

    for field, value in update_data.items():
        setattr(equipment, field, value)

    for event_desc in history_events:
        history_entry = EquipmentHistory(
            equipment_id=equipment.id,
            user_id=current_user.id,
            event_type="alteracao_configuracao",
            description=f"{event_desc} (por {current_user.username}).",
        )
        db.add(history_entry)

    db.commit()
    db.refresh(equipment)
    return equipment


@router.delete("/equipment/{equipment_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_equipment(
    equipment_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    equipment = db.query(Equipment).filter(Equipment.id == equipment_id).first()
    if not equipment:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Equipamento não encontrado.")

    equipment.status = "descartado"
    
    history_entry = EquipmentHistory(
        equipment_id=equipment.id,
        user_id=current_user.id,
        event_type="exclusao",
        description=f"Equipamento descartado do sistema operacional (Soft Delete) por {current_user.username}.",
    )
    db.add(history_entry)

    db.commit()
    return None


@router.post("/equipment/{equipment_id}/history", response_model=EquipmentHistoryResponse, status_code=status.HTTP_201_CREATED)
def add_equipment_history(
    equipment_id: int,
    history_in: EquipmentHistoryCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    equipment = db.query(Equipment).filter(Equipment.id == equipment_id).first()
    if not equipment:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Equipamento não encontrado.")

    history_entry = EquipmentHistory(
        equipment_id=equipment.id,
        user_id=current_user.id,
        event_type=history_in.event_type,
        description=history_in.description,
    )
    db.add(history_entry)
    db.commit()
    db.refresh(history_entry)
    return history_entry


# ============================================================================
# 3. LICENÇAS DE SOFTWARE & ASSENTOS
# ============================================================================

@router.get("/licenses", response_model=List[LicenseResponse])
def list_licenses(
    status_filter: Optional[str] = Query(None, alias="status", description="Filtrar por status: ativa, vencida, cancelada"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    query = db.query(License)
    if status_filter:
        query = query.filter(License.status == status_filter)
    else:
        query = query.filter(License.status != "cancelada")

    licenses = query.order_by(License.name.asc()).all()
    # Compute used_seats dynamically and redact license_key
    results = []
    for lic in licenses:
        lic.used_seats = len(lic.assignments)
        resp = LicenseResponse.model_validate(lic)
        if resp.license_key:
            resp.license_key = "[REDACTED]"
        results.append(resp)
    return results


@router.post("/licenses", response_model=LicenseResponse, status_code=status.HTTP_201_CREATED)
def create_license(
    lic_in: LicenseCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    lic = License(**lic_in.model_dump())
    db.add(lic)
    db.commit()
    db.refresh(lic)
    lic.used_seats = 0
    resp = LicenseResponse.model_validate(lic)
    if resp.license_key:
        resp.license_key = "[REDACTED]"
    return resp


@router.get("/licenses/{license_id}", response_model=LicenseResponse)
def get_license(
    license_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    lic = db.query(License).filter(License.id == license_id).first()
    if not lic:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Licença não encontrada.")
    lic.used_seats = len(lic.assignments)
    resp = LicenseResponse.model_validate(lic)
    if resp.license_key:
        resp.license_key = "[REDACTED]"
    return resp


@router.put("/licenses/{license_id}", response_model=LicenseResponse)
def update_license(
    license_id: int,
    lic_in: LicenseUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    lic = db.query(License).filter(License.id == license_id).first()
    if not lic:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Licença não encontrada.")

    for field, value in lic_in.model_dump(exclude_unset=True).items():
        if field == "license_key" and value == "[REDACTED]":
            continue
        setattr(lic, field, value)

    db.commit()
    db.refresh(lic)
    lic.used_seats = len(lic.assignments)
    resp = LicenseResponse.model_validate(lic)
    if resp.license_key:
        resp.license_key = "[REDACTED]"
    return resp


@router.delete("/licenses/{license_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_license(
    license_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    lic = db.query(License).filter(License.id == license_id).first()
    if not lic:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Licença não encontrada.")

    lic.status = "cancelada"
    db.commit()
    return None

@router.post("/licenses/{license_id}/reveal", response_model=dict)
def reveal_license(
    license_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    lic = db.query(License).filter(License.id == license_id).first()
    if not lic:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Licença não encontrada.")

    from app.models import AuditLog
    
    audit = AuditLog(
        user_id=current_user.id,
        username=current_user.username,
        action="REVEAL_LICENSE_KEY",
        entity_type="license",
        entity_id=lic.id,
        details=f"Usuário revelou a chave da licença '{lic.name}'.",
    )
    db.add(audit)
    db.commit()

    return {"license_key": lic.license_key}


@router.post("/licenses/{license_id}/assignments", response_model=LicenseAssignmentResponse, status_code=status.HTTP_201_CREATED)
def assign_license_seat(
    license_id: int,
    assignment_in: LicenseAssignmentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    lic = db.query(License).filter(License.id == license_id).first()
    if not lic:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Licença não encontrada.")

    current_used = len(lic.assignments)
    if current_used >= lic.total_seats:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Limite de assentos atingido ({current_used}/{lic.total_seats}).",
        )

    assignment = LicenseAssignment(
        license_id=lic.id,
        equipment_id=assignment_in.equipment_id,
        assigned_to=assignment_in.assigned_to,
        notes=assignment_in.notes,
    )
    db.add(assignment)
    db.commit()
    db.refresh(assignment)
    return assignment


@router.delete("/licenses/{license_id}/assignments/{assignment_id}", status_code=status.HTTP_204_NO_CONTENT)
def revoke_license_seat(
    license_id: int,
    assignment_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    assignment = (
        db.query(LicenseAssignment)
        .filter(LicenseAssignment.id == assignment_id, LicenseAssignment.license_id == license_id)
        .first()
    )
    if not assignment:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Atribuição de licença não encontrada.")

    db.delete(assignment)
    db.commit()
    return None


# ============================================================================
# 4. ESTOQUE OPERACIONAL (STOCK ITEMS & MOVEMENTS)
# ============================================================================

@router.get("/stock/items", response_model=List[StockItemResponse])
def list_stock_items(
    q: Optional[str] = Query(None, description="Busca textual por nome ou part number"),
    category: Optional[str] = Query(None, description="Filtrar por categoria"),
    low_stock_only: bool = Query(False, description="Filtrar apenas itens com estoque crítico"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    query = db.query(StockItem)

    if q:
        search = f"%{q}%"
        query = query.filter(
            or_(
                StockItem.name.ilike(search),
                StockItem.part_number.ilike(search),
                StockItem.location.ilike(search),
            )
        )

    if category:
        query = query.filter(StockItem.category == category)

    items = query.order_by(StockItem.name.asc()).all()

    for item in items:
        item.is_low_stock = item.current_quantity <= item.min_quantity

    if low_stock_only:
        items = [i for i in items if i.is_low_stock]

    return items


@router.post("/stock/items", response_model=StockItemResponse, status_code=status.HTTP_201_CREATED)
def create_stock_item(
    item_in: StockItemCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    item = StockItem(**item_in.model_dump())
    db.add(item)
    db.commit()
    db.refresh(item)
    item.is_low_stock = item.current_quantity <= item.min_quantity
    return item


@router.get("/stock/items/{item_id}", response_model=StockItemResponse)
def get_stock_item(
    item_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    item = db.query(StockItem).filter(StockItem.id == item_id).first()
    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Item de estoque não encontrado.")
    item.is_low_stock = item.current_quantity <= item.min_quantity
    return item


@router.put("/stock/items/{item_id}", response_model=StockItemResponse)
def update_stock_item(
    item_id: int,
    item_in: StockItemUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    item = db.query(StockItem).filter(StockItem.id == item_id).first()
    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Item de estoque não encontrado.")

    for field, value in item_in.model_dump(exclude_unset=True).items():
        setattr(item, field, value)

    db.commit()
    db.refresh(item)
    item.is_low_stock = item.current_quantity <= item.min_quantity
    return item


@router.delete("/stock/items/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_stock_item(
    item_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    item = db.query(StockItem).filter(StockItem.id == item_id).first()
    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Item de estoque não encontrado.")

    db.delete(item)
    db.commit()
    return None


@router.post("/stock/items/{item_id}/movements", response_model=StockMovementResponse, status_code=status.HTTP_201_CREATED)
def register_stock_movement(
    item_id: int,
    movement_in: StockMovementCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    item = db.query(StockItem).filter(StockItem.id == item_id).first()
    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Item de estoque não encontrado.")

    if movement_in.quantity <= 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Quantidade movimentada deve ser maior que zero.",
        )

    # Calculate new inventory balance
    # "entrada", "devolucao" increase balance
    # "saida", "transferencia", "baixa" decrease balance
    mov_type = movement_in.movement_type.lower()
    if mov_type in ["entrada", "devolucao"]:
        item.current_quantity += movement_in.quantity
    elif mov_type in ["saida", "transferencia", "baixa", "reserva"]:
        if item.current_quantity < movement_in.quantity:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Saldo insuficiente em estoque. Disponível: {item.current_quantity} {item.unit}(s).",
            )
        item.current_quantity -= movement_in.quantity
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Tipo de movimentação inválido: '{movement_in.movement_type}'. Tipos permitidos: entrada, saida, transferencia, baixa, devolucao.",
        )

    movement = StockMovement(
        stock_item_id=item.id,
        user_id=current_user.id,
        movement_type=mov_type,
        quantity=movement_in.quantity,
        store_id=movement_in.store_id,
        attendance_id=movement_in.attendance_id,
        project_id=movement_in.project_id,
        reason=movement_in.reason,
    )
    db.add(movement)
    db.commit()
    db.refresh(movement)
    return movement

@router.get("/stock/movements", response_model=List[StockMovementResponse])
def list_stock_movements(
    project_id: Optional[int] = None,
    item_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    query = db.query(StockMovement)
    if project_id is not None:
        query = query.filter(StockMovement.project_id == project_id)
    if item_id is not None:
        query = query.filter(StockMovement.stock_item_id == item_id)
        
    return query.order_by(StockMovement.created_at.desc()).all()

@router.put("/stock/movements/{movement_id}", response_model=StockMovementResponse)
def update_stock_movement(
    movement_id: int,
    payload: StockMovementUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    movement = db.query(StockMovement).filter(StockMovement.id == movement_id).first()
    if not movement:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Movimentação não encontrada.")
        
    update_data = payload.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(movement, key, value)
        
    db.commit()
    db.refresh(movement)
    return movement
