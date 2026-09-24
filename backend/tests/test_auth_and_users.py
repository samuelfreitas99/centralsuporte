import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def get_admin_token():
    response = client.post("/auth/login", json={"username": "admin", "password": "admin123"})
    assert response.status_code == 200
    data = response.json()
    return data["access_token"]

def test_login_success():
    response = client.post("/auth/login", json={"username": "admin", "password": "admin123"})
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"
    assert data["user"]["username"] == "admin"
    assert data["user"]["role"]["name"] == "Administrador"

def test_login_invalid_password():
    response = client.post("/auth/login", json={"username": "admin", "password": "wrongpassword"})
    assert response.status_code == 401
    assert "detail" in response.json()

def test_login_nonexistent_user():
    response = client.post("/auth/login", json={"username": "nao_existe", "password": "any"})
    assert response.status_code == 401

def test_get_me():
    token = get_admin_token()
    # Authenticated
    response = client.get("/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 200
    user = response.json()
    assert user["username"] == "admin"
    assert user["is_active"] is True
    assert user["role"]["name"] == "Administrador"

    # Unauthenticated
    unauth_response = client.get("/auth/me")
    assert unauth_response.status_code == 401

def test_list_roles():
    token = get_admin_token()
    response = client.get("/roles", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 200
    roles = response.json()
    role_names = [r["name"] for r in roles]
    assert "Administrador" in role_names
    assert "Gestor" in role_names
    assert "Técnico" in role_names
    assert "Consulta" in role_names

def test_user_lifecycle_crud():
    token = get_admin_token()
    headers = {"Authorization": f"Bearer {token}"}

    # 1. Get role ID for Técnico
    roles_res = client.get("/roles", headers=headers)
    tecnico_role = next(r for r in roles_res.json() if r["name"] == "Técnico")

    # 2. Create user
    new_user_payload = {
        "username": "tecnico_teste",
        "email": "tecnico_teste@centralsuporte.local",
        "password": "SenhaSegura123!",
        "role_id": tecnico_role["id"],
        "is_active": True
    }
    create_res = client.post("/users", json=new_user_payload, headers=headers)
    assert create_res.status_code == 201
    created_user = create_res.json()
    user_id = created_user["id"]
    assert created_user["username"] == "tecnico_teste"
    assert created_user["role"]["name"] == "Técnico"

    # 3. Duplicate username should fail
    dup_res = client.post("/users", json=new_user_payload, headers=headers)
    assert dup_res.status_code == 400

    # 4. Get by ID
    get_res = client.get(f"/users/{user_id}", headers=headers)
    assert get_res.status_code == 200
    assert get_res.json()["email"] == "tecnico_teste@centralsuporte.local"

    # 5. Update user
    update_res = client.put(
        f"/users/{user_id}",
        json={"email": "tecnico_alterado@centralsuporte.local"},
        headers=headers
    )
    assert update_res.status_code == 200
    assert update_res.json()["email"] == "tecnico_alterado@centralsuporte.local"

    # 6. Delete user
    del_res = client.delete(f"/users/{user_id}", headers=headers)
    assert del_res.status_code == 200

    # 7. Verify deletion
    not_found_res = client.get(f"/users/{user_id}", headers=headers)
    assert not_found_res.status_code == 404

def test_permission_enforcement():
    admin_token = get_admin_token()
    admin_headers = {"Authorization": f"Bearer {admin_token}"}

    # Get Consulta role
    roles_res = client.get("/roles", headers=admin_headers)
    consulta_role = next(r for r in roles_res.json() if r["name"] == "Consulta")

    # Create a user with Consulta role
    user_payload = {
        "username": "usuario_consulta",
        "email": "consulta@centralsuporte.local",
        "password": "ConsultaPassword123!",
        "role_id": consulta_role["id"],
        "is_active": True
    }
    create_res = client.post("/users", json=user_payload, headers=admin_headers)
    assert create_res.status_code == 201
    consulta_user = create_res.json()

    try:
        # Login as Consulta user
        login_res = client.post("/auth/login", json={
            "username": "usuario_consulta",
            "password": "ConsultaPassword123!"
        })
        assert login_res.status_code == 200
        consulta_token = login_res.json()["access_token"]
        consulta_headers = {"Authorization": f"Bearer {consulta_token}"}

        # Consulta cannot create users (requires users:write permission)
        forbidden_res = client.post("/users", json={
            "username": "outro_usuario",
            "email": "outro@centralsuporte.local",
            "password": "password",
            "role_id": consulta_role["id"],
            "is_active": True
        }, headers=consulta_headers)
        assert forbidden_res.status_code == 403
        assert "permissão 'users:write' necessária" in forbidden_res.json()["detail"]
    finally:
        # Cleanup
        client.delete(f"/users/{consulta_user['id']}", headers=admin_headers)
