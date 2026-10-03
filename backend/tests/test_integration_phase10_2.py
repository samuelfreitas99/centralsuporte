import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from datetime import datetime, timedelta

from app.main import app
from app.database import get_db, Base, engine
from app.models import (
    User, Role, Permission, Store, Department, TechnicalLocation, Equipment, StockItem
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

    admin = db.query(User).filter_by(username="admin_test").first()
    if not admin:
        admin = User(
            username="admin_test",
            email="admin_test@test.com",
            hashed_password=get_password_hash("testpass"),
            role_id=role.id,
            is_active=True
        )
        db.add(admin)
        db.commit()
    
    # Setup some infrastructure
    store = db.query(Store).filter_by(name="Loja Teste 10.2").first()
    if not store:
        store = Store(name="Loja Teste 10.2", status="ativa")
        db.add(store)
        db.commit()

    equipment = db.query(Equipment).filter_by(hostname="PC-TESTE-102").first()
    if not equipment:
        equipment = Equipment(equipment_type="desktop", hostname="PC-TESTE-102", store_id=store.id)
        db.add(equipment)
        db.commit()

    stock_item = db.query(StockItem).filter_by(name="Teclado Teste 10.2").first()
    if not stock_item:
        stock_item = StockItem(name="Teclado Teste 10.2", current_quantity=10, min_quantity=2)
        db.add(stock_item)
        db.commit()
    else:
        stock_item.current_quantity = 10
        db.commit()

    yield {
        "db": db, 
        "admin": admin,
        "store": store,
        "equipment": equipment,
        "stock_item": stock_item
    }
    # Teardown logic if needed

@pytest.fixture(scope="module")
def auth_headers(setup_db):
    response = client.post(
        "/auth/login",
        json={"username": "admin_test", "password": "testpass"}
    )
    if "access_token" not in response.json():
        print(response.json())
        pytest.fail("Failed to login")
    token = response.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}

def test_integration_phase10_2(setup_db, auth_headers):
    # 1. Create Project 1 and 2
    res = client.post("/projects", json={"title": "Project One"}, headers=auth_headers)
    assert res.status_code == 201
    p1_id = res.json()["id"]

    res = client.post("/projects", json={"title": "Project Two"}, headers=auth_headers)
    assert res.status_code == 201
    p2_id = res.json()["id"]

    # 2. Create Task without Project
    res = client.post("/tasks", json={"title": "Avulso Task"}, headers=auth_headers)
    assert res.status_code == 201
    task_id = res.json()["id"]
    assert res.json()["project_id"] is None

    # 3. Create Task with Project
    res = client.post("/tasks", json={"title": "Project Task", "project_id": p1_id}, headers=auth_headers)
    assert res.status_code == 201
    ptask_id = res.json()["id"]
    assert res.json()["project_id"] == p1_id

    # 4. Change Task to another Project
    res = client.put(f"/tasks/{ptask_id}", json={"project_id": p2_id}, headers=auth_headers)
    assert res.status_code == 200
    assert res.json()["project_id"] == p2_id

    # 5. Remove Project from Task
    res = client.put(f"/tasks/{ptask_id}", json={"project_id": None}, headers=auth_headers)
    assert res.status_code == 200
    assert res.json()["project_id"] is None

    # Re-assign to p1 for deletion preservation test
    client.put(f"/tasks/{ptask_id}", json={"project_id": p1_id}, headers=auth_headers)

    # 6. Create Checklist with Project
    res = client.post("/checklists", json={"title": "Checklist P1", "project_id": p1_id}, headers=auth_headers)
    assert res.status_code == 201
    checklist_id = res.json()["id"]

    # 7. Create Maintenance with Project
    eq_id = setup_db["equipment"].id
    res = client.post("/maintenances", json={
        "title": "Maint P1", 
        "equipment_id": eq_id,
        "maintenance_type": "preventiva",
        "status": "agendada",
        "priority": "media",
        "project_id": p1_id
    }, headers=auth_headers)
    assert res.status_code == 201
    maint_id = res.json()["id"]

    # 8. Create Attendance with Project
    res = client.post("/attendances", json={"title": "Att P1", "project_id": p1_id}, headers=auth_headers)
    assert res.status_code == 201
    att_id = res.json()["id"]

    # 9. Create CalendarEvent with Project
    now = datetime.utcnow()
    res = client.post("/calendar/events", json={
        "title": "Evt P1",
        "start_time": now.isoformat(),
        "end_time": (now + timedelta(hours=1)).isoformat(),
        "project_id": p1_id
    }, headers=auth_headers)
    assert res.status_code == 201
    evt_id = res.json()["id"]

    # 10. Create StockMovement with Project
    stk_item_id = setup_db["stock_item"].id
    res = client.post(f"/infrastructure/stock/items/{stk_item_id}/movements", json={
        "movement_type": "saida",
        "quantity": 1,
        "project_id": p1_id
    }, headers=auth_headers)
    if res.status_code != 201:
        print(res.json())
    assert res.status_code == 201
    mov_id = res.json()["id"]

    # 11. Associate Equipment to Project
    res = client.post(f"/projects/{p1_id}/equipment/{eq_id}", headers=auth_headers)
    assert res.status_code == 201

    # 12. Consult filters by Project
    res = client.get(f"/tasks?project_id={p1_id}", headers=auth_headers)
    assert res.json()["total"] >= 1
    assert any(t["id"] == ptask_id for t in res.json()["items"])

    res = client.get(f"/checklists?project_id={p1_id}", headers=auth_headers)
    assert len(res.json()) >= 1

    res = client.get(f"/maintenances?project_id={p1_id}", headers=auth_headers)
    assert len(res.json()) >= 1

    res = client.get(f"/attendances?project_id={p1_id}", headers=auth_headers)
    assert res.json()["total"] >= 1

    res = client.get(f"/calendar/events?project_id={p1_id}", headers=auth_headers)
    assert len(res.json()) >= 1

    res = client.get(f"/infrastructure/stock/movements?project_id={p1_id}", headers=auth_headers)
    assert len(res.json()) >= 1

    # 13. Remove associations (tested with Task above, let's also test Checklist)
    res = client.put(f"/checklists/{checklist_id}", json={"project_id": None}, headers=auth_headers)
    assert res.status_code == 200
    assert res.json()["project_id"] is None
    # Re-assign
    client.put(f"/checklists/{checklist_id}", json={"project_id": p1_id}, headers=auth_headers)

    # 14. Excluir Project
    res = client.delete(f"/projects/{p1_id}", headers=auth_headers)
    assert res.status_code == 204

    # 15. Confirmar preservação de todos os registros
    res = client.get(f"/tasks/{ptask_id}", headers=auth_headers)
    assert res.status_code == 200
    assert res.json()["project_id"] is None

    res = client.get(f"/checklists/{checklist_id}", headers=auth_headers)
    assert res.status_code == 200
    assert res.json()["project_id"] is None

    res = client.get(f"/maintenances/{maint_id}", headers=auth_headers)
    assert res.status_code == 200
    assert res.json()["project_id"] is None

    res = client.get(f"/attendances/{att_id}", headers=auth_headers)
    assert res.status_code == 200
    assert res.json()["project_id"] is None

    res = client.get(f"/calendar/events/{evt_id}", headers=auth_headers)
    assert res.status_code == 200
    assert res.json()["project_id"] is None

    res = client.get(f"/infrastructure/stock/items", headers=auth_headers)
    assert res.status_code == 200

    print("ALL TESTS PASSED SUCCESSFULLY!")
