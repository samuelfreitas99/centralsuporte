"""Cofre de Senhas: criptografia, visibilidade, revelação auditada e permissões."""
import uuid

from fastapi.testclient import TestClient

from app.auth import create_access_token, get_password_hash
from app.database import SessionLocal
from app.main import app
from app.models import AuditLog, Role, User, VaultEntry

client = TestClient(app)


def make_user(role_name: str) -> dict:
    db = SessionLocal()
    try:
        username = f"v_{role_name[:4].lower()}_{uuid.uuid4().hex[:6]}"
        role = db.query(Role).filter(Role.name == role_name).one()
        db.add(User(username=username, email=f"{username}@t.local", hashed_password=get_password_hash("x"), is_active=True, role=role))
        db.commit()
    finally:
        db.close()
    return {"Authorization": f"Bearer {create_access_token(data={'sub': username})}"}


def admin() -> dict:
    return {"Authorization": f"Bearer {create_access_token(data={'sub': 'admin'})}"}


def create(headers, **extra):
    payload = {"title": "Switch core", "username": "admin", "password": "S3nh@-Forte!", "notes": "porta 22", **extra}
    res = client.post("/vault", json=payload, headers=headers)
    assert res.status_code == 201, res.text
    return res.json()


def test_secret_is_never_stored_or_listed_in_plain_text():
    tec = make_user("Técnico")
    entry = create(tec)
    assert "password" not in entry and "username" not in entry and "notes" not in entry

    db = SessionLocal()
    try:
        row = db.get(VaultEntry, entry["id"])
        assert b"S3nh@-Forte!" not in row.ciphertext and len(row.nonce) == 12 and len(row.auth_tag) == 16
    finally:
        db.close()

    listed = client.get("/vault", headers=tec).json()
    assert all("password" not in e for e in listed)


def test_reveal_returns_secret_and_is_audited():
    tec = make_user("Técnico")
    entry = create(tec)
    res = client.post(f"/vault/{entry['id']}/reveal", headers=tec)
    assert res.status_code == 200
    assert res.json() == {"username": "admin", "password": "S3nh@-Forte!", "notes": "porta 22"}

    db = SessionLocal()
    try:
        log = db.query(AuditLog).filter(AuditLog.action == "PASSWORD_REVEAL", AuditLog.entity_id == entry["id"]).one()
        assert log.ip_address and "S3nh@" not in str(log.details)
    finally:
        db.close()


def test_personal_entries_are_visible_only_to_the_owner_even_for_admins():
    owner = make_user("Técnico")
    other = make_user("Técnico")
    entry = create(owner, title="Meu e-mail", visibility="pessoal")

    assert any(e["id"] == entry["id"] for e in client.get("/vault", headers=owner).json())
    for h in (other, admin()):
        assert all(e["id"] != entry["id"] for e in client.get("/vault", headers=h).json())
        assert client.post(f"/vault/{entry['id']}/reveal", headers=h).status_code == 404


def test_team_entries_editable_by_owner_and_admin_only():
    owner = make_user("Técnico")
    other = make_user("Técnico")
    entry = create(owner)
    assert client.put(f"/vault/{entry['id']}", json={"title": "x"}, headers=other).status_code == 403
    assert client.put(f"/vault/{entry['id']}", json={"password": "Nova#123"}, headers=admin()).status_code == 200
    secret = client.post(f"/vault/{entry['id']}/reveal", headers=other).json()
    assert secret["password"] == "Nova#123" and secret["username"] == "admin"  # demais campos preservados


def test_profiles_without_vault_permission_are_blocked():
    consulta = make_user("Consulta")
    assert client.get("/vault", headers=consulta).status_code == 403


def test_tampered_or_moved_ciphertext_does_not_open():
    tec = make_user("Técnico")
    a = create(tec, title="A")
    b = create(tec, title="B", password="outra")
    db = SessionLocal()
    try:
        ea, eb = db.get(VaultEntry, a["id"]), db.get(VaultEntry, b["id"])
        eb.nonce, eb.ciphertext, eb.auth_tag = ea.nonce, ea.ciphertext, ea.auth_tag  # copia o cifrado de A para B
        db.commit()
    finally:
        db.close()
    assert client.post(f"/vault/{b['id']}/reveal", headers=tec).status_code == 500


def test_unconfigured_vault_returns_503(monkeypatch):
    monkeypatch.delenv("CENTRAL_VAULT_KEY")
    tec = make_user("Técnico")
    res = client.post("/vault", json={"title": "x", "password": "y"}, headers=tec)
    assert res.status_code == 503
    assert client.get("/vault/status", headers=tec).json() == {"configured": False}
