import pytest
import uuid
from datetime import datetime, timezone
from fastapi.testclient import TestClient
from app.main import app
from app.database import SessionLocal
from app.models import User, Role, Department, Store, Task, Attendance, MaintenanceRecord, Project, AuditLog, task_assignments

client = TestClient(app)


def get_token_for(username: str = "admin", password: str = "admin123"):
    res = client.post("/auth/login", json={"username": username, "password": password})
    assert res.status_code == 200, f"Login failed for {username}: {res.text}"
    return res.json()["access_token"]


def test_user_identity_creation_and_department():
    admin_token = get_token_for("admin", "admin123")
    headers = {"Authorization": f"Bearer {admin_token}"}

    # 1. Create Store & Department
    db = SessionLocal()
    store = db.query(Store).filter(Store.code == "ST-USER-01").first()
    if not store:
        store = Store(name="Loja Identidade 01", code="ST-USER-01")
        db.add(store)
        db.commit()
        db.refresh(store)

    dept = db.query(Department).filter(Department.name == "Suporte N2 Teste").first()
    if not dept:
        dept = Department(name="Suporte N2 Teste", store_id=store.id, status="ativa")
        db.add(dept)
        db.commit()
        db.refresh(dept)
    dept_id = dept.id

    inactive_dept = db.query(Department).filter(Department.name == "Setor Desativado").first()
    if not inactive_dept:
        inactive_dept = Department(name="Setor Desativado", store_id=store.id, status="inativa")
        db.add(inactive_dept)
        db.commit()
        db.refresh(inactive_dept)
    inactive_dept_id = inactive_dept.id

    tecnico_role = db.query(Role).filter(Role.name == "Técnico").first()
    tecnico_role_id = tecnico_role.id
    db.close()

    # 2. Creating with inactive department should fail
    fail_res = client.post(
        "/users",
        json={
            "username": "user_dept_fail",
            "email": "dept_fail@central.local",
            "password": "Password123!",
            "department_id": inactive_dept_id,
        },
        headers=headers,
    )
    assert fail_res.status_code == 400
    assert "inativo" in fail_res.json()["detail"].lower()

    # 3. Creating with nonexistent department should fail
    fail_res2 = client.post(
        "/users",
        json={
            "username": "user_dept_fail2",
            "email": "dept_fail2@central.local",
            "password": "Password123!",
            "department_id": 999999,
        },
        headers=headers,
    )
    assert fail_res2.status_code == 400

    # 4. Successful creation with full identity fields
    unique_suffix = uuid.uuid4().hex[:6]
    payload = {
        "username": f"carlos_silva_{unique_suffix}",
        "email": f"carlos.silva_{unique_suffix}@centralsuporte.local",
        "password": "SenhaSegura123!",
        "full_name": "Carlos Eduardo Silva",
        "display_name": "Carlos Silva",
        "avatar_url": "/uploads/avatars/carlos.png",
        "phone": "(11) 98765-4321",
        "job_title": "Analista de Suporte Pleno",
        "department_id": dept_id,
        "preferences": '{"theme": "dark", "density": "compact"}',
        "role_ids": [tecnico_role_id],
        "is_active": True,
    }
    create_res = client.post("/users", json=payload, headers=headers)
    assert create_res.status_code == 201
    user_data = create_res.json()
    assert user_data["username"] == f"carlos_silva_{unique_suffix}"
    assert user_data["full_name"] == "Carlos Eduardo Silva"
    assert user_data["display_name"] == "Carlos Silva"
    assert user_data["job_title"] == "Analista de Suporte Pleno"
    assert user_data["department"]["name"] == "Suporte N2 Teste"
    assert len(user_data["roles"]) == 1
    assert user_data["roles"][0]["name"] == "Técnico"

    # Cleanup
    client.delete(f"/users/{user_data['id']}", headers=headers)


