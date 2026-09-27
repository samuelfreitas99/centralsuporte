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
    assert len(list_res.json()) >= 1
    assert list_res.json()[0]["id"] == maint_id

    # 8. Delete maintenance
    del_res = client.delete(f"/maintenances/{maint_id}", headers=headers)
    assert del_res.status_code == 200

    # 9. Verify 404 after deletion
    get_404 = client.get(f"/maintenances/{maint_id}", headers=headers)
    assert get_404.status_code == 404
