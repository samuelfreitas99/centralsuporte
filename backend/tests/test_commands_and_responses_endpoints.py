import uuid
import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def get_auth_token(username: str = "admin", password: str = "admin123") -> str:
    response = client.post("/auth/login", json={"username": username, "password": password})
    assert response.status_code == 200
    return response.json()["access_token"]

def test_commands_crud_and_copy_tracking():
    token = get_auth_token()
    headers = {"Authorization": f"Bearer {token}"}

    uid = uuid.uuid4().hex[:6]

    # 1. Create Command
    cmd_payload = {
        "title": f"Consultar Conta no Active Directory {uid}",
        "description": "Obtém detalhes do usuário, grupos e status da conta",
        "command": f"Get-ADUser -Identity 'usuario_{uid}' -Properties *",
        "system": "PowerShell",
        "category": "Active Directory",
        "tags": f"ad, powershell, conta_{uid}",
        "notes": "Executar no RSAT ou diretamente no DC",
        "warning": "Não alterar senhas sem confirmação formal do titular",
        "visibility": "equipe"
    }
    res = client.post("/commands", json=cmd_payload, headers=headers)
    assert res.status_code == 201
    created_cmd = res.json()
    cmd_id = created_cmd["id"]
    assert created_cmd["title"] == cmd_payload["title"]
    assert created_cmd["system"] == "PowerShell"
    assert created_cmd["copies_count"] == 0

    # 2. Get Command by ID
    get_res = client.get(f"/commands/{cmd_id}", headers=headers)
    assert get_res.status_code == 200
    assert get_res.json()["id"] == cmd_id

    # 3. List Systems & Categories
    sys_res = client.get("/commands/systems", headers=headers)
    assert sys_res.status_code == 200
    assert "PowerShell" in sys_res.json()

    cat_res = client.get("/commands/categories", headers=headers)
    assert cat_res.status_code == 200
    assert "Active Directory" in cat_res.json()

    # 4. Filter by system
    list_sys = client.get("/commands?system=PowerShell", headers=headers)
    assert list_sys.status_code == 200
    assert any(c["id"] == cmd_id for c in list_sys.json())

    # 5. Filter by category
    list_cat = client.get("/commands?category=Active%20Directory", headers=headers)
    assert list_cat.status_code == 200
    assert any(c["id"] == cmd_id for c in list_cat.json())

    # 6. Filter by search
    list_search = client.get(f"/commands?search=conta_{uid}", headers=headers)
    assert list_search.status_code == 200
    assert any(c["id"] == cmd_id for c in list_search.json())

    # 7. Record Copy action (increments copy counter)
    copy_res1 = client.post(f"/commands/{cmd_id}/copy", headers=headers)
    assert copy_res1.status_code == 200
    assert copy_res1.json()["copies_count"] == 1

    copy_res2 = client.post(f"/commands/{cmd_id}/copy", headers=headers)
    assert copy_res2.status_code == 200
    assert copy_res2.json()["copies_count"] == 2

    # 8. Update Command
    up_res = client.put(f"/commands/{cmd_id}", json={
        "title": f"Consultar Conta no AD Revisado {uid}",
        "notes": "Atualizado para ambiente Windows Server 2022"
    }, headers=headers)
    assert up_res.status_code == 200
    assert up_res.json()["title"] == f"Consultar Conta no AD Revisado {uid}"

    # 9. Delete Command
    del_res = client.delete(f"/commands/{cmd_id}", headers=headers)
    assert del_res.status_code == 200
    assert client.get(f"/commands/{cmd_id}", headers=headers).status_code == 404

def test_standard_responses_crud_and_copy_tracking():
    token = get_auth_token()
    headers = {"Authorization": f"Bearer {token}"}

    uid = uuid.uuid4().hex[:6]

    # 1. Create Standard Response
    resp_payload = {
        "title": f"Encerramento de Chamado com Sucesso {uid}",
        "content": "Olá! Informamos que a solicitação foi atendida com sucesso. Por gentileza, confirme se o funcionamento está normalizado.",
        "category": "Conclusão de Chamado",
        "audience": "usuario_final",
        "tags": f"encerramento, padrao_{uid}",
        "visibility": "equipe"
    }
    res = client.post("/responses", json=resp_payload, headers=headers)
    assert res.status_code == 201
    created_resp = res.json()
    resp_id = created_resp["id"]
    assert created_resp["title"] == resp_payload["title"]
    assert created_resp["copies_count"] == 0

    # 2. Get Response by ID
    get_res = client.get(f"/responses/{resp_id}", headers=headers)
    assert get_res.status_code == 200
    assert get_res.json()["id"] == resp_id

    # 3. List Categories & Audiences
    cat_res = client.get("/responses/categories", headers=headers)
    assert cat_res.status_code == 200
    assert "Conclusão de Chamado" in cat_res.json()

    aud_res = client.get("/responses/audiences", headers=headers)
    assert aud_res.status_code == 200
    assert "usuario_final" in aud_res.json()

    # 4. Search Response
    list_search = client.get(f"/responses?search=padrao_{uid}", headers=headers)
    assert list_search.status_code == 200
    assert any(r["id"] == resp_id for r in list_search.json())

    # 5. Record copy action
    copy_res = client.post(f"/responses/{resp_id}/copy", headers=headers)
    assert copy_res.status_code == 200
    assert copy_res.json()["copies_count"] == 1

    # 6. Update Response
    up_res = client.put(f"/responses/{resp_id}", json={
        "content": "Texto revisado de encerramento com agradecimento."
    }, headers=headers)
    assert up_res.status_code == 200
    assert "agradecimento" in up_res.json()["content"]

    # 7. Delete Response
    del_res = client.delete(f"/responses/{resp_id}", headers=headers)
    assert del_res.status_code == 200
    assert client.get(f"/responses/{resp_id}", headers=headers).status_code == 404

def test_unauthenticated_commands_and_responses_blocked():
    assert client.get("/commands").status_code == 401
    assert client.post("/commands", json={"title": "test", "command": "ls"}).status_code == 401
    assert client.get("/responses").status_code == 401
    assert client.post("/responses", json={"title": "test", "content": "hello"}).status_code == 401