def test_multi_role_and_permission_union():
    admin_token = get_token_for("admin", "admin123")
    headers = {"Authorization": f"Bearer {admin_token}"}

    db = SessionLocal()
    tecnico_role = db.query(Role).filter(Role.name == "Técnico").first()
    gestor_role = db.query(Role).filter(Role.name == "Gestor").first()
    tecnico_role_id = tecnico_role.id
    gestor_role_id = gestor_role.id
    db.close()

    unique_suffix = uuid.uuid4().hex[:6]
    payload = {
        "username": f"mariana_gestora_tec_{unique_suffix}",
        "email": f"mariana_{unique_suffix}@centralsuporte.local",
        "password": "SenhaSegura123!",
        "full_name": "Mariana Souza",
        "display_name": "Mariana S.",
        "role_ids": [tecnico_role_id, gestor_role_id],
        "is_active": True,
    }
    create_res = client.post("/users", json=payload, headers=headers)
    assert create_res.status_code == 201
    created_user = create_res.json()
    user_id = created_user["id"]

    try:
        # Check roles on user
        assert len(created_user["roles"]) == 2
        role_names = [r["name"] for r in created_user["roles"]]
        assert "Técnico" in role_names
        assert "Gestor" in role_names

        # Login as multi-role user
        user_token = get_token_for(f"mariana_gestora_tec_{unique_suffix}", "SenhaSegura123!")
        user_headers = {"Authorization": f"Bearer {user_token}"}

        # Multi-role user has Gestor permissions (e.g. audit:read via /audit-logs)
        audit_res = client.get("/audit-logs", headers=user_headers)
        assert audit_res.status_code == 200

        # And also has Técnico permissions (attendance:read, tasks:read)
        att_res = client.get("/attendances", headers=user_headers)
        assert att_res.status_code == 200

    finally:
        client.delete(f"/users/{user_id}", headers=headers)


def test_user_without_role():
    admin_token = get_token_for("admin", "admin123")
    headers = {"Authorization": f"Bearer {admin_token}"}

    unique_suffix = uuid.uuid4().hex[:6]
    payload = {
        "username": f"usuario_sem_role_{unique_suffix}",
        "email": f"norole_{unique_suffix}@centralsuporte.local",
        "password": "SenhaSegura123!",
        "full_name": "Sem Perfil",
        "display_name": "Sem Role",
        "role_ids": [],
        "is_active": True,
    }
    create_res = client.post("/users", json=payload, headers=headers)
    assert create_res.status_code == 201
    created_user = create_res.json()
    user_id = created_user["id"]

    try:
        assert len(created_user["roles"]) == 0
        user_token = get_token_for(f"usuario_sem_role_{unique_suffix}", "SenhaSegura123!")
        user_headers = {"Authorization": f"Bearer {user_token}"}

        # Cannot access permission-protected endpoints
        res = client.get("/users", headers=user_headers)
        assert res.status_code == 403
    finally:
        client.delete(f"/users/{user_id}", headers=headers)


