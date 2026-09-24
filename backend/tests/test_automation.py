from datetime import datetime, timedelta
import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.main import app
from app.database import SessionLocal
from app.models import User, Role, Task, Reminder, MaintenanceRecord, Store, Equipment
from app.auth import get_password_hash, create_access_token

client = TestClient(app)


@pytest.fixture(scope="module", autouse=True)
def setup_automation_test_data():
    db: Session = SessionLocal()

    admin_role = db.query(Role).filter(Role.name == "Administrador").first()

    admin_user = db.query(User).filter(User.username == "auto_admin").first()
    if not admin_user:
        admin_user = User(
            username="auto_admin",
            email="auto_admin@central.local",
            hashed_password=get_password_hash("Admin123!"),
            is_active=True,
            role_id=admin_role.id if admin_role else None,
        )
        db.add(admin_user)

    tech_user = db.query(User).filter(User.username == "auto_tech").first()
    if not tech_user:
        tech_user = User(
            username="auto_tech",
            email="auto_tech@central.local",
            hashed_password=get_password_hash("Tech123!"),
            is_active=True,
            role_id=admin_role.id if admin_role else None,
        )
        db.add(tech_user)

    store = db.query(Store).filter(Store.name == "Loja Auto 01").first()
    if not store:
        store = Store(name="Loja Auto 01", code="LA-01")
        db.add(store)
        db.flush()

    eq = db.query(Equipment).filter(Equipment.hostname == "SRV-AUTO-01").first()
    if not eq:
        eq = Equipment(
            hostname="SRV-AUTO-01",
            patrimony="PAT-AUTO-01",
            equipment_type="servidor",
            store_id=store.id,
            status="ativo",
        )
        db.add(eq)

    db.commit()
    db.close()


def get_token(username: str):
    return create_access_token(data={"sub": username})


def test_automation_rules_catalog():
    token = get_token("auto_admin")
    res = client.get("/automation/rules", headers={"Authorization": f"Bearer {token}"})
    assert res.status_code == 200
    rules = res.json()
    assert len(rules) >= 3
    rule_ids = {r["id"] for r in rules}
    assert "task_due_alerts" in rule_ids
    assert "maintenance_scheduled_alerts" in rule_ids
    assert "critical_equipment_alerts" in rule_ids


def test_automation_status_endpoint():
    token = get_token("auto_admin")
    res = client.get("/automation/status", headers={"Authorization": f"Bearer {token}"})
    assert res.status_code == 200
    data = res.json()
    assert "status" in data
    assert "interval_minutes" in data
    assert "run_count" in data
    assert "active_rules_count" in data


def test_automation_triggers_task_due_alerts_and_idempotency():
    token = get_token("auto_admin")
    db: Session = SessionLocal()
    tech = db.query(User).filter(User.username == "auto_tech").first()
    tech_id = tech.id

    # Create task with due date in 2 hours
    task = Task(
        title="Verificar Nobreak Loja Auto",
        description="Baterias apresentando oscilação",
        status="pendente",
        priority="alta",
        due_date=datetime.utcnow() + timedelta(hours=2),
        creator_id=tech_id,
    )
    task.assigned_users.append(tech)
    db.add(task)
    db.commit()
    task_id = task.id
    db.close()

    # Trigger automation
    res = client.post("/automation/trigger", headers={"Authorization": f"Bearer {token}"})
    assert res.status_code == 200
    data = res.json()
    assert data["tasks_evaluated"] >= 1
    assert data["task_reminders_created"] >= 1

    # Verify Reminder was created in database
    db = SessionLocal()
    rem = (
        db.query(Reminder)
        .filter(Reminder.task_id == task_id, Reminder.user_id == tech_id)
        .first()
    )
    assert rem is not None
    assert "Prazo Próximo" in rem.title
    assert rem.status == "pendente"
    rem_id = rem.id

    # Second trigger: Idempotency check (should not duplicate)
    res_second = client.post("/automation/trigger", headers={"Authorization": f"Bearer {token}"})
    assert res_second.status_code == 200
    all_rems = (
        db.query(Reminder)
        .filter(Reminder.task_id == task_id, Reminder.user_id == tech_id)
        .all()
    )
    assert len(all_rems) == 1
    assert all_rems[0].id == rem_id
    db.close()


def test_automation_triggers_maintenance_alerts():
    token = get_token("auto_admin")
    db: Session = SessionLocal()
    tech = db.query(User).filter(User.username == "auto_tech").first()
    eq = db.query(Equipment).filter(Equipment.hostname == "SRV-AUTO-01").first()
    tech_id = tech.id
    eq_id = eq.id

    unique_title = f"Troca de Discos RAID Servidor {datetime.utcnow().timestamp()}"
    maint = MaintenanceRecord(
        title=unique_title,
        equipment_id=eq_id,
        technician_id=tech_id,
        maintenance_type="preventiva",
        status="agendada",
        scheduled_date=datetime.utcnow() + timedelta(days=1),
    )
    db.add(maint)
    db.commit()
    db.close()

    # Trigger rules
    res = client.post("/automation/trigger", headers={"Authorization": f"Bearer {token}"})
    assert res.status_code == 200
    data = res.json()
    assert data["maintenances_evaluated"] >= 1
    assert data["maintenance_reminders_created"] >= 1

    # Verify reminder created
    db = SessionLocal()
    maint_rem = (
        db.query(Reminder)
        .filter(
            Reminder.user_id == tech_id,
            Reminder.title == f"🔧 Manutenção Programada: {unique_title}",
        )
        .first()
    )
    assert maint_rem is not None
    assert maint_rem.priority == "alta"
    db.close()
