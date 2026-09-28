import pytest
from fastapi.testclient import TestClient
from app.main import app
import uuid

client = TestClient(app)

def get_auth_token(username: str = "admin", password: str = "admin123") -> str:
    response = client.post("/auth/login", json={"username": username, "password": password})
    assert response.status_code == 200
    return response.json()["access_token"]

def test_checklist_template_lifecycle():
    token = get_auth_token()
    headers = {"Authorization": f"Bearer {token}"}
    uid = uuid.uuid4().hex[:6]

    # 1. Create Template
    payload = {
        "name": f"Template {uid}",
        "description": "Preventiva Padrão",
        "maintenance_type": "preventiva",
        "items": [
            {"title": "Check A", "position": 0},
            {"title": "Check B", "position": 1}
        ]
    }
    create_res = client.post("/checklist-templates", json=payload, headers=headers)
    assert create_res.status_code == 201
    template = create_res.json()
    assert template["name"] == payload["name"]
    assert len(template["items"]) == 2
    template_id = template["id"]

    # 2. Get Template
    get_res = client.get(f"/checklist-templates/{template_id}", headers=headers)
    assert get_res.status_code == 200
    assert get_res.json()["name"] == payload["name"]

    # 3. Update Template
    update_payload = {
        "name": f"Template {uid} Updated",
        "items": [
            {"title": "Check C", "position": 0}
        ]
    }
    update_res = client.put(f"/checklist-templates/{template_id}", json=update_payload, headers=headers)
    assert update_res.status_code == 200
    assert update_res.json()["name"] == update_payload["name"]
    assert len(update_res.json()["items"]) == 1

    # 3.5. Update is_active
    active_payload = {
        "name": f"Template {uid} Updated",
        "items": [
            {"title": "Check C", "position": 0}
        ],
        "is_active": False
    }
    active_res = client.put(f"/checklist-templates/{template_id}", json=active_payload, headers=headers)
    assert active_res.status_code == 200
    assert active_res.json()["is_active"] is False

    # 4. Use Template in Maintenance
    # First create store, dep, loc, eq
    st_res = client.post("/infrastructure/stores", json={"name": f"ST-{uid}", "code": f"S{uid}"}, headers=headers)
    store_id = st_res.json()["id"]
    dep_res = client.post("/infrastructure/departments", json={"name": f"DEP-{uid}", "store_id": store_id}, headers=headers)
    dep_id = dep_res.json()["id"]
    loc_res = client.post("/infrastructure/locations", json={"name": f"LOC-{uid}", "store_id": store_id, "department_id": dep_id, "location_type": "rack"}, headers=headers)
    loc_id = loc_res.json()["id"]
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

    maint_res = client.post("/maintenances", json={
        "title": f"Maint {uid}",
        "equipment_id": eq_id,
        "checklist_template_id": template_id
    }, headers=headers)
    assert maint_res.status_code == 201
    maint = maint_res.json()
    assert len(maint["checklists"]) == 1
    assert len(maint["checklists"][0]["items"]) == 1
    assert maint["checklists"][0]["items"][0]["title"] == "Check C"

    # 5. Delete Template
    del_res = client.delete(f"/checklist-templates/{template_id}", headers=headers)
    assert del_res.status_code == 204

    # 6. Check template deleted
    assert client.get(f"/checklist-templates/{template_id}", headers=headers).status_code == 404

    # 7. Check Maintenance Checklist intact
    maint_check = client.get(f"/maintenances/{maint['id']}", headers=headers)
    assert maint_check.status_code == 200
    assert len(maint_check.json()["checklists"]) == 1
