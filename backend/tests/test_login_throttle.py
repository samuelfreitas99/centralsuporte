"""Bloqueio de tentativa e erro de senha."""
import uuid

from fastapi.testclient import TestClient

from app.auth import get_password_hash
from app.database import SessionLocal
from app.main import app
from app.models import User

client = TestClient(app)


def test_user_is_locked_after_repeated_wrong_passwords():
    username = f"brute_{uuid.uuid4().hex[:8]}"
    db = SessionLocal()
    try:
        db.add(User(username=username, email=f"{username}@t.local", hashed_password=get_password_hash("certa123"), is_active=True))
        db.commit()
    finally:
        db.close()

    for _ in range(5):
        assert client.post("/auth/login", json={"username": username, "password": "errada"}).status_code == 401

    blocked = client.post("/auth/login", json={"username": username, "password": "certa123"})
    assert blocked.status_code == 429
    assert "Muitas tentativas" in blocked.json()["detail"]

    # outro usuário não é afetado
    assert client.post("/auth/login", json={"username": "admin", "password": "admin123"}).status_code == 200
