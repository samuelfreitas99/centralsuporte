import uuid
import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def get_auth_token(username: str = "admin", password: str = "admin123") -> str:
    response = client.post("/auth/login", json={"username": username, "password": password})
    assert response.status_code == 200
    return response.json()["access_token"]


def create_equipment_helper(headers, uid, suffix):
    res = client.post(
        "/infrastructure/equipment",
        json={
            "hostname": f"SHOPPING-{uid}-{suffix}",
            "equipment_type": "computador",
            "patrimony": f"PAT-{uid}-{suffix}",
            "status": "ativo",
        },
        headers=headers,
    )
    assert res.status_code == 201
    return res.json()["id"]


def test_maintenance_single_equipment_backward_compatibility():
    token = get_auth_token()
    headers = {"Authorization": f"Bearer {token}"}
    uid = uuid.uuid4().hex[:6]

    eq_id = create_equipment_helper(headers, uid, "01")

    # Create with legacy equipment_id
    res = client.post(
        "/maintenances",
        json={
            "title": f"Limpeza única {uid}",
            "equipment_id": eq_id,
            "maintenance_type": "preventiva",
            "status": "agendada",
        },
        headers=headers,
    )
    assert res.status_code == 201
    data = res.json()
    assert data["equipment_id"] == eq_id
    assert len(data["equipments"]) == 1
    assert data["equipments"][0]["id"] == eq_id

    # Query by equipment_id
    q_res = client.get(f"/maintenances?equipment_id={eq_id}", headers=headers)
    assert q_res.status_code == 200
    m_list = q_res.json()
    assert any(m["id"] == data["id"] for m in m_list)


def test_maintenance_multiple_equipments_outside_project():
    token = get_auth_token()
    headers = {"Authorization": f"Bearer {token}"}
    uid = uuid.uuid4().hex[:6]

    eq1 = create_equipment_helper(headers, uid, "M01")
    eq2 = create_equipment_helper(headers, uid, "M02")
    eq3 = create_equipment_helper(headers, uid, "M03")

    # Create maintenance with multiple equipments and NO project
    res = client.post(
        "/maintenances",
        json={
            "title": f"Limpeza preventiva coletiva {uid}",
            "equipment_ids": [eq1, eq2, eq3],
            "maintenance_type": "preventiva",
            "status": "em_andamento",
            "project_id": None,
        },
        headers=headers,
    )
    assert res.status_code == 201
    data = res.json()
    assert data["project_id"] is None
    eq_ids_returned = {e["id"] for e in data["equipments"]}
    assert eq_ids_returned == {eq1, eq2, eq3}

    # Verify each equipment status changed to 'em_manutencao'
    for eid in [eq1, eq2, eq3]:
        eq_res = client.get(f"/infrastructure/equipment/{eid}", headers=headers)
        assert eq_res.status_code == 200
        assert eq_res.json()["status"] == "em_manutencao"

    # Query by eq2
    q_res = client.get(f"/maintenances?equipment_id={eq2}", headers=headers)
    assert q_res.status_code == 200
    assert any(m["id"] == data["id"] for m in q_res.json())

    # Conclude maintenance and verify all revert to 'ativo'
    patch_res = client.patch(
        f"/maintenances/{data['id']}/status",
        json={"status": "concluida", "result": "sucesso", "procedure_performed": "Limpeza concluída"},
        headers=headers,
    )
    assert patch_res.status_code == 200
    for eid in [eq1, eq2, eq3]:
        eq_res = client.get(f"/infrastructure/equipment/{eid}", headers=headers)
        assert eq_res.status_code == 200
        assert eq_res.json()["status"] == "ativo"


