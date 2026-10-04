"""Compras: pedido com orçamentos, aprovação, avisos e entrada automática no estoque."""
import uuid

from fastapi.testclient import TestClient

from app.auth import create_access_token, get_password_hash
from app.database import SessionLocal
from app.main import app
from app.models import Reminder, Role, StockItem, StockMovement, User

client = TestClient(app)


def make_user(role_name: str):
    db = SessionLocal()
    try:
        username = f"p_{role_name[:4].lower()}_{uuid.uuid4().hex[:6]}"
        role = db.query(Role).filter(Role.name == role_name).one()
        user = User(username=username, email=f"{username}@t.local", hashed_password=get_password_hash("x"), is_active=True, role=role)
        db.add(user)
        db.commit()
        return user.id, {"Authorization": f"Bearer {create_access_token(data={'sub': username})}"}
    finally:
        db.close()


def stock_item(qty=1):
    db = SessionLocal()
    try:
        item = StockItem(name=f"Mouse {uuid.uuid4().hex[:4]}", category="perifericos", current_quantity=qty, min_quantity=5)
        db.add(item)
        db.commit()
        return item.id
    finally:
        db.close()


QUOTES = [
    {"supplier": "Fornecedor A", "unit_price": 50.0, "delivery_days": 5},
    {"supplier": "Fornecedor B", "unit_price": 42.5, "delivery_days": 3},
]


def test_full_flow_request_approve_receive_updates_stock():
    tec_id, tec = make_user("Técnico")
    gestor_id, gestor = make_user("Gestor")
    item_id = stock_item(qty=1)

    created = client.post("/purchases", json={"title": "Mouse USB", "quantity": 10, "stock_item_id": item_id, "quotes": QUOTES}, headers=tec)
    assert created.status_code == 201, created.text
    p = created.json()
    assert p["status"] == "aguardando_aprovacao" and p["best_total"] == 425.0
    assert [q["supplier"] for q in p["quotes"]] == ["Fornecedor B", "Fornecedor A"]  # mais barato primeiro

    db = SessionLocal()
    try:
        assert db.query(Reminder).filter(Reminder.user_id == gestor_id, Reminder.title.contains("Mouse USB")).count() == 1
    finally:
        db.close()

    # técnico não aprova
    assert client.post(f"/purchases/{p['id']}/approve", json={"quote_id": p["quotes"][0]["id"]}, headers=tec).status_code == 403

    chosen = p["quotes"][0]["id"]
    approved = client.post(f"/purchases/{p['id']}/approve", json={"quote_id": chosen, "note": "ok"}, headers=gestor).json()
    assert approved["status"] == "aprovada" and approved["chosen_total"] == 425.0

    received = client.post(f"/purchases/{p['id']}/receive", headers=tec).json()
    assert received["status"] == "recebida"

    db = SessionLocal()
    try:
        assert db.get(StockItem, item_id).current_quantity == 11
        mov = db.query(StockMovement).filter(StockMovement.stock_item_id == item_id).one()
        assert mov.movement_type == "entrada" and mov.quantity == 10 and f"#{p['id']}" in mov.reason
        assert db.query(Reminder).filter(Reminder.user_id == tec_id, Reminder.title.contains("aprovada")).count() == 1
    finally:
        db.close()


def test_rejection_requires_reason_and_blocks_further_steps():
    _, tec = make_user("Técnico")
    _, gestor = make_user("Gestor")
    p = client.post("/purchases", json={"title": "Monitor", "quotes": QUOTES}, headers=tec).json()
    assert client.post(f"/purchases/{p['id']}/reject", json={}, headers=gestor).status_code == 400
    rejected = client.post(f"/purchases/{p['id']}/reject", json={"note": "Sem orçamento este mês"}, headers=gestor).json()
    assert rejected["status"] == "rejeitada"
    assert client.post(f"/purchases/{p['id']}/receive", headers=tec).status_code == 409


def test_request_needs_at_least_one_quote_and_valid_choice():
    _, tec = make_user("Técnico")
    _, gestor = make_user("Gestor")
    assert client.post("/purchases", json={"title": "x", "quotes": []}, headers=tec).status_code == 422
    p = client.post("/purchases", json={"title": "Teclado", "quotes": QUOTES[:1]}, headers=tec).json()
    assert client.post(f"/purchases/{p['id']}/approve", json={"quote_id": 999999}, headers=gestor).status_code == 400


def test_consulta_can_read_but_not_request():
    _, consulta = make_user("Consulta")
    assert client.get("/purchases", headers=consulta).status_code == 200
    assert client.post("/purchases", json={"title": "x", "quotes": QUOTES}, headers=consulta).status_code == 403


def test_dashboard_shows_pending_purchases_for_approvers():
    _, tec = make_user("Técnico")
    _, gestor = make_user("Gestor")
    client.post("/purchases", json={"title": "Cabo", "quotes": QUOTES}, headers=tec)
    assert client.get("/dashboard/summary", headers=gestor).json()["purchases_pending_approval"] >= 1
    assert client.get("/dashboard/summary", headers=tec).json()["purchases_pending_approval"] is None
