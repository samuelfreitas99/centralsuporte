import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from datetime import datetime, timedelta

from app.main import app
from app.database import get_db, Base, engine
from app.models import (
    User, Role, Project, Task, MaintenanceRecord, Attendance, 
    Checklist, CalendarEvent, StockMovement, Equipment, Store, StockItem
)
from app.auth import get_password_hash

client = TestClient(app)

@pytest.fixture(scope="module")
def setup_db():
    Base.metadata.create_all(bind=engine)
    db = next(get_db())

    # Create admin user
    role = db.query(Role).filter_by(name="Administrador").first()
    if not role:
        role = Role(name="Administrador")
        db.add(role)
        db.commit()

    admin = db.query(User).filter_by(username="admin_test_1033").first()
    if not admin:
        admin = User(
            username="admin_test_1033",
            email="admin_test_1033@example.com",
            hashed_password=get_password_hash("testpass"),
            role_id=role.id,
            is_active=True
        )
        db.add(admin)
        db.commit()

    # Create a store for tests
    store = db.query(Store).filter_by(name="Test Store 1033").first()
    if not store:
        store = Store(name="Test Store 1033", code="TS1033")
        db.add(store)
        db.commit()
        db.refresh(store)

    # Create a stock item for tests
    stock_item = db.query(StockItem).filter_by(name="Test Item 1033").first()
    if not stock_item:
        stock_item = StockItem(name="Test Item 1033", current_quantity=100, min_quantity=10, unit="unidade", category="outros")
        db.add(stock_item)
        db.commit()
        db.refresh(stock_item)
        
    # Create an equipment for tests
    equipment = db.query(Equipment).filter_by(hostname="equip1033").first()
    if not equipment:
        equipment = Equipment(hostname="equip1033", equipment_type="Desktop", status="Ativo", store_id=store.id)
        db.add(equipment)
        db.commit()
        db.refresh(equipment)

    yield {
        "admin": admin,
        "store": store,
        "stock_item": stock_item,
        "equipment": equipment
    }

@pytest.fixture(scope="module")
def token(setup_db):
    response = client.post(
        "/auth/login",
        json={"username": "admin_test_1033", "password": "testpass"}
    )
    assert response.status_code == 200, response.json()
    return response.json()["access_token"]

@pytest.fixture(scope="module")
def headers(token):
    return {"Authorization": f"Bearer {token}"}

