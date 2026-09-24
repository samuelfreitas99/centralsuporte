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
)
from app.schemas import (
    StoreCreate,
    StoreUpdate,
    StoreResponse,
    DepartmentCreate,
    DepartmentUpdate,
    DepartmentResponse,
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
    StockMovementResponse,
)
from app.auth import get_current_active_user

router = APIRouter(
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

    db.delete(store)
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


@router.delete("/departments/{department_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_department(
    department_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    dept = db.query(Department).filter(Department.id == department_id).first()
    if not dept:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Departamento não encontrado.")

    db.delete(dept)
    db.commit()
    return None


# ============================================================================
# 2. EQUIPAMENTOS (EQUIPMENT) & HISTÓRICO
# ============================================================================

@router.get("/equipment", response_model=List[EquipmentResponse])
def list_equipment(
    q: Optional[str] = Query(None, description="Busca textual por hostname, patrimônio, IP, modelo"),
    store_id: Optional[int] = Query(None, description="Filtrar por loja"),
    department_id: Optional[int] = Query(None, description="Filtrar por departamento"),
    equipment_type: Optional[str] = Query(None, description="Filtrar por tipo de equipamento"),
    status: Optional[str] = Query(None, description="Filtrar por status: ativo, em_manutencao, reserva, descartado"),
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
    if equipment_type:
        query = query.filter(Equipment.equipment_type == equipment_type)
    if status:
        query = query.filter(Equipment.status == status)

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

    db.delete(equipment)
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

    licenses = query.order_by(License.name.asc()).all()
    # Compute used_seats dynamically
    for lic in licenses:
        lic.used_seats = len(lic.assignments)
    return licenses


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
    return lic


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
    return lic


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
        setattr(lic, field, value)

    db.commit()
    db.refresh(lic)
    lic.used_seats = len(lic.assignments)
    return lic


@router.delete("/licenses/{license_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_license(
    license_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    lic = db.query(License).filter(License.id == license_id).first()
    if not lic:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Licença não encontrada.")

    db.delete(lic)
    db.commit()
    return None


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
        reason=movement_in.reason,
    )
    db.add(movement)
    db.commit()
    db.refresh(movement)
    return movement
