from datetime import datetime, timedelta, timezone
import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def get_auth_token(username: str = "admin", password: str = "admin123") -> str:
    response = client.post("/auth/login", json={"username": username, "password": password})
    assert response.status_code == 200
    return response.json()["access_token"]

def test_tasks_crud_and_status():
    token = get_auth_token()
    headers = {"Authorization": f"Bearer {token}"}

    # 1. Create Task
    task_payload = {
        "title": "Configurar switch da sala de servidores",
        "description": "VLANs 10, 20 e 30 com portas trunk",
        "priority": "alta",
        "status": "pendente",
        "visibility": "equipe",
        "category": "Redes",
        "otrs_reference": "Ticket#20260924005",
        "due_date": (datetime.now(timezone.utc) + timedelta(days=2)).isoformat()
    }
    create_res = client.post("/tasks", json=task_payload, headers=headers)
    assert create_res.status_code == 201
    created_task = create_res.json()
    task_id = created_task["id"]
    assert created_task["title"] == task_payload["title"]
    assert created_task["otrs_reference"] == "Ticket#20260924005"
    assert created_task["status"] == "pendente"
    assert created_task["completed_at"] is None

    # 2. Get Task by ID
    get_res = client.get(f"/tasks/{task_id}", headers=headers)
    assert get_res.status_code == 200
    assert get_res.json()["id"] == task_id

    # 3. List Tasks with filter
    list_res = client.get("/tasks?status=pendente&priority=alta", headers=headers)
    assert list_res.status_code == 200
    tasks = list_res.json()
    assert any(t["id"] == task_id for t in tasks)

    # 4. Update Task (PUT)
    update_res = client.put(
        f"/tasks/{task_id}",
        json={"title": "Configurar switch central - Revisado", "priority": "urgente"},
        headers=headers
    )
    assert update_res.status_code == 200
    assert update_res.json()["title"] == "Configurar switch central - Revisado"
    assert update_res.json()["priority"] == "urgente"

    # 5. Patch status to concluida
    status_res = client.patch(
        f"/tasks/{task_id}/status",
        json={"status": "concluida"},
        headers=headers
    )
    assert status_res.status_code == 200
    updated_status = status_res.json()
    assert updated_status["status"] == "concluida"
    assert updated_status["completed_at"] is not None

    # 6. Reopen task
    reopen_res = client.patch(
        f"/tasks/{task_id}/status",
        json={"status": "em_andamento"},
        headers=headers
    )
    assert reopen_res.status_code == 200
    assert reopen_res.json()["status"] == "em_andamento"
    assert reopen_res.json()["completed_at"] is None

    # 7. Delete Task
    del_res = client.delete(f"/tasks/{task_id}", headers=headers)
    assert del_res.status_code == 200
    assert del_res.json()["message"] == "Tarefa excluída com sucesso"

    # Verify not found
    get_after_del = client.get(f"/tasks/{task_id}", headers=headers)
    assert get_after_del.status_code == 404

def test_checklists_and_items_lifecycle():
    token = get_auth_token()
    headers = {"Authorization": f"Bearer {token}"}

    # 1. Create Checklist
    checklist_payload = {
        "title": "Checklist de Troca de HD",
        "description": "Procedimento padrão de substituição de disco",
        "items": [
            {"title": "Backup prévio dos dados", "position": 1},
            {"title": "Desligar equipamento da tomada", "position": 2}
        ]
    }
    res = client.post("/checklists", json=checklist_payload, headers=headers)
    assert res.status_code == 201
    checklist = res.json()
    checklist_id = checklist["id"]
    assert len(checklist["items"]) == 2
    assert checklist["items"][0]["title"] == "Backup prévio dos dados"
    assert checklist["items"][0]["is_completed"] is False

    # 2. Add an item
    add_item_res = client.post(
        f"/checklists/{checklist_id}/items",
        json={"title": "Fixar parafusos anti-vibração", "position": 3},
        headers=headers
    )
    assert add_item_res.status_code == 201
    new_item = add_item_res.json()
    item_id = new_item["id"]

    # 3. Complete an item
    complete_res = client.patch(
        f"/checklists/{checklist_id}/items/{item_id}",
        json={"is_completed": True},
        headers=headers
    )
    assert complete_res.status_code == 200
    completed_item = complete_res.json()
    assert completed_item["is_completed"] is True
    assert completed_item["completed_at"] is not None
    assert completed_item["completed_by_id"] is not None

    # 4. Delete checklist item
    del_item_res = client.delete(f"/checklists/{checklist_id}/items/{item_id}", headers=headers)
    assert del_item_res.status_code == 200

    # 5. Delete checklist
    del_res = client.delete(f"/checklists/{checklist_id}", headers=headers)
    assert del_res.status_code == 200

