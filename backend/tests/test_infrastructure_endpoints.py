import uuid
import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def get_auth_token(username: str = "admin", password: str = "admin123") -> str:
    response = client.post("/auth/login", json={"username": username, "password": password})
    assert response.status_code == 200
    return response.json()["access_token"]


def test_stores_and_departments_crud():
    token = get_auth_token()
    headers = {"Authorization": f"Bearer {token}"}
    uid = uuid.uuid4().hex[:6]

    # 1. Create Store
    store_data = {
        "name": f"Loja Teste {uid}",
        "code": f"LJ-{uid}",
        "address": f"Av. Central, {uid}",
        "phone": "(11) 98765-4321",
        "status": "ativa",
        "notes": "Unidade de teste automatizado",
    }
    res = client.post("/stores", json=store_data, headers=headers)
    assert res.status_code == 201
    store = res.json()
    store_id = store["id"]
    assert store["name"] == store_data["name"]
    assert store["code"] == store_data["code"]

    # 2. Duplicate Store Code check
    res_dup = client.post("/stores", json=store_data, headers=headers)
    assert res_dup.status_code == 400

    # 3. Create Department linked to store
    dept_data = {
        "name": f"Frente de Caixa {uid}",
        "store_id": store_id,
        "description": "PDVs e impressoras fiscais",
    }
    res_dept = client.post("/departments", json=dept_data, headers=headers)
    assert res_dept.status_code == 201
    dept = res_dept.json()
    dept_id = dept["id"]
    assert dept["name"] == dept_data["name"]
    assert dept["store_id"] == store_id

    # 4. List Departments by Store
    res_list_depts = client.get(f"/departments?store_id={store_id}", headers=headers)
    assert res_list_depts.status_code == 200
    depts = res_list_depts.json()
    assert any(d["id"] == dept_id for d in depts)

    # 5. Update Store
    update_res = client.put(f"/stores/{store_id}", json={"name": f"Loja Atualizada {uid}"}, headers=headers)
    assert update_res.status_code == 200
    assert update_res.json()["name"] == f"Loja Atualizada {uid}"


def test_equipment_crud_and_history_tracking():
    token = get_auth_token()
    headers = {"Authorization": f"Bearer {token}"}
    uid = uuid.uuid4().hex[:6]

    # 1. Create Store and Department for equipment
    store_res = client.post("/stores", json={"name": f"Loja Matriz {uid}", "code": f"MAT-{uid}"}, headers=headers)
    assert store_res.status_code == 201
    store_id = store_res.json()["id"]

    dept_res = client.post("/departments", json={"name": f"Suporte TI {uid}", "store_id": store_id}, headers=headers)
    assert dept_res.status_code == 201
    dept_id = dept_res.json()["id"]

    # 2. Create Equipment
    eq_data = {
        "patrimony": f"PAT-{uid}",
        "hostname": f"SRV-APP-{uid}",
        "equipment_type": "servidor",
        "brand": "Dell",
        "model": "PowerEdge R740",
        "serial_number": f"SN-{uid}",
        "ip_address": "10.0.29.100",
        "mac_address": "AA:BB:CC:DD:EE:01",
        "operating_system": "Ubuntu Server 24.04",
        "store_id": store_id,
        "department_id": dept_id,
        "assigned_user": "Equipe Infraestrutura",
        "status": "ativo",
        "notes": "Servidor de virtualização",
    }
    res = client.post("/equipment", json=eq_data, headers=headers)
    assert res.status_code == 201
    eq = res.json()
    eq_id = eq["id"]
    assert eq["patrimony"] == eq_data["patrimony"]
    assert eq["hostname"] == eq_data["hostname"]

    # Check that initial history event was auto-created
    assert len(eq["history"]) >= 1
    assert eq["history"][0]["event_type"] == "cadastro"

    # 3. Update Equipment (change IP and Status to trigger automatic history tracking)
    update_payload = {
        "ip_address": "10.0.29.150",
        "status": "em_manutencao",
    }
    up_res = client.put(f"/equipment/{eq_id}", json=update_payload, headers=headers)
    assert up_res.status_code == 200
    updated_eq = up_res.json()
    assert updated_eq["ip_address"] == "10.0.29.150"
    assert updated_eq["status"] == "em_manutencao"

    # Verify history was appended
    get_eq = client.get(f"/equipment/{eq_id}", headers=headers).json()
    history_descriptions = [h["description"] for h in get_eq["history"]]
    assert any("Alteração de IP" in d for d in history_descriptions)
    assert any("Mudança de status" in d for d in history_descriptions)

    # 4. Add manual technical history event
    manual_event = {
        "event_type": "manutencao",
        "description": "Substituição preventiva da ventoinha 2 e limpeza física.",
    }
    hist_res = client.post(f"/equipment/{eq_id}/history", json=manual_event, headers=headers)
    assert hist_res.status_code == 201
    assert hist_res.json()["event_type"] == "manutencao"

    # 5. Search Equipment by query
    search_res = client.get(f"/equipment?q={uid}", headers=headers)
    assert search_res.status_code == 200
    assert any(item["id"] == eq_id for item in search_res.json())


