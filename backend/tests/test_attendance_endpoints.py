import uuid
import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def get_auth_token(username: str = "admin", password: str = "admin123") -> str:
    response = client.post("/auth/login", json={"username": username, "password": password})
    assert response.status_code == 200
    return response.json()["access_token"]

def test_attendance_lifecycle_and_otrs_association():
    token = get_auth_token()
    headers = {"Authorization": f"Bearer {token}"}

    uid = uuid.uuid4().hex[:6]
    ticket_num = f"20260924{uid}"

    # 1. Create attendance linked manually to OTRS ticket
    create_payload = {
        "title": f"Travamento Spooler de Impressão PDV {uid}",
        "otrs_ticket": ticket_num,
        "otrs_url": f"https://otrs.empresa.local/otrs/index.pl?Ticket={ticket_num}",
        "requester_name": f"Gerente Carlos - Loja {uid}",
        "status": "em_andamento",
        "equipment_name": f"PDV {uid} - Caixa Central",
        "store_department": f"Loja {uid}",
        "problem_description": "Impressora não responde aos comandos do PDV",
        "symptoms": "Fila travada com documento corrompido",
        "diagnosis": "Serviço Spooler travado com arquivo preso na pasta PRINTERS",
        "cause": "Queda abrupta de energia durante emissão de cupom fiscal",
        "solution": "Parar spooler, limpar pasta PRINTERS e reiniciar serviço",
        "commands_used": "net stop spooler && del /Q /F %systemroot%\\System32\\Spool\\Printers\\* && net start spooler",
        "internal_notes": "Orientado o operador a não puxar a bobina com força",
    }

    res = client.post("/attendances", json=create_payload, headers=headers)
    assert res.status_code == 201
    data = res.json()
    assert data["id"] is not None
    assert data["otrs_ticket"] == ticket_num
    assert data["technician"]["username"] == "admin"
    att_id = data["id"]

    # 2. Add technical internal note
    note_res = client.post(
        f"/attendances/{att_id}/notes",
        json={"note": "Testado impressão de teste com sucesso após reinício."},
        headers=headers,
    )
    assert note_res.status_code == 201
    assert note_res.json()["note"] == "Testado impressão de teste com sucesso após reinício."

    # 3. Get attendance details
    get_res = client.get(f"/attendances/{att_id}", headers=headers)
    assert get_res.status_code == 200
    get_data = get_res.json()
    assert len(get_data["notes"]) == 1
    assert get_data["notes"][0]["author"]["username"] == "admin"

    # 4. Update attendance status to resolvido
    up_res = client.put(f"/attendances/{att_id}", json={"status": "resolvido"}, headers=headers)
    assert up_res.status_code == 200
    assert up_res.json()["status"] == "resolvido"

    # 5. List attendances with search and filter
    list_res = client.get(f"/attendances?search={uid}&has_otrs=true", headers=headers)
    assert list_res.status_code == 200
    assert any(a["id"] == att_id for a in list_res.json())

def test_convert_attendance_to_knowledge_draft():
    token = get_auth_token()
    headers = {"Authorization": f"Bearer {token}"}

    uid = uuid.uuid4().hex[:6]
    create_payload = {
        "title": f"Configuração Scanner Honeywell {uid}",
        "otrs_ticket": f"2026{uid}",
        "problem_description": "Scanner não lê códigos 2D",
        "diagnosis": "Firmware desatualizado e falta de ativação do symbology QR",
        "solution": "Bipar códigos de barras de configuração de fábrica e ativar QR Code",
        "commands_used": "Manual Honeywell pág. 14 - Barcodes DEFALT, QR_ENA",
        "equipment_name": f"Honeywell 7580g {uid}",
    }
    res = client.post("/attendances", json=create_payload, headers=headers)
    att_id = res.json()["id"]

    # Action: Convert to Knowledge
    conv_res = client.post(f"/attendances/{att_id}/convert-to-knowledge", headers=headers)
    assert conv_res.status_code == 201
    article = conv_res.json()

    assert article["id"] is not None
    assert f"Procedimento: Configuração Scanner Honeywell {uid}" in article["title"]
    assert article["status"] == "rascunho"  # Must be a draft for review
    assert "Honeywell pág. 14" in article["commands"]

    # Verify attendance is now linked to this article
    att_check = client.get(f"/attendances/{att_id}", headers=headers).json()
    assert att_check["knowledge_article_id"] == article["id"]

    # Calling convert again should be idempotent and return existing article
    conv_again = client.post(f"/attendances/{att_id}/convert-to-knowledge", headers=headers)
    assert conv_again.status_code == 201
    assert conv_again.json()["id"] == article["id"]

def test_attendance_delete_lifecycle():
    token = get_auth_token()
    headers = {"Authorization": f"Bearer {token}"}

    uid = uuid.uuid4().hex[:6]
    res = client.post(
        "/attendances",
        json={"title": f"Atendimento Temporário {uid}", "status": "em_andamento"},
        headers=headers,
    )
    att_id = res.json()["id"]

    del_res = client.delete(f"/attendances/{att_id}", headers=headers)
    assert del_res.status_code == 200

    check_res = client.get(f"/attendances/{att_id}", headers=headers)
    assert check_res.status_code == 404

def test_attendance_project_association():
    token = get_auth_token()
    headers = {"Authorization": f"Bearer {token}"}

    # Create a project first
    proj_res = client.post(
        "/projects/",
        json={
            "title": "Projeto Integração Atendimento",
            "description": "Test for attendance linking",
            "status": "planejamento"
        },
        headers=headers
    )
    assert proj_res.status_code == 201
    project_id = proj_res.json()["id"]

    # Create attendance linked to project
    att_res = client.post(
        "/attendances",
        json={
            "title": "Atendimento vinculado ao projeto",
            "project_id": project_id
        },
        headers=headers
    )
    assert att_res.status_code == 201
    att_data = att_res.json()
    assert att_data["project_id"] == project_id
    att_id = att_data["id"]

    # Fetch attendance and verify link is maintained
    get_res = client.get(f"/attendances/{att_id}", headers=headers)
    assert get_res.status_code == 200
    assert get_res.json()["project_id"] == project_id
