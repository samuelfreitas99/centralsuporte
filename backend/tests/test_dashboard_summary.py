"""Resumo do Início (/dashboard/summary): contagens reais e seções por permissão."""
import uuid
from datetime import datetime, timedelta, timezone

from fastapi.testclient import TestClient

from app.auth import create_access_token, get_password_hash
from app.database import SessionLocal
from app.main import app
from app.models import User

client = TestClient(app)


def admin_headers():
    token = client.post("/auth/login", json={"username": "admin", "password": "admin123"}).json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


def test_summary_counts_reflect_created_records():
    h = admin_headers()
    before = client.get("/dashboard/summary", headers=h).json()

    past = (datetime.now(timezone.utc) - timedelta(days=1)).isoformat()
    for i in range(12):  # mais que as 10 tarefas que o Início antigo usava para contar
        client.post("/tasks", json={"title": f"t{i}", "priority": "urgente", "due_date": past}, headers=h)
    client.post("/attendances", json={"title": "Hoje"}, headers=h)
    client.post(
        "/infrastructure/stock/items",
        json={"name": "Mouse USB", "category": "perifericos", "current_quantity": 0, "min_quantity": 3},
        headers=h,
    )
    client.post(
        "/infrastructure/licenses",
        json={
            "name": "Antivírus",
            "license_type": "saas",
            "total_seats": 1,
            "expiration_date": (datetime.now(timezone.utc) + timedelta(days=10)).isoformat(),
        },
        headers=h,
    )

    after = client.get("/dashboard/summary", headers=h).json()
    assert after["tasks"]["pending"] - before["tasks"]["pending"] == 12
    assert after["tasks"]["overdue"] - before["tasks"]["overdue"] == 12
    assert after["tasks"]["urgent"] - before["tasks"]["urgent"] == 12
    assert after["attendances"]["today"] - before["attendances"]["today"] == 1
    assert after["attendances"]["open"] - before["attendances"]["open"] == 1
    assert any(i["name"] == "Mouse USB" for i in after["low_stock"])
    lic = next(l for l in after["expiring_licenses"] if l["name"] == "Antivírus")
    assert 8 <= lic["days_left"] <= 10


def test_summary_omits_sections_without_permission():
    db = SessionLocal()
    try:
        username = f"semperfil_{uuid.uuid4().hex[:8]}"
        db.add(User(username=username, email=f"{username}@t.local", hashed_password=get_password_hash("x"), is_active=True))
        db.commit()
    finally:
        db.close()
    h = {"Authorization": f"Bearer {create_access_token(data={'sub': username})}"}

    data = client.get("/dashboard/summary", headers=h).json()
    assert data["tasks"] is None
    assert data["attendances"] is None
    assert data["low_stock"] is None
    assert data["reminders_pending"] == 0


def test_summary_requires_authentication():
    assert client.get("/dashboard/summary").status_code == 401