def test_licenses_and_seats_assignment():
    token = get_auth_token()
    headers = {"Authorization": f"Bearer {token}"}
    uid = uuid.uuid4().hex[:6]

    # 1. Create License with 2 seats
    lic_data = {
        "name": f"Office 2021 LTSC {uid}",
        "license_type": "volume",
        "vendor": "Microsoft",
        "license_key": f"XXXXX-YYYYY-{uid}",
        "total_seats": 2,
        "cost": 1500.0,
        "status": "ativa",
    }
    res = client.post("/licenses", json=lic_data, headers=headers)
    assert res.status_code == 201
    lic = res.json()
    lic_id = lic["id"]
    assert lic["total_seats"] == 2
    assert lic["used_seats"] == 0

    # 2. Assign Seat 1
    assign1 = client.post(
        f"/licenses/{lic_id}/assignments",
        json={"assigned_to": f"Financeiro User 1 {uid}", "notes": "Instalado no PC-01"},
        headers=headers,
    )
    assert assign1.status_code == 201
    asgn1_id = assign1.json()["id"]

    # 3. Assign Seat 2
    assign2 = client.post(
        f"/licenses/{lic_id}/assignments",
        json={"assigned_to": f"Diretoria User 2 {uid}", "notes": "Instalado no Notebook"},
        headers=headers,
    )
    assert assign2.status_code == 201

    # 4. Check used_seats count
    get_lic = client.get(f"/licenses/{lic_id}", headers=headers).json()
    assert get_lic["used_seats"] == 2

    # 5. Assign Seat 3 (Should fail with 400 because limit is 2)
    assign3 = client.post(
        f"/licenses/{lic_id}/assignments",
        json={"assigned_to": f"User 3 {uid}"},
        headers=headers,
    )
    assert assign3.status_code == 400
    assert "Limite de assentos atingido" in assign3.json()["detail"]

    # 6. Revoke Seat 1
    revoke_res = client.delete(f"/licenses/{lic_id}/assignments/{asgn1_id}", headers=headers)
    assert revoke_res.status_code == 204

    # Now used_seats should be 1
    get_lic_after = client.get(f"/licenses/{lic_id}", headers=headers).json()
    assert get_lic_after["used_seats"] == 1


def test_stock_items_and_movements():
    token = get_auth_token()
    headers = {"Authorization": f"Bearer {token}"}
    uid = uuid.uuid4().hex[:6]

    # 1. Create Stock Item with initial quantity 0, min quantity 3
    item_data = {
        "name": f"Toner HP Laser {uid}",
        "category": "suprimentos",
        "part_number": f"CE285A-{uid}",
        "current_quantity": 0,
        "min_quantity": 3,
        "unit": "unidade",
        "location": "Armário Suporte TI",
    }
    res = client.post("/stock/items", json=item_data, headers=headers)
    assert res.status_code == 201
    item = res.json()
    item_id = item["id"]
    assert item["current_quantity"] == 0
    assert item["is_low_stock"] is True

    # 2. Register Entrada movement (+10)
    mov_in = {
        "movement_type": "entrada",
        "quantity": 10,
        "reason": "Compra mensal recebida da distribuidora",
    }
    res_in = client.post(f"/stock/items/{item_id}/movements", json=mov_in, headers=headers)
    assert res_in.status_code == 201
    assert res_in.json()["quantity"] == 10

    # Verify updated balance
    item_updated = client.get(f"/stock/items/{item_id}", headers=headers).json()
    assert item_updated["current_quantity"] == 10
    assert item_updated["is_low_stock"] is False

    # 3. Register Saída movement (-8)
    mov_out = {
        "movement_type": "saida",
        "quantity": 8,
        "reason": "Distribuído para lojas da região",
    }
    res_out = client.post(f"/stock/items/{item_id}/movements", json=mov_out, headers=headers)
    assert res_out.status_code == 201

    # Verify updated balance is now 2 (<= min_quantity 3 => low stock alert)
    item_updated2 = client.get(f"/stock/items/{item_id}", headers=headers).json()
    assert item_updated2["current_quantity"] == 2
    assert item_updated2["is_low_stock"] is True

    # 4. Attempt Saída greater than available (should fail with 400)
    mov_invalid = {
        "movement_type": "saida",
        "quantity": 5,
        "reason": "Tentativa de saída sem saldo",
    }
    res_invalid = client.post(f"/stock/items/{item_id}/movements", json=mov_invalid, headers=headers)
    assert res_invalid.status_code == 400
    assert "Saldo insuficiente em estoque" in res_invalid.json()["detail"]


