import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def get_admin_headers():
    response = client.post("/auth/login", json={"username": "admin", "password": "admin123"})
    token = response.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}

def test_create_project():
    headers = get_admin_headers()
    data = {
        "title": "Projeto Abertura Loja",
        "description": "Infra, Redes e PDVs",
        "status": "planejado"
    }
    response = client.post("/projects/", json=data, headers=headers)
    assert response.status_code == 201, response.text
    project = response.json()
    assert project["title"] == "Projeto Abertura Loja"
    assert project["status"] == "planejado"
    assert "id" in project

def test_list_projects():
    headers = get_admin_headers()
    response = client.get("/projects/", headers=headers)
    assert response.status_code == 200
    assert isinstance(response.json(), list)

def test_get_project():
    headers = get_admin_headers()
    # Create
    response = client.post("/projects/", json={"title": "Test Get"}, headers=headers)
    project_id = response.json()["id"]

    # Get
    response = client.get(f"/projects/{project_id}", headers=headers)
    assert response.status_code == 200
    assert response.json()["id"] == project_id

def test_update_project():
    headers = get_admin_headers()
    # Create
    response = client.post("/projects/", json={"title": "Test Update"}, headers=headers)
    project_id = response.json()["id"]

    # Update
    response = client.put(f"/projects/{project_id}", json={"status": "em_andamento"}, headers=headers)
    assert response.status_code == 200
    assert response.json()["status"] == "em_andamento"

def test_create_project_note():
    headers = get_admin_headers()
    # Create Project
    response = client.post("/projects/", json={"title": "Test Notes"}, headers=headers)
    project_id = response.json()["id"]

    # Create Note
    note_data = {"note": "Iniciando as medições de cabeamento."}
    response = client.post(f"/projects/{project_id}/notes", json=note_data, headers=headers)
    assert response.status_code == 201
    assert response.json()["note"] == "Iniciando as medições de cabeamento."
    assert "id" in response.json()

def test_project_timeline():
    headers = get_admin_headers()
    # Create Project
    response = client.post("/projects/", json={"title": "Test Timeline"}, headers=headers)
    project_id = response.json()["id"]

    # Create Note
    client.post(f"/projects/{project_id}/notes", json={"note": "Nota 1"}, headers=headers)

    # Get Timeline
    response = client.get(f"/projects/{project_id}/timeline", headers=headers)
    assert response.status_code == 200
    events = response.json()
    assert len(events) >= 2 # 1 audit (CREATE) + 1 note
    types = [e["type"] for e in events]
    assert "audit" in types
    assert "note" in types

def test_project_summary():
    headers = get_admin_headers()
    response = client.post("/projects/", json={"title": "Test Summary"}, headers=headers)
    project_id = response.json()["id"]

    # Link a task to the project
    task_data = {
        "title": "Task 1 linked to project",
        "project_id": project_id
    }
    client.post("/tasks/", json=task_data, headers=headers)

    response = client.get(f"/projects/{project_id}/summary", headers=headers)
    assert response.status_code == 200
    summary = response.json()
    assert summary["total_tasks"] == 1
    assert summary["progress_percentage"] == 0.0

def test_delete_project_preserves_task():
    headers = get_admin_headers()
    response = client.post("/projects/", json={"title": "Test Delete Preserves"}, headers=headers)
    project_id = response.json()["id"]

    task_response = client.post("/tasks/", json={"title": "Task to survive", "project_id": project_id}, headers=headers)
    task_id = task_response.json()["id"]

    # Delete project
    del_response = client.delete(f"/projects/{project_id}", headers=headers)
    assert del_response.status_code == 204

    # Verify task is still there and project_id is null
    task_after = client.get(f"/tasks/{task_id}", headers=headers)
    assert task_after.status_code == 200
    assert task_after.json()["project_id"] is None


def test_project_deadline_is_saved_and_returned():
    """O prazo do formulário (expected_end_date) precisa ser salvo — o frontend enviava um campo inexistente."""
    from fastapi.testclient import TestClient
    from app.main import app
    c = TestClient(app)
    token = c.post("/auth/login", json={"username": "admin", "password": "admin123"}).json()["access_token"]
    h = {"Authorization": f"Bearer {token}"}
    created = c.post("/projects/", json={"title": "Prazo", "expected_end_date": "2026-12-20T00:00:00Z"}, headers=h).json()
    assert created["expected_end_date"].startswith("2026-12-20")
    upd = c.put(f"/projects/{created['id']}", json={"end_date": "2026-12-18T00:00:00Z", "status": "concluido"}, headers=h).json()
    assert upd["end_date"].startswith("2026-12-18")
