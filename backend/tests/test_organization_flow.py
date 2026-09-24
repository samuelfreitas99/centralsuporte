from datetime import datetime, timedelta, timezone
import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_full_operational_organization_flow():
    # Step 1: Login as admin
    login_res = client.post("/auth/login", json={"username": "admin", "password": "admin123"})
    assert login_res.status_code == 200
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Step 2: Create a task referencing an official OTRS ticket
    task_payload = {
        "title": "Substituição de switch de borda - Filial 02",
        "description": "Switch queimado após surto elétrico. Substituir por modelo pré-configurado.",
        "priority": "urgente",
        "status": "pendente",
        "visibility": "equipe",
        "category": "Infraestrutura",
        "otrs_reference": "Ticket#20260924099",
        "due_date": (datetime.now(timezone.utc) + timedelta(hours=6)).isoformat()
    }
    create_task_res = client.post("/tasks", json=task_payload, headers=headers)
    assert create_task_res.status_code == 201
    task = create_task_res.json()
    task_id = task["id"]
    assert task["title"] == task_payload["title"]
    assert task["otrs_reference"] == "Ticket#20260924099"
    assert task["status"] == "pendente"

    # Step 3: Add an operational checklist to the task
    checklist_payload = {
        "title": "Procedimento de Troca do Switch",
        "task_id": task_id,
        "items": [
            {"title": "Desconectar cabos de rede identificando portas", "position": 1},
            {"title": "Fixar switch novo no rack", "position": 2},
            {"title": "Conectar uplink e testar conectividade das VLANs", "position": 3}
        ]
    }
    chk_res = client.post("/checklists", json=checklist_payload, headers=headers)
    assert chk_res.status_code == 201
    checklist = chk_res.json()
    assert len(checklist["items"]) == 3
    items = checklist["items"]

    # Step 4: Advance task to "em_andamento"
    status_to_progress = client.patch(
        f"/tasks/{task_id}/status",
        json={"status": "em_andamento"},
        headers=headers
    )
    assert status_to_progress.status_code == 200
    assert status_to_progress.json()["status"] == "em_andamento"

    # Step 5: Mark checklist items as completed one by one
    for it in items:
        toggle_res = client.patch(
            f"/checklists/{checklist['id']}/items/{it['id']}",
            json={"is_completed": True},
            headers=headers
        )
        assert toggle_res.status_code == 200
        completed_data = toggle_res.json()
        assert completed_data["is_completed"] is True
        assert completed_data["completed_at"] is not None
        assert completed_data["completed_by_id"] is not None

    # Step 6: Create a shift reminder to follow up
    remind_payload = {
        "title": "Verificar telemetria do switch da Filial 02",
        "remind_at": (datetime.now(timezone.utc) + timedelta(hours=2)).isoformat(),
        "priority": "alta",
        "task_id": task_id
    }
    rem_res = client.post("/reminders", json=remind_payload, headers=headers)
    assert rem_res.status_code == 201
    reminder_id = rem_res.json()["id"]

    # Step 7: Mark task as completed
    complete_res = client.patch(
        f"/tasks/{task_id}/status",
        json={"status": "concluida"},
        headers=headers
    )
    assert complete_res.status_code == 200
    completed_task = complete_res.json()
    assert completed_task["status"] == "concluida"
    assert completed_task["completed_at"] is not None

    # Step 8: Verify task in completed filter query
    list_completed = client.get("/tasks?status=concluida", headers=headers)
    assert list_completed.status_code == 200
    assert any(t["id"] == task_id for t in list_completed.json())

    # Step 9: Schedule maintenance window event in the calendar
    start_time = datetime.now(timezone.utc) + timedelta(days=3)
    end_time = start_time + timedelta(hours=2)
    cal_res = client.post("/calendar/events", json={
        "title": "Janela de Atualização do Firmware de Borda",
        "start_time": start_time.isoformat(),
        "end_time": end_time.isoformat(),
        "event_type": "manutencao"
    }, headers=headers)
    assert cal_res.status_code == 201
    event_id = cal_res.json()["id"]

    # Step 10: Clean up flow artifacts
    client.delete(f"/calendar/events/{event_id}", headers=headers)
    client.delete(f"/reminders/{reminder_id}", headers=headers)
    client.delete(f"/tasks/{task_id}", headers=headers)
