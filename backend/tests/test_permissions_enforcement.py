"""Garante que módulos operacionais respeitam as permissões RBAC (não só 'usuário logado')."""
import uuid

import pytest
from fastapi.testclient import TestClient

from app.auth import create_access_token, get_password_hash
from app.database import SessionLocal
from app.main import app
from app.models import Role, User

client = TestClient(app)


@pytest.fixture(scope="module")
def consulta_headers():
    db = SessionLocal()
    try:
        role = db.query(Role).filter(Role.name == "Consulta").one()
        username = f"consulta_{uuid.uuid4().hex[:8]}"
        db.add(User(
            username=username,
            email=f"{username}@test.local",
            hashed_password=get_password_hash("x"),
            is_active=True,
            role=role,
        ))
        db.commit()
    finally:
        db.close()
    return {"Authorization": f"Bearer {create_access_token(data={'sub': username})}"}


@pytest.fixture(scope="module")
def admin_headers():
    res = client.post("/auth/login", json={"username": "admin", "password": "admin123"})
    return {"Authorization": f"Bearer {res.json()['access_token']}"}


@pytest.mark.parametrize("path", [
    "/attendances",
    "/maintenances",
    "/infrastructure/equipment",
    "/infrastructure/licenses",
    "/infrastructure/stock/items",
    "/commands",
    "/responses",
])
def test_read_only_profile_can_list(consulta_headers, path):
    assert client.get(path, headers=consulta_headers).status_code == 200


@pytest.mark.parametrize("path,payload", [
    ("/attendances", {"title": "x"}),
    ("/infrastructure/equipment", {"equipment_type": "computador", "hostname": "X"}),
    ("/infrastructure/stores", {"name": "Loja X"}),
    ("/commands", {"title": "x", "category": "windows", "steps": []}),
    ("/responses", {"title": "x", "content": "y", "category": "geral"}),
])
def test_read_only_profile_cannot_write(consulta_headers, path, payload):
    res = client.post(path, json=payload, headers=consulta_headers)
    assert res.status_code == 403, res.text


def test_read_only_profile_cannot_reveal_license_key(consulta_headers, admin_headers):
    lic = client.post(
        "/infrastructure/licenses",
        json={"name": "Office", "license_type": "perpetua", "license_key": "AAAA-BBBB", "total_seats": 1},
        headers=admin_headers,
    )
    assert lic.status_code == 201, lic.text
    res = client.post(f"/infrastructure/licenses/{lic.json()['id']}/reveal", headers=consulta_headers)
    assert res.status_code == 403


def test_read_only_profile_can_copy_command(consulta_headers, admin_headers):
    cmd = client.post(
        "/commands",
        json={"title": "ipconfig", "category": "windows", "steps": [{"position": 1, "title": "Ver IP", "command_text": "ipconfig /all"}]},
        headers=admin_headers,
    )
    assert cmd.status_code in (200, 201), cmd.text
    assert client.post(f"/commands/{cmd.json()['id']}/copy", headers=consulta_headers).status_code == 200