def test_inactive_user_blocks_login_and_token():
    admin_token = get_token_for("admin", "admin123")
    headers = {"Authorization": f"Bearer {admin_token}"}

    db = SessionLocal()
    consulta_role = db.query(Role).filter(Role.name == "Consulta").first()
    consulta_role_id = consulta_role.id
    db.close()

    unique_suffix = uuid.uuid4().hex[:6]
    username = f"usuario_inativavel_{unique_suffix}"
    payload = {
        "username": username,
        "email": f"inativavel_{unique_suffix}@centralsuporte.local",
        "password": "SenhaSegura123!",
        "role_ids": [consulta_role_id],
        "is_active": True,
    }
    create_res = client.post("/users", json=payload, headers=headers)
    assert create_res.status_code == 201
    user_id = create_res.json()["id"]

    try:
        # 1. Obtains valid token while active
        user_token = get_token_for(username, "SenhaSegura123!")
        user_headers = {"Authorization": f"Bearer {user_token}"}

        me_res = client.get("/auth/me", headers=user_headers)
        assert me_res.status_code == 200

        # 2. Admin deactivates the user
        deactivate_res = client.put(f"/users/{user_id}", json={"is_active": False}, headers=headers)
        assert deactivate_res.status_code == 200
        assert deactivate_res.json()["is_active"] is False

        # 3. Existing token is immediately rejected live by get_current_active_user
        blocked_res = client.get("/auth/me", headers=user_headers)
        assert blocked_res.status_code == 403
        assert "inativo" in blocked_res.json()["detail"].lower()

        # 4. New login attempt is blocked
        login_fail = client.post(
            "/auth/login",
            json={"username": username, "password": "SenhaSegura123!"},
        )
        assert login_fail.status_code == 403
        assert "inativo" in login_fail.json()["detail"].lower()

        # 5. List users with is_active=True filter excludes this user
        list_active = client.get("/users?is_active=true", headers=headers)
        assert list_active.status_code == 200
        usernames = [u["username"] for u in list_active.json()]
        assert username not in usernames

        # 6. List users with is_active=false includes this user
        list_inactive = client.get("/users?is_active=false", headers=headers)
        assert list_inactive.status_code == 200
        inactive_usernames = [u["username"] for u in list_inactive.json()]
        assert username in inactive_usernames

    finally:
        client.delete(f"/users/{user_id}", headers=headers)


def test_last_login_at_updated_on_login():
    db = SessionLocal()
    admin_user = db.query(User).filter(User.username == "admin").first()
    old_last_login = admin_user.last_login_at
    db.close()

    # Login successfully
    client.post("/auth/login", json={"username": "admin", "password": "admin123"})

    db = SessionLocal()
    admin_user = db.query(User).filter(User.username == "admin").first()
    new_last_login = admin_user.last_login_at
    db.close()

    assert new_last_login is not None
    if old_last_login:
        assert new_last_login >= old_last_login


def test_profile_endpoint_privacy_and_masking():
    admin_token = get_token_for("admin", "admin123")
    headers = {"Authorization": f"Bearer {admin_token}"}

    db = SessionLocal()
    tecnico_role = db.query(Role).filter(Role.name == "Técnico").first()
    consulta_role = db.query(Role).filter(Role.name == "Consulta").first()
    tecnico_role_id = tecnico_role.id
    consulta_role_id = consulta_role.id
    db.close()

    unique_suffix = uuid.uuid4().hex[:6]
    user_a_name = f"tecnico_privado_{unique_suffix}"
    user_b_name = f"usuario_comum_b_{unique_suffix}"

    user_a_res = client.post(
        "/users",
        json={
            "username": user_a_name,
            "email": f"privado_{unique_suffix}@centralsuporte.local",
            "password": "SenhaSegura123!",
            "full_name": "Técnico Privado",
            "display_name": "Tec Priv",
            "phone": "(11) 91111-2222",
            "job_title": "Técnico de Campo",
            "preferences": '{"notifications": false}',
            "role_ids": [tecnico_role_id],
        },
        headers=headers,
    )
    assert user_a_res.status_code == 201
    user_a = user_a_res.json()

    user_b_res = client.post(
        "/users",
        json={
            "username": user_b_name,
            "email": f"comum_b_{unique_suffix}@centralsuporte.local",
            "password": "SenhaSegura123!",
            "role_ids": [consulta_role_id],
        },
        headers=headers,
    )
    assert user_b_res.status_code == 201
    user_b = user_b_res.json()

    try:
        user_a_token = get_token_for(user_a_name, "SenhaSegura123!")
        user_b_token = get_token_for(user_b_name, "SenhaSegura123!")

        # 1. User A viewing their own profile: private data disclosed
        res_own = client.get(f"/users/{user_a['id']}/profile", headers={"Authorization": f"Bearer {user_a_token}"})
        assert res_own.status_code == 200
        data_own = res_own.json()
        assert data_own["email"] == f"privado_{unique_suffix}@centralsuporte.local"
        assert data_own["phone"] == "(11) 91111-2222"
        assert data_own["preferences"] == '{"notifications": false}'
        assert data_own["display_name"] == "Tec Priv"

        # Also test /users/me/profile
        res_me = client.get("/users/me/profile", headers={"Authorization": f"Bearer {user_a_token}"})
        assert res_me.status_code == 200
        assert res_me.json()["email"] == f"privado_{unique_suffix}@centralsuporte.local"

        # 2. Admin viewing user A profile: private data disclosed
        res_admin = client.get(f"/users/{user_a['id']}/profile", headers=headers)
        assert res_admin.status_code == 200
        assert res_admin.json()["email"] == f"privado_{unique_suffix}@centralsuporte.local"
        assert res_admin.json()["phone"] == "(11) 91111-2222"

        # 3. User B (regular peer) viewing user A profile: private data MASKED / NULL
        res_peer = client.get(f"/users/{user_a['id']}/profile", headers={"Authorization": f"Bearer {user_b_token}"})
        assert res_peer.status_code == 200
        data_peer = res_peer.json()
        # Operational fields are visible
        assert data_peer["display_name"] == "Tec Priv"
        assert data_peer["job_title"] == "Técnico de Campo"
        # Private fields are MASKED (None)
        assert data_peer["email"] is None
        assert data_peer["phone"] is None
        assert data_peer["preferences"] is None

    finally:
        client.delete(f"/users/{user_a['id']}", headers=headers)
        client.delete(f"/users/{user_b['id']}", headers=headers)


