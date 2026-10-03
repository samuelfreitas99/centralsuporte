"""Lembretes pessoais x alertas automáticos, e deduplicação do alerta de ativo crítico."""
import uuid
from datetime import datetime, timedelta, timezone

from fastapi.testclient import TestClient

from app.database import SessionLocal
from app.main import app
from app.models import Equipment, MaintenanceRecord, Reminder, User
from app.services.automation import run_automation_rules

client = TestClient(app)


def admin_headers():
    token = client.post("/auth/login", json={"username": "admin", "password": "admin123"}).json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


def test_manual_reminder_is_personal_and_tagged_manual():
    h = admin_headers()
    when = (datetime.now(timezone.utc) + timedelta(hours=1)).isoformat()
    created = client.post("/reminders", json={"title": "Ligar para fornecedor", "remind_at": when}, headers=h)
    assert created.status_code == 201
    assert created.json()["source"] == "manual"

    db = SessionLocal()
    try:
        other = User(username=f"outro_{uuid.uuid4().hex[:6]}", email=f"{uuid.uuid4().hex[:6]}@t.local", hashed_password="x")
        db.add(other)
        db.flush()
        db.add(Reminder(title="Lembrete de outra pessoa", remind_at=datetime.now(timezone.utc), user_id=other.id))
        db.commit()
    finally:
        db.close()

    mine = client.get("/reminders", headers=h).json()
    assert all(r["title"] != "Lembrete de outra pessoa" for r in mine)  # admin também só vê os seus
    everyone = client.get("/reminders?all_users=true", headers=h).json()
    assert any(r["title"] == "Lembrete de outra pessoa" for r in everyone)

    manual_only = client.get("/reminders?source=manual", headers=h).json()
    assert manual_only and all(r["source"] == "manual" for r in manual_only)


def test_critical_asset_alert_is_not_duplicated_when_count_changes():
    db = SessionLocal()
    try:
        admin = db.query(User).filter(User.username == "admin").one()
        eq = Equipment(hostname=f"SRV-CRIT-{uuid.uuid4().hex[:6]}", equipment_type="servidor", status="ativo")
        db.add(eq)
        db.flush()
        for i in range(3):
            db.add(MaintenanceRecord(title=f"m{i}", equipment_id=eq.id, maintenance_type="corretiva", status="concluida"))
        db.commit()
        prefix = f"⚠️ Ativo Crítico: {eq.hostname} ("

        run_automation_rules(db)
        db.add(MaintenanceRecord(title="m4", equipment_id=eq.id, maintenance_type="corretiva", status="concluida"))
        db.commit()
        run_automation_rules(db)  # contagem passa de 3 para 4: não deve gerar um segundo alerta

        alerts = db.query(Reminder).filter(Reminder.user_id == admin.id, Reminder.title.startswith(prefix)).all()
        assert len(alerts) == 1
        assert alerts[0].source == "automacao"
    finally:
        db.close()