def test_reminders_crud():
    token = get_auth_token()
    headers = {"Authorization": f"Bearer {token}"}

    # 1. Create Reminder
    remind_time = (datetime.now(timezone.utc) + timedelta(hours=3)).isoformat()
    reminder_payload = {
        "title": "Cobrar retorno da operadora de fibra",
        "description": "Protocolo de abertura na operadora: 998811",
        "remind_at": remind_time,
        "priority": "alta"
    }
    create_res = client.post("/reminders", json=reminder_payload, headers=headers)
    assert create_res.status_code == 201
    reminder = create_res.json()
    reminder_id = reminder["id"]
    assert reminder["title"] == reminder_payload["title"]
    assert reminder["status"] == "pendente"

    # 2. List Reminders
    list_res = client.get("/reminders?status=pendente", headers=headers)
    assert list_res.status_code == 200
    reminders = list_res.json()
    assert any(r["id"] == reminder_id for r in reminders)

    # 3. Patch Reminder Status
    patch_res = client.patch(
        f"/reminders/{reminder_id}/status",
        json={"status": "concluido"},
        headers=headers
    )
    assert patch_res.status_code == 200
    assert patch_res.json()["status"] == "concluido"

    # 4. Delete Reminder
    del_res = client.delete(f"/reminders/{reminder_id}", headers=headers)
    assert del_res.status_code == 200

def test_calendar_events():
    token = get_auth_token()
    headers = {"Authorization": f"Bearer {token}"}

    start = datetime.now(timezone.utc) + timedelta(days=1)
    end = start + timedelta(hours=2)

    # 1. Create Event
    event_payload = {
        "title": "Janela de Atualização de Firmware",
        "description": "Firewall principal",
        "start_time": start.isoformat(),
        "end_time": end.isoformat(),
        "event_type": "manutencao"
    }
    create_res = client.post("/calendar/events", json=event_payload, headers=headers)
    assert create_res.status_code == 201
    event = create_res.json()
    event_id = event["id"]
    assert event["title"] == event_payload["title"]

    # 2. Invalid date range (end before start)
    invalid_payload = {
        "title": "Evento inválido",
        "start_time": end.isoformat(),
        "end_time": start.isoformat(),
        "event_type": "atividade"
    }
    invalid_res = client.post("/calendar/events", json=invalid_payload, headers=headers)
    assert invalid_res.status_code == 400

    # 3. List Events
    list_res = client.get(f"/calendar/events?event_type=manutencao", headers=headers)
    assert list_res.status_code == 200
    assert any(e["id"] == event_id for e in list_res.json())

    # 4. Delete Event
    del_res = client.delete(f"/calendar/events/{event_id}", headers=headers)
    assert del_res.status_code == 200

def test_unauthenticated_access_blocked():
    # Unauthenticated requests must receive 401
    assert client.get("/tasks").status_code == 401
    assert client.get("/checklists").status_code == 401
    assert client.get("/reminders").status_code == 401
    assert client.get("/calendar/events").status_code == 401
