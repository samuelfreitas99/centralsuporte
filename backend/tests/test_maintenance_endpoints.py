from datetime import datetime, timedelta, timezone
import uuid
import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def get_auth_token(username: str = "admin", password: str = "admin123") -> str:
    response = client.post("/auth/login", json={"username": username, "password": password})
    assert response.status_code == 200
    return response.json()["access_token"]


def test_maintenance_lifecycle_and_equipment_integration():
    token = get_auth_token()
    headers = {"Authorization": f"Bearer {token}"}
    uid = uuid.uuid4().hex[:6]

    # 1. Create a store and an equipment
    store_res = client.post(
        "/infrastructure/stores",
        json={"name": f"Loja {uid}", "code": f"LJ-{uid}"},
        headers=headers,
    )
    assert store_res.status_code == 201
    store_id = store_res.json()["id"]

    eq_res = client.post(
        "/infrastructure/equipment",
        json={
            "hostname": f"PDV-{uid}",
            "equipment_type": "pdv",
            "patrimony": f"PAT-{uid}",
            "ip_address": "192.168.1.100",
            "store_id": store_id,
            "status": "ativo",
        },
        headers=headers,
    )
    assert eq_res.status_code == 201
    equipment_id = eq_res.json()["id"]

    # 2. Create a preventive maintenance with checklist items
    maint_payload = {
        "title": f"Revisão Preventiva Trimestral PDV {uid}",
        "equipment_id": equipment_id,
        "maintenance_type": "preventiva",
        "status": "agendada",
        "priority": "alta",
        "description": "Limpeza física interna, verificação de cabos e atualização de drivers",
        "checklist_title": "Checklist Preventiva PDV",
        "checklist_items": [
            "Limpeza física e remoção de poeira dos coolers",
            "Verificação dos cabos de rede e energia",
            "Teste de corte da impressora térmica",
            "Comunicação com módulo SAT Fiscal",
        ],
    }

    create_res = client.post("/maintenances", json=maint_payload, headers=headers)
    assert create_res.status_code == 201
    maint = create_res.json()
    assert maint["id"] is not None
    assert maint["title"] == maint_payload["title"]
    assert maint["equipment"]["id"] == equipment_id
    assert maint["store"]["id"] == store_id
    assert len(maint["checklists"]) == 1
    assert len(maint["checklists"][0]["items"]) == 4
    maint_id = maint["id"]
    checklist_id = maint["checklists"][0]["id"]
    first_item_id = maint["checklists"][0]["items"][0]["id"]

    # 3. Check and complete a checklist item
    item_res = client.patch(
        f"/checklists/{checklist_id}/items/{first_item_id}",
        json={"is_completed": True},
        headers=headers,
    )
    assert item_res.status_code == 200
    assert item_res.json()["is_completed"] is True

    # 4. Start maintenance (status -> em_andamento)
    start_res = client.patch(
        f"/maintenances/{maint_id}/status",
        json={"status": "em_andamento"},
        headers=headers,
    )
    assert start_res.status_code == 200
    assert start_res.json()["status"] == "em_andamento"

    # Verify equipment status is now em_manutencao
    eq_check = client.get(f"/infrastructure/equipment/{equipment_id}", headers=headers)
    assert eq_check.status_code == 200
    assert eq_check.json()["status"] == "em_manutencao"

    # 5. Conclude maintenance (status -> concluida with result -> sucesso)
    conclude_res = client.patch(
        f"/maintenances/{maint_id}/status",
        json={
            "status": "concluida",
            "result": "sucesso",
            "procedure_performed": "Limpeza concluída, cabos ajustados e comunicação SAT testada 100%.",
        },
        headers=headers,
    )
    assert conclude_res.status_code == 200
    assert conclude_res.json()["status"] == "concluida"
    assert conclude_res.json()["result"] == "sucesso"
    assert conclude_res.json()["performed_date"] is not None

    # Verify equipment returned to status ativo
    eq_after = client.get(f"/infrastructure/equipment/{equipment_id}", headers=headers)
    assert eq_after.status_code == 200
    assert eq_after.json()["status"] == "ativo"

    # Verify equipment history captured the maintenance event
    assert len(eq_after.json()["history"]) >= 2

    # 6. Test metrics endpoint
    metrics_res = client.get("/maintenances/metrics/summary", headers=headers)
    assert metrics_res.status_code == 200
    metrics = metrics_res.json()
    assert metrics["total"] >= 1
    assert metrics["concluidas"] >= 1
    assert metrics["preventivas"] >= 1

    # 7. List and filter maintenances
    list_res = client.get(f"/maintenances?equipment_id={equipment_id}", headers=headers)
    assert list_res.status_code == 200
    assert list_res.json()["total"] >= 1
    assert list_res.json()["items"][0]["id"] == maint_id

    # 8. Delete maintenance
    del_res = client.delete(f"/maintenances/{maint_id}", headers=headers)
    assert del_res.status_code == 200

    # 9. Verify 404 after deletion
    get_404 = client.get(f"/maintenances/{maint_id}", headers=headers)
    assert get_404.status_code == 404

