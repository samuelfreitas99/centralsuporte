"""Resumo semanal: conteúdo, entrega na segunda-feira e idempotência."""
from datetime import datetime, timezone

from fastapi.testclient import TestClient

from app.auth import create_access_token
from app.database import SessionLocal
from app.main import app
from app.models import Reminder, User
from app.services.weekly_digest import DIGEST_PREFIX, build_weekly_digest, deliver_weekly_digest, digest_text

client = TestClient(app)
ADMIN = {"Authorization": f"Bearer {create_access_token(data={'sub': 'admin'})}"}

MONDAY_8H_BRT = datetime(2026, 10, 5, 11, 0, tzinfo=timezone.utc)
SUNDAY = datetime(2026, 10, 4, 15, 0, tzinfo=timezone.utc)


def test_weekly_endpoint_counts_recent_attendances():
    client.post("/attendances", json={"title": "Semana 1", "store_department": "Loja Digest / Caixa", "status": "resolvido"}, headers=ADMIN)
    data = client.get("/reports/weekly", headers=ADMIN).json()
    assert data["attendances_total"] >= 1 and data["attendances_resolved"] >= 1
    assert any(s["name"] == "Loja Digest" for s in data["by_store"])


def test_digest_is_delivered_on_monday_once_per_week():
    db = SessionLocal()
    try:
        assert deliver_weekly_digest(db, SUNDAY) == 0
        created = deliver_weekly_digest(db, MONDAY_8H_BRT)
        assert created >= 1  # pelo menos o admin
        assert deliver_weekly_digest(db, MONDAY_8H_BRT) == 0  # idempotente
        admin = db.query(User).filter(User.username == "admin").one()
        rem = db.query(Reminder).filter(Reminder.user_id == admin.id, Reminder.title.startswith(DIGEST_PREFIX)).one()
        assert rem.source == "automacao" and "Atendimentos:" in rem.description
        assert "28/09 a 05/10" in rem.title
    finally:
        db.close()


def test_digest_text_mentions_what_needs_attention():
    db = SessionLocal()
    try:
        d = build_weekly_digest(db)
        d.update(overdue_tasks=2, pending_purchases=1, low_stock_items=0)
        text = digest_text(d)
        assert "2 tarefa(s) atrasada(s)" in text and "1 compra(s)" in text and "estoque" not in text
    finally:
        db.close()