def test_profile_self_update_and_privilege_escalation_block():
    admin_token = get_token_for("admin", "admin123")
    headers = {"Authorization": f"Bearer {admin_token}"}

    db = SessionLocal()
    tecnico_role = db.query(Role).filter(Role.name == "Técnico").first()
    admin_role = db.query(Role).filter(Role.name == "Administrador").first()
    tecnico_role_id = tecnico_role.id
    admin_role_id = admin_role.id
    db.close()

    unique_suffix = uuid.uuid4().hex[:6]
    username = f"tecnico_autoedit_{unique_suffix}"
    create_res = client.post(
        "/users",
        json={
            "username": username,
            "email": f"autoedit_{unique_suffix}@centralsuporte.local",
            "password": "SenhaSegura123!",
            "display_name": "Antes",
            "role_ids": [tecnico_role_id],
        },
        headers=headers,
    )
    assert create_res.status_code == 201
    user = create_res.json()
    user_id = user["id"]

    try:
        user_token = get_token_for(username, "SenhaSegura123!")
        user_headers = {"Authorization": f"Bearer {user_token}"}

        # 1. User updates allowed fields
        update_res = client.put(
            "/users/me/profile",
            json={
                "display_name": "Nome Alterado Por Mim",
                "phone": "(11) 99999-0000",
                "avatar_url": "/uploads/new_avatar.png",
                "preferences": '{"mode": "compact"}',
                # Attacking payload: trying to give self admin privileges or change job_title
                "roles": [admin_role_id],
                "role_ids": [admin_role_id],
                "job_title": "Diretor Supremo",
                "is_active": False,
            },
            headers=user_headers,
        )
        assert update_res.status_code == 200
        updated = update_res.json()
        assert updated["display_name"] == "Nome Alterado Por Mim"
        assert updated["phone"] == "(11) 99999-0000"
        assert updated["avatar_url"] == "/uploads/new_avatar.png"
        assert updated["job_title"] is None  # Escalation ignored!
        assert len(updated["roles"]) == 1
        assert updated["roles"][0]["name"] == "Técnico"  # Role remained Técnico!

        # 2. Regular user calling admin endpoint /users/{id} fails with 403
        attack_admin_route = client.put(
            f"/users/{user_id}",
            json={"role_ids": [admin_role_id]},
            headers=user_headers,
        )
        assert attack_admin_route.status_code == 403

    finally:
        client.delete(f"/users/{user_id}", headers=headers)


