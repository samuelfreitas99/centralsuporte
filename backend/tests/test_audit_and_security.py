import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.main import app
from app.database import SessionLocal
from app.models import User, Role, Permission, AuditLog
from app.auth import get_password_hash, create_access_token
from app.services.audit import record_audit_log, sanitize_audit_data

client = TestClient(app)


@pytest.fixture(scope="module", autouse=True)
def setup_audit_test_data():
    db: Session = SessionLocal()

    # Permissions
    perm_audit = db.query(Permission).filter(Permission.name == "audit:read").first()
    if not perm_audit:
        perm_audit = Permission(name="audit:read", description="Consultar trilhas de auditoria")
        db.add(perm_audit)
        db.flush()

    # Roles
    admin_role = db.query(Role).filter(Role.name == "Administrador").first()
    tech_role = db.query(Role).filter(Role.name == "Técnico").first()

    # Users
    admin_user = db.query(User).filter(User.username == "audit_admin").first()
    if not admin_user:
        admin_user = User(
            username="audit_admin",
            email="audit_admin@central.local",
            hashed_password=get_password_hash("Admin123!"),
            is_active=True,
            role_id=admin_role.id if admin_role else None,
        )
        db.add(admin_user)

    tech_user = db.query(User).filter(User.username == "audit_tech").first()
    if not tech_user:
        tech_user = User(
            username="audit_tech",
            email="audit_tech@central.local",
            hashed_password=get_password_hash("Tech123!"),
            is_active=True,
            role_id=tech_role.id if tech_role else None,
        )
        db.add(tech_user)

    db.commit()
    db.close()


def get_token(username: str):
    return create_access_token(data={"sub": username})


def test_sanitize_audit_data_masks_sensitive_keys():
    raw_data = {
        "username": "joao",
        "password": "SuperSecretPassword123!",
        "token": "bearer-jwt-token-xyz",
        "nested": {
            "password_hash": "$2b$12$somehash",
            "api_secret": "my-secret-key",
            "safe_metric": 42,
        },
    }
    sanitized = sanitize_audit_data(raw_data)

    assert sanitized["username"] == "joao"
    assert sanitized["password"] == "[REDACTED]"
    assert sanitized["token"] == "[REDACTED]"
    assert sanitized["nested"]["password_hash"] == "[REDACTED]"
    assert sanitized["nested"]["api_secret"] == "[REDACTED]"
    assert sanitized["nested"]["safe_metric"] == 42


def test_record_audit_log_creates_entry_in_db():
    db: Session = SessionLocal()
    admin = db.query(User).filter(User.username == "audit_admin").first()

    entry = record_audit_log(
        db=db,
        action="UPDATE",
        entity_type="equipment",
        entity_id=99,
        user=admin,
        details={"hostname": "SW-CORE-TEST", "password": "dont_show_this"},
        ip_address="192.168.1.50",
    )
    db.commit()

    assert entry is not None
    assert entry.id is not None
    assert entry.username == "audit_admin"
    assert entry.action == "UPDATE"
    assert entry.entity_type == "equipment"
    assert entry.entity_id == 99
    assert "[REDACTED]" in entry.details
    assert "dont_show_this" not in entry.details

    db.close()


def test_audit_logs_endpoint_permissions():
    admin_token = get_token("audit_admin")
    tech_token = get_token("audit_tech")

    # 1. Tech without audit:read permission receives 403 Forbidden
    res_forbidden = client.get(
        "/audit-logs",
        headers={"Authorization": f"Bearer {tech_token}"},
    )
    assert res_forbidden.status_code == 403
    assert "permissão 'audit:read' necessária" in res_forbidden.json()["detail"]

    # 2. Admin receives 200 OK
    res_ok = client.get(
        "/audit-logs",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert res_ok.status_code == 200
    data = res_ok.json()
    assert "total" in data
    assert "results" in data
    assert isinstance(data["results"], list)


def test_audit_logs_filtering_and_metadata():
    admin_token = get_token("audit_admin")
    headers = {"Authorization": f"Bearer {admin_token}"}

    # Metadata
    res_meta = client.get("/audit-logs/metadata", headers=headers)
    assert res_meta.status_code == 200
    meta = res_meta.json()
    assert "actions" in meta
    assert "entity_types" in meta
    assert "UPDATE" in meta["actions"]

    # Filter by action
    res_filtered = client.get("/audit-logs", params={"action": "UPDATE"}, headers=headers)
    assert res_filtered.status_code == 200
    filtered_data = res_filtered.json()
    for item in filtered_data["results"]:
        assert item["action"] == "UPDATE"


def test_login_audit_trail():
    admin_token = get_token("audit_admin")
    headers = {"Authorization": f"Bearer {admin_token}"}

    # 1. Attempt failed login
    client.post("/auth/login", json={"username": "audit_admin", "password": "WrongPassword!"})

    # 2. Attempt successful login
    client.post("/auth/login", json={"username": "audit_admin", "password": "Admin123!"})

    # 3. Check that LOGIN and LOGIN_FAILED appear in audit logs
    res = client.get("/audit-logs", params={"username": "audit_admin"}, headers=headers)
    assert res.status_code == 200
    results = res.json()["results"]
    actions = {item["action"] for item in results}

    assert "LOGIN" in actions
    assert "LOGIN_FAILED" in actions