def test_maintenance_multiple_equipments_inside_project():
    token = get_auth_token()
    headers = {"Authorization": f"Bearer {token}"}
    uid = uuid.uuid4().hex[:6]

    # Create project
    proj_res = client.post(
        "/projects",
        json={"title": f"Projeto Abertura Loja {uid}", "status": "em_andamento"},
        headers=headers,
    )
    assert proj_res.status_code == 201
    project_id = proj_res.json()["id"]

    eq1 = create_equipment_helper(headers, uid, "P01")
    eq2 = create_equipment_helper(headers, uid, "P02")

    res = client.post(
        "/maintenances",
        json={
            "title": f"Configuração Equipamentos Projeto {uid}",
            "equipment_ids": [eq1, eq2],
            "maintenance_type": "configuracao",
            "status": "agendada",
            "project_id": project_id,
        },
        headers=headers,
    )
    assert res.status_code == 201
    data = res.json()
    assert data["project_id"] == project_id
    assert len(data["equipments"]) == 2

    # Query by project_id
    p_maints = client.get(f"/maintenances?project_id={project_id}", headers=headers).json()
    assert any(m["id"] == data["id"] for m in p_maints)


def test_maintenance_edit_add_remove_equipments():
    token = get_auth_token()
    headers = {"Authorization": f"Bearer {token}"}
    uid = uuid.uuid4().hex[:6]

    eq1 = create_equipment_helper(headers, uid, "E01")
    eq2 = create_equipment_helper(headers, uid, "E02")
    eq3 = create_equipment_helper(headers, uid, "E03")

    # Create with [eq1, eq2] in progress
    create_res = client.post(
        "/maintenances",
        json={
            "title": f"Manutenção dinâmica {uid}",
            "equipment_ids": [eq1, eq2],
            "maintenance_type": "corretiva",
            "status": "em_andamento",
        },
        headers=headers,
    )
    assert create_res.status_code == 201
    maint_id = create_res.json()["id"]

    # Now update: remove eq2, add eq3 -> [eq1, eq3]
    update_res = client.put(
        f"/maintenances/{maint_id}",
        json={"equipment_ids": [eq1, eq3]},
        headers=headers,
    )
    assert update_res.status_code == 200
    updated_data = update_res.json()
    new_ids = {e["id"] for e in updated_data["equipments"]}
    assert new_ids == {eq1, eq3}

    # eq2 was removed so its status should revert to ativo
    eq2_res = client.get(f"/infrastructure/equipment/{eq2}", headers=headers).json()
    assert eq2_res["status"] == "ativo"

    # eq3 was added to an 'em_andamento' maintenance, so it should be em_manutencao
    eq3_res = client.get(f"/infrastructure/equipment/{eq3}", headers=headers).json()
    assert eq3_res["status"] == "em_manutencao"


def test_project_new_attendance_preserves_project_id_and_cascade():
    token = get_auth_token()
    headers = {"Authorization": f"Bearer {token}"}
    uid = uuid.uuid4().hex[:6]

    # 1. Create project
    proj_res = client.post(
        "/projects",
        json={"title": f"Projeto Atendimento Test {uid}", "status": "planejamento"},
        headers=headers,
    )
    assert proj_res.status_code == 201
    proj = proj_res.json()
    project_id = proj["id"]

    # 2. Create Attendance linked to Project
    att_res = client.post(
        "/attendances",
        json={
            "title": f"Atendimento vinculado {uid}",
            "status": "em_andamento",
            "project_id": project_id,
        },
        headers=headers,
    )
    assert att_res.status_code == 201
    att = att_res.json()
    assert att["project_id"] == project_id

    # 3. Query attendances by project_id
    list_res = client.get(f"/attendances?project_id={project_id}", headers=headers)
    assert list_res.status_code == 200
    assert any(a["id"] == att["id"] for a in list_res.json())

    # 4. Delete Project and verify attendance is preserved with project_id = NULL
    del_res = client.delete(f"/projects/{project_id}", headers=headers)
    assert del_res.status_code in [200, 204]

    get_att = client.get(f"/attendances/{att['id']}", headers=headers)
    assert get_att.status_code == 200
    assert get_att.json()["project_id"] is None