def test_soft_delete_infrastructure():
    token = get_auth_token()
    headers = {"Authorization": f"Bearer {token}"}
    uid = uuid.uuid4().hex[:6]

    # 1. Create and Soft Delete Store
    store_res = client.post("/stores", json={"name": f"Loja SoftDelete {uid}", "code": f"SD-{uid}"}, headers=headers)
    store_id = store_res.json()["id"]

    del_store = client.delete(f"/stores/{store_id}", headers=headers)
    assert del_store.status_code == 204

    # GET specific store shows it as inativa
    get_store = client.get(f"/stores/{store_id}", headers=headers)
    assert get_store.status_code == 200
    assert get_store.json()["status"] == "inativa"

    # GET stores list should not include the inativa store
    list_stores = client.get("/stores", headers=headers)
    assert not any(s["id"] == store_id for s in list_stores.json())

    # 2. Create and Soft Delete Equipment
    eq_res = client.post("/equipment", json={"patrimony": f"EQ-SD-{uid}", "equipment_type": "monitor", "status": "ativo"}, headers=headers)
    eq_id = eq_res.json()["id"]

    del_eq = client.delete(f"/equipment/{eq_id}", headers=headers)
    assert del_eq.status_code == 204

    # GET specific eq shows it as descartado
    get_eq = client.get(f"/equipment/{eq_id}", headers=headers)
    assert get_eq.status_code == 200
    assert get_eq.json()["status"] == "descartado"

    # GET equipment list should not include the descartado eq
    list_eq = client.get("/equipment", headers=headers)
    assert not any(e["id"] == eq_id for e in list_eq.json())


def test_license_protection_and_reveal():
    token = get_auth_token()
    headers = {"Authorization": f"Bearer {token}"}
    uid = uuid.uuid4().hex[:6]
    real_key = f"SECRET-KEY-{uid}"

    # 1. Create License
    lic_res = client.post("/licenses", json={"name": f"Licença Protegida {uid}", "license_key": real_key}, headers=headers)
    assert lic_res.status_code == 201
    lic_id = lic_res.json()["id"]
    
    # Assert create returns redacted
    assert lic_res.json()["license_key"] == "[REDACTED]"

    # 2. GET List returns redacted
    list_lic = client.get("/licenses", headers=headers)
    assert list_lic.status_code == 200
    lic_in_list = next(l for l in list_lic.json() if l["id"] == lic_id)
    assert lic_in_list["license_key"] == "[REDACTED]"

    # 3. GET Single returns redacted
    get_lic = client.get(f"/licenses/{lic_id}", headers=headers)
    assert get_lic.status_code == 200
    assert get_lic.json()["license_key"] == "[REDACTED]"

    # 4. Reveal Endpoint
    reveal_res = client.post(f"/licenses/{lic_id}/reveal", headers=headers)
    assert reveal_res.status_code == 200
    assert reveal_res.json()["license_key"] == real_key

    # 5. Soft Delete License
    del_lic = client.delete(f"/licenses/{lic_id}", headers=headers)
    assert del_lic.status_code == 204

    get_del_lic = client.get(f"/licenses/{lic_id}", headers=headers)
    assert get_del_lic.status_code == 200
    assert get_del_lic.json()["status"] == "cancelada"
    assert get_del_lic.json()["license_key"] == "[REDACTED]"
