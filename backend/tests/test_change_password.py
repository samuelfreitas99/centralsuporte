"""Troca da própria senha (POST /users/me/password)."""
import uuid

from fastapi.testclient import TestClient

from app.auth import get_password_hash
from app.database import SessionLocal
from app.main import app
from app.models import AuditLog, Role, User

client = TestClient(app)


def make_user(password: str = "senhaAntiga1") -> str:
    db = SessionLocal()
    try:
        username = f"tec_{uuid.uuid4().hex[:8]}"
        role = db.query(Role).filter(Role.name == "Técnico").one()
        db.add(User(username=username, email=f"{username}@t.local", hashed_password=get_password_hash(password), is_active=True, role=role))
        db.commit()
        return username
    finally:
        db.close()


def login(username: str, password: str):
    return client.post("/auth/login", json={"username": username, "password": password})


def test_user_changes_own_password():
    username = make_user()
    token = login(username, "senhaAntiga1").json()["access_token"]
    h = {"Authorization": f"Bearer {token}"}

    res = client.post("/users/me/password", json={"current_password": "senhaAntiga1", "new_password": "senhaNova123"}, headers=h)
    assert res.status_code == 204, res.text

    assert login(username, "senhaAntiga1").status_code == 401
    assert login(username, "senhaNova123").status_code == 200

    db = SessionLocal()
    try:
        user = db.query(User).filter(User.username == username).one()
        assert db.query(AuditLog).filter(AuditLog.action == "PASSWORD_CHANGED", AuditLog.entity_id == user.id).count() == 1
    finally:
        db.close()


def test_wrong_current_password_is_rejected():
    username = make_user()
    h = {"Authorization": f"Bearer {login(username, 'senhaAntiga1').json()['access_token']}"}
    res = client.post("/users/me/password", json={"current_password": "errada", "new_password": "senhaNova123"}, headers=h)
    assert res.status_code == 400
    assert login(username, "senhaAntiga1").status_code == 200


def test_new_password_rules():
    username = make_user()
    h = {"Authorization": f"Bearer {login(username, 'senhaAntiga1').json()['access_token']}"}
    assert client.post("/users/me/password", json={"current_password": "senhaAntiga1", "new_password": "curta"}, headers=h).status_code == 422
    assert client.post("/users/me/password", json={"current_password": "senhaAntiga1", "new_password": "senhaAntiga1"}, headers=h).status_code == 400
    assert client.post("/users/me/password", json={"current_password": "x", "new_password": "y" * 10}).status_code == 401