def test_project_integration_flow(headers, setup_db):
    db = next(get_db())
    
    # 1. Criar projeto
    project_payload = {
        "title": "Integration Test Project 1033",
        "description": "Test phase 10.3.3",
        "status": "Planejamento",
        "priority": "Alta",
        "start_date": datetime.utcnow().isoformat(),
        "store_id": setup_db["store"].id,
        "owner_id": setup_db["admin"].id
    }
    resp = client.post("/projects", json=project_payload, headers=headers)
    assert resp.status_code == 201, resp.json()
    project_id = resp.json()["id"]

    # 2. Criar Task dentro dele
    task_payload = {
        "title": "Test Task 1033",
        "status": "Pendente",
        "priority": "Média",
        "project_id": project_id
    }
    resp = client.post("/tasks", json=task_payload, headers=headers)
    assert resp.status_code == 201
    task_id = resp.json()["id"]
    assert resp.json()["project_id"] == project_id

    # 4. Criar Maintenance dentro dele
    maintenance_payload = {
        "title": "Test Maintenance 1033",
        "maintenance_type": "Preventiva",
        "status": "Agendada",
        "scheduled_date": datetime.utcnow().isoformat(),
        "equipment_id": setup_db["equipment"].id,
        "project_id": project_id
    }
    resp = client.post("/maintenances", json=maintenance_payload, headers=headers)
    assert resp.status_code in [200, 201]
    maintenance_id = resp.json()["id"]
    assert resp.json()["project_id"] == project_id

    # 6. Criar Attendance dentro dele
    attendance_payload = {
        "title": "Test Attendance 1033",
        "status": "em_andamento",
        "requester_name": "User",
        "project_id": project_id
    }
    resp = client.post("/attendances", json=attendance_payload, headers=headers)
    assert resp.status_code in [200, 201]
    attendance_id = resp.json()["id"]
    assert resp.json()["project_id"] == project_id

    # 8. Criar Checklist
    checklist_payload = {
        "title": "Test Checklist 1033",
        "project_id": project_id,
        "type": "equipment",
        "equipment_id": setup_db["equipment"].id
    }
    resp = client.post("/checklists", json=checklist_payload, headers=headers)
    assert resp.status_code in [200, 201]
    checklist_id = resp.json()["id"]
    assert resp.json()["project_id"] == project_id

    # 10. Criar CalendarEvent
    calendar_payload = {
        "title": "Test Event 1033",
        "start_time": datetime.utcnow().isoformat(),
        "end_time": (datetime.utcnow() + timedelta(hours=1)).isoformat(),
        "project_id": project_id
    }
    resp = client.post("/calendar/events", json=calendar_payload, headers=headers)
    assert resp.status_code in [200, 201]
    calendar_id = resp.json()["id"]
    assert resp.json()["project_id"] == project_id

    # 12. Criar StockMovement
    stock_payload = {
        "item_id": setup_db["stock_item"].id,
        "movement_type": "saida",
        "quantity": 1,
        "reason": "Uso em projeto 1033",
        "project_id": project_id
    }
    resp = client.post(f"/infrastructure/stock/items/{setup_db['stock_item'].id}/movements", json=stock_payload, headers=headers)
    assert resp.status_code in [200, 201]
    movement_id = resp.json()["id"]
    assert resp.json()["project_id"] == project_id

    # 14. Associar Equipment
    resp = client.post(f"/projects/{project_id}/equipment/{setup_db['equipment'].id}", headers=headers)
    assert resp.status_code in [200, 201]
    
    # 16. Abrir projeto e 17. Confirmar relacionamentos no Summary ou endpoint
    resp = client.get(f"/projects/{project_id}/summary", headers=headers)
    assert resp.status_code == 200
    summary = resp.json()
    assert summary["total_tasks"] == 1
    assert summary["total_maintenances"] == 1
    assert summary["total_attendances"] == 1
    assert summary["total_equipment"] == 1
    assert summary["total_stock_movements"] == 1
    

    # 18. Editar project_id de um deles via edição própria
    task_edit_payload = {
        "title": "Edited Task",
        # Keep project_id explicitly
        "project_id": project_id
    }
    resp = client.put(f"/tasks/{task_id}", json=task_edit_payload, headers=headers)
    assert resp.status_code == 200
    assert resp.json()["project_id"] == project_id

    # Clear project_id from stock movement
    stock_edit_payload = {
        "project_id": None
    }
    resp = client.put(f"/infrastructure/stock/movements/{movement_id}", json=stock_edit_payload, headers=headers)
    assert resp.status_code == 200
    assert resp.json()["project_id"] is None

    # 20. Excluir projeto
    resp = client.delete(f"/projects/{project_id}", headers=headers)
    assert resp.status_code == 204
    
    # 21. Confirmar preservação e SET NULL
    task = db.query(Task).filter_by(id=task_id).first()
    assert task is not None
    assert task.project_id is None
    
    maintenance = db.query(MaintenanceRecord).filter_by(id=maintenance_id).first()
    assert maintenance is not None
    assert maintenance.project_id is None
    
    attendance = db.query(Attendance).filter_by(id=attendance_id).first()
    assert attendance is not None
    assert attendance.project_id is None
    
    checklist = db.query(Checklist).filter_by(id=checklist_id).first()
    assert checklist is not None
    assert checklist.project_id is None
    
    calendar = db.query(CalendarEvent).filter_by(id=calendar_id).first()
    assert calendar is not None
    assert calendar.project_id is None
    
    # stock movement was already detached, verify it still exists
    movement = db.query(StockMovement).filter_by(id=movement_id).first()
    assert movement is not None
    assert movement.project_id is None
    
    # cleanup test data manually because cascade on associations works automatically but entity rows need cleanup
    db.delete(task)
    db.delete(maintenance)
    db.delete(attendance)
    db.delete(checklist)
    db.delete(calendar)
    db.delete(movement)
    db.commit()