def test_maintenance_phase9_features():
    token = get_auth_token()
    headers = {"Authorization": f"Bearer {token}"}
    uid = uuid.uuid4().hex[:6]

    # 1. Create Location Context
    st_res = client.post("/infrastructure/stores", json={"name": f"ST-{uid}", "code": f"S{uid}"}, headers=headers)
    store_id = st_res.json()["id"]

    dep_res = client.post("/infrastructure/departments", json={"name": f"DEP-{uid}", "store_id": store_id}, headers=headers)
    dep_id = dep_res.json()["id"]

    loc_res = client.post("/infrastructure/locations", json={"name": f"LOC-{uid}", "store_id": store_id, "department_id": dep_id, "location_type": "rack"}, headers=headers)
    assert loc_res.status_code == 201, loc_res.json()
    loc_id = loc_res.json()["id"]

    # 2. Create Equipment
    eq_res = client.post("/infrastructure/equipment", json={
        "hostname": f"EQ-{uid}",
        "equipment_type": "desktop",
        "patrimony": f"P-{uid}",
        "store_id": store_id,
        "department_id": dep_id,
        "technical_location_id": loc_id,
        "status": "ativo"
    }, headers=headers)
    eq_id = eq_res.json()["id"]

    # 3. Create Attendance
    att_res = client.post("/attendances", json={
        "title": f"ATT-{uid}",
        "user_name": "Test",
        "description": "Hardware failure"
    }, headers=headers)
    att_id = att_res.json()["id"]

    # 4. Create Maintenance 1 (Inherits context)
    m1_res = client.post("/maintenances", json={
        "title": f"M1-{uid}",
        "equipment_id": eq_id,
        "attendance_id": att_id,
        "otrs_ticket": "202401010001",
        "parts_used": "RAM 8GB"
    }, headers=headers)
    assert m1_res.status_code == 201
    m1_data = m1_res.json()
    assert m1_data["department_id"] == dep_id
    assert m1_data["technical_location_id"] == loc_id
    assert m1_data["attendance_id"] == att_id
    m1_id = m1_data["id"]

    # 5. Move Equipment to new location
    dep2_res = client.post("/infrastructure/departments", json={"name": f"DEP2-{uid}", "store_id": store_id}, headers=headers)
    dep2_id = dep2_res.json()["id"]
    client.put(f"/infrastructure/equipment/{eq_id}", json={"department_id": dep2_id}, headers=headers)

    # 6. Verify Maintenance 1 still points to old location (Snapshot)
    m1_check = client.get(f"/maintenances/{m1_id}", headers=headers)
    assert m1_check.json()["department_id"] == dep_id

    # 7. Create Maintenance 2
    m2_res = client.post("/maintenances", json={"title": f"M2-{uid}", "equipment_id": eq_id}, headers=headers)
    m2_id = m2_res.json()["id"]

    # 8. Start M1 -> Eq = em_manutencao
    client.patch(f"/maintenances/{m1_id}/status", json={"status": "em_andamento"}, headers=headers)
    assert client.get(f"/infrastructure/equipment/{eq_id}", headers=headers).json()["status"] == "em_manutencao"

    # 9. Start M2 -> Eq = em_manutencao
    client.patch(f"/maintenances/{m2_id}/status", json={"status": "em_andamento"}, headers=headers)
    assert client.get(f"/infrastructure/equipment/{eq_id}", headers=headers).json()["status"] == "em_manutencao"

    # 10. Conclude M1 -> Eq still em_manutencao because M2 is active
    client.patch(f"/maintenances/{m1_id}/status", json={"status": "concluida"}, headers=headers)
    assert client.get(f"/infrastructure/equipment/{eq_id}", headers=headers).json()["status"] == "em_manutencao"

    # 11. Cancel M2 -> Eq returns to ativo
    client.patch(f"/maintenances/{m2_id}/status", json={"status": "cancelada"}, headers=headers)
    assert client.get(f"/infrastructure/equipment/{eq_id}", headers=headers).json()["status"] == "ativo"

    # 12. Edit Maintenance 1
    edit_payload = {
        "title": f"M1-EDITED-{uid}",
        "parts_used": "SSD 500GB",
        "otrs_ticket": "202401010002"
    }
    m1_edit = client.put(f"/maintenances/{m1_id}", json=edit_payload, headers=headers)
    assert m1_edit.status_code == 200
    m1_edit_data = m1_edit.json()
    assert m1_edit_data["title"] == edit_payload["title"]
    assert m1_edit_data["parts_used"] == edit_payload["parts_used"]
    assert m1_edit_data["otrs_ticket"] == edit_payload["otrs_ticket"]
    assert m1_edit_data["department_id"] == dep_id # Snapshot is preserved



def test_maintenance_agenda_lists_upcoming_in_chronological_order():
    token = client.post("/auth/login", json={"username": "admin", "password": "admin123"}).json()["access_token"]
    h = {"Authorization": f"Bearer {token}"}
    eq = client.post("/infrastructure/equipment", json={"equipment_type": "computador", "hostname": "AGENDA-01"}, headers=h).json()
    now = datetime.now(timezone.utc)
    ids = {}
    for label, delta in (("passada", -30), ("depois", 10), ("antes", 2)):
        res = client.post(
            "/maintenances",
            json={
                "title": f"Agenda {label}",
                "equipment_ids": [eq["id"]],
                "maintenance_type": "preventiva",
                "status": "agendada",
                "scheduled_date": (now + timedelta(days=delta)).isoformat(),
            },
            headers=h,
        )
        assert res.status_code == 201, res.text
        ids[label] = res.json()["id"]

    since = (now - timedelta(days=7)).isoformat().replace("+00:00", "Z")
    page = client.get(f"/maintenances?equipment_id={eq['id']}&scheduled_from={since}", headers=h).json()
    got = [m["id"] for m in page["items"]]
    assert got == [ids["antes"], ids["depois"]]
