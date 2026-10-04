"""Web Push: inscrição e envio único dos avisos que chegaram na hora."""
from datetime import datetime, timedelta, timezone

from fastapi.testclient import TestClient

from app.database import SessionLocal
from app.main import app
from app.models import PushSubscription, Reminder, User
from app.services import push as push_service

client = TestClient(app)


def headers():
    token = client.post("/auth/login", json={"username": "admin", "password": "admin123"}).json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


def test_config_reports_disabled_without_vapid(monkeypatch):
    monkeypatch.delenv("VAPID_PUBLIC_KEY", raising=False)
    res = client.get("/push/config", headers=headers()).json()
    assert res == {"enabled": False, "public_key": None}


def test_subscribe_is_idempotent_per_endpoint():
    sub = {"endpoint": "https://push.example/abc", "keys": {"p256dh": "k1", "auth": "a1"}}
    h = headers()
    assert client.post("/push/subscriptions", json=sub, headers=h).status_code == 204
    sub["keys"]["auth"] = "a2"
    assert client.post("/push/subscriptions", json=sub, headers=h).status_code == 204
    db = SessionLocal()
    try:
        rows = db.query(PushSubscription).filter(PushSubscription.endpoint == "https://push.example/abc").all()
        assert len(rows) == 1 and rows[0].auth == "a2"
    finally:
        db.close()
    assert client.post("/push/unsubscribe", json=sub, headers=h).status_code == 204


def test_due_reminders_are_pushed_once(monkeypatch):
    monkeypatch.setenv("VAPID_PUBLIC_KEY", "pub")
    monkeypatch.setenv("VAPID_PRIVATE_KEY", "priv")
    calls = []
    monkeypatch.setattr(push_service, "send_to_user", lambda db, uid, payload: calls.append(payload) or 1)

    db = SessionLocal()
    try:
        admin = db.query(User).filter(User.username == "admin").one()
        now = datetime.now(timezone.utc)
        due = Reminder(title="Vencido agora", remind_at=now - timedelta(minutes=1), user_id=admin.id, task_id=None)
        future = Reminder(title="Futuro", remind_at=now + timedelta(hours=1), user_id=admin.id)
        old = Reminder(title="Velho", remind_at=now - timedelta(days=3), user_id=admin.id)
        db.add_all([due, future, old])
        db.commit()

        push_service.push_due_reminders(db)
        push_service.push_due_reminders(db)  # segunda passada não reenvia

        titles = [c["title"] for c in calls]
        assert titles.count("Vencido agora") == 1
        assert "Futuro" not in titles and "Velho" not in titles
        db.refresh(old)
        assert old.pushed_at is not None  # marcado, mas sem enviar
        assert calls[0]["tag"] == f"reminder-{due.id}"
    finally:
        db.close()


def test_send_test_push_reports_count(monkeypatch):
    monkeypatch.setattr(push_service, "send_to_user", lambda db, uid, payload: 2)
    res = client.post("/push/test", headers=headers())
    assert res.status_code == 200 and res.json() == {"sent": 2}