def test_user_stats_aggregation():
    admin_token = get_token_for("admin", "admin123")
    headers = {"Authorization": f"Bearer {admin_token}"}

    db = SessionLocal()
    tecnico_role = db.query(Role).filter(Role.name == "Técnico").first()
    tecnico_role_id = tecnico_role.id
    db.close()

    unique_suffix = uuid.uuid4().hex[:6]
    create_res = client.post(
        "/users",
        json={
            "username": f"tecnico_stats_{unique_suffix}",
            "email": f"stats_{unique_suffix}@centralsuporte.local",
            "password": "SenhaSegura123!",
            "role_ids": [tecnico_role_id],
        },
        headers=headers,
    )
    assert create_res.status_code == 201
    user = create_res.json()
    user_id = user["id"]

    try:
        # Create an attendance for this user as technician
        att_res = client.post(
            "/attendances",
            json={
                "title": "Chamado Teste Stats",
                "status": "resolvido",
                "technician_id": user_id,
            },
            headers=headers,
        )
        assert att_res.status_code == 201

        # Create a task assigned to this user
        task_res = client.post(
            "/tasks",
            json={
                "title": "Tarefa Aberta Stats",
                "status": "em_andamento",
                "assigned_user_ids": [user_id],
            },
            headers=headers,
        )
        assert task_res.status_code == 201

        # Fetch stats
        stats_res = client.get(f"/users/{user_id}/stats", headers=headers)
        assert stats_res.status_code == 200
        stats = stats_res.json()
        assert stats["user_id"] == user_id
        assert stats["open_tasks"] >= 1
        assert stats["resolved_attendances"] >= 1
        assert stats["active_projects"] == 0

    finally:
        db = SessionLocal()
        db.query(Attendance).filter(Attendance.technician_id == user_id).delete(synchronize_session=False)
        db.execute(task_assignments.delete().where(task_assignments.c.user_id == user_id))
        db.query(Task).filter(Task.title == "Tarefa Aberta Stats").delete(synchronize_session=False)
        db.commit()
        db.close()
        client.delete(f"/users/{user_id}", headers=headers)


def test_audit_log_records_user_changes():
    admin_token = get_token_for("admin", "admin123")
    headers = {"Authorization": f"Bearer {admin_token}"}

    unique_suffix = uuid.uuid4().hex[:6]
    # Create a user
    user_res = client.post(
        "/users",
        json={
            "username": f"audit_user_{unique_suffix}",
            "email": f"audit_{unique_suffix}@centralsuporte.local",
            "password": "SenhaSegura123!",
            "full_name": "Audit Test",
        },
        headers=headers,
    )
    assert user_res.status_code == 201
    user = user_res.json()
    user_id = user["id"]

    try:
        # Check audit log for CREATE
        db = SessionLocal()
        create_log = (
            db.query(AuditLog)
            .filter(AuditLog.entity_type == "user", AuditLog.entity_id == user_id, AuditLog.action == "CREATE")
            .first()
        )
        assert create_log is not None
        assert "SenhaSegura123!" not in create_log.details
        assert "hashed_password" not in create_log.details
        db.close()

        # Update user
        client.put(
            f"/users/{user_id}",
            json={"job_title": "Supervisor de TI"},
            headers=headers,
        )

        db = SessionLocal()
        update_log = (
            db.query(AuditLog)
            .filter(AuditLog.entity_type == "user", AuditLog.entity_id == user_id, AuditLog.action == "UPDATE")
            .first()
        )
        assert update_log is not None
        assert "Supervisor de TI" in update_log.details
        db.close()

    finally:
        client.delete(f"/users/{user_id}", headers=headers)
