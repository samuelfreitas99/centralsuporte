import io
import json
import pytest
from unittest.mock import patch
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.main import app
from app.database import Base, engine, SessionLocal
from app.models import Attachment, Attendance, AuditLog, Permission, Role, User
from app.auth import get_password_hash, create_access_token
from app.services.storage import get_storage

client = TestClient(app)


def get_or_create_perm(db, name, desc=""):
    perm = db.query(Permission).filter(Permission.name == name).first()
    if not perm:
        perm = Permission(name=name, description=desc or name)
        db.add(perm)
        db.flush()
    return perm


@pytest.fixture(scope="module", autouse=True)
def setup_audit_test_db():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    perms = [
        get_or_create_perm(db, "attachment:read"),
        get_or_create_perm(db, "attachment:upload"),
        get_or_create_perm(db, "attachment:delete"),
        get_or_create_perm(db, "attendance:read"),
        get_or_create_perm(db, "attendance:write"),
    ]

    role = db.query(Role).filter(Role.name == "Role_Audit_Tester").first()
    if not role:
        role = Role(name="Role_Audit_Tester", description="Role para testes de auditoria de anexos")
        db.add(role)
        db.flush()

    for p in perms:
        if p not in role.permissions:
            role.permissions.append(p)

    user = db.query(User).filter(User.username == "audit_uploader").first()
    if not user:
        user = User(
            username="audit_uploader",
            email="audit_uploader@test.local",
            hashed_password=get_password_hash("secret123"),
            is_active=True,
        )
        user.roles.append(role)
        db.add(user)
        db.flush()

    # Create unprivileged user (no permissions)
    unprivileged = db.query(User).filter(User.username == "audit_unprivileged").first()
    if not unprivileged:
        unprivileged = User(
            username="audit_unprivileged",
            email="audit_unprivileged@test.local",
            hashed_password=get_password_hash("secret123"),
            is_active=True,
        )
        db.add(unprivileged)
        db.flush()

    # Create sample attendance
    attendance = db.query(Attendance).filter(Attendance.title == "Atendimento Teste Audit").first()
    if not attendance:
        attendance = Attendance(
            title="Atendimento Teste Audit",
            technician_id=user.id,
            status="em_andamento",
            problem_description="Atendimento para teste de auditoria de anexos",
        )
        db.add(attendance)
        db.flush()

    db.commit()
    db.close()


def get_token(username: str = "audit_uploader") -> str:
    db = SessionLocal()
    user = db.query(User).filter(User.username == username).first()
    token = create_access_token({"sub": user.username})
    db.close()
    return token


def get_attendance_id() -> int:
    db = SessionLocal()
    attendance = db.query(Attendance).filter(Attendance.title == "Atendimento Teste Audit").first()
    att_id = attendance.id
    db.close()
    return att_id


# --------------------------------------------------------------------------
# 1. UPLOAD: EVENTO attachment.uploaded E DADOS REGISTRADOS
# --------------------------------------------------------------------------

def test_authorized_upload_creates_exactly_one_audit_log():
    token = get_token("audit_uploader")
    att_id = get_attendance_id()
    db = SessionLocal()

    # Count audit logs before upload
    count_before = db.query(AuditLog).filter(
        AuditLog.entity_type == "attachment",
        AuditLog.action == "ATTACHMENT.UPLOADED",
    ).count()

    pdf_content = b"%PDF-1.4\n1 0 obj\n<<>>\nendobj\ntrailer\n<<>>\n%%EOF"
    res = client.post(
        "/attachments/upload",
        headers={"Authorization": f"Bearer {token}"},
        data={"entity_type": "attendance", "entity_id": att_id, "description": "Manual de auditoria"},
        files={"file": ("manual_auditoria.pdf", io.BytesIO(pdf_content), "application/pdf")},
    )
    assert res.status_code == 201
    attachment_id = res.json()["id"]

    # Verify exactly one new audit log
    logs = db.query(AuditLog).filter(
        AuditLog.entity_type == "attachment",
        AuditLog.entity_id == attachment_id,
        AuditLog.action == "ATTACHMENT.UPLOADED",
    ).all()

    assert len(logs) == 1
    log = logs[0]

    # Verify actor
    user = db.query(User).filter(User.username == "audit_uploader").first()
    assert log.user_id == user.id
    assert log.username == "audit_uploader"

    # Verify entity
    assert log.entity_type == "attachment"
    assert log.entity_id == attachment_id

    # Verify metadata in details
    details = json.loads(log.details)
    assert details["event"] == "attachment.uploaded"
    assert details["original_filename"] == "manual_auditoria.pdf"
    assert details["mime_type"] == "application/pdf"
    assert details["file_size"] == len(pdf_content)
    assert details["parent_entity_type"] == "attendance"
    assert details["parent_entity_id"] == att_id

    # Verify sensitive/dangerous data is NOT in details or log
    assert "stored_filename" not in details
    assert "file_path" not in details
    assert "content" not in details
    assert "password" not in details
    assert "token" not in details
    assert str(pdf_content) not in (log.details or "")

    db.close()


# --------------------------------------------------------------------------
# 2. FALHAS NO UPLOAD NÃO GERAM AUDITLOG
# --------------------------------------------------------------------------

def test_unauthorized_upload_does_not_create_audit_log():
    token = get_token("audit_unprivileged")
    att_id = get_attendance_id()
    db = SessionLocal()

    count_before = db.query(AuditLog).count()

    pdf_content = b"%PDF-1.4\ntest forbidden content\n%%EOF"
    res = client.post(
        "/attachments/upload",
        headers={"Authorization": f"Bearer {token}"},
        data={"entity_type": "attendance", "entity_id": att_id},
        files={"file": ("forbidden.pdf", io.BytesIO(pdf_content), "application/pdf")},
    )
    assert res.status_code == 403

    count_after = db.query(AuditLog).count()
    assert count_before == count_after
    db.close()


def test_upload_invalid_mime_does_not_create_audit_log():
    token = get_token("audit_uploader")
    att_id = get_attendance_id()
    db = SessionLocal()

    count_before = db.query(AuditLog).count()

    res = client.post(
        "/attachments/upload",
        headers={"Authorization": f"Bearer {token}"},
        data={"entity_type": "attendance", "entity_id": att_id},
        files={"file": ("doc.pdf", io.BytesIO(b"%PDF-1.4 fake"), "application/x-malicious-unknown")},
    )
    assert res.status_code == 400

    count_after = db.query(AuditLog).count()
    assert count_before == count_after
    db.close()


def test_upload_dangerous_executable_does_not_create_audit_log():
    token = get_token("audit_uploader")
    att_id = get_attendance_id()
    db = SessionLocal()

    count_before = db.query(AuditLog).count()

    res = client.post(
        "/attachments/upload",
        headers={"Authorization": f"Bearer {token}"},
        data={"entity_type": "attendance", "entity_id": att_id},
        files={"file": ("evil.exe", io.BytesIO(b"MZ\x90\x00malware"), "application/octet-stream")},
    )
    assert res.status_code == 400

    count_after = db.query(AuditLog).count()
    assert count_before == count_after
    db.close()


def test_upload_exceeding_size_limit_does_not_create_audit_log():
    token = get_token("audit_uploader")
    att_id = get_attendance_id()
    db = SessionLocal()

    count_before = db.query(AuditLog).count()

    # Mock MAX_FILE_SIZE to 50 bytes for test
    with patch("app.routers.attachments.MAX_FILE_SIZE", 50):
        res = client.post(
            "/attachments/upload",
            headers={"Authorization": f"Bearer {token}"},
            data={"entity_type": "attendance", "entity_id": att_id},
            files={"file": ("big.pdf", io.BytesIO(b"%PDF-1.4" + b"X" * 100), "application/pdf")},
        )
        assert res.status_code == 413

    count_after = db.query(AuditLog).count()
    assert count_before == count_after
    db.close()


def test_persistence_failure_rolls_back_audit_log():
    token = get_token("audit_uploader")
    att_id = get_attendance_id()
    db = SessionLocal()

    count_before = db.query(AuditLog).count()

    # Simulate database commit failure
    pdf_content = b"%PDF-1.4\ncrash commit test\n%%EOF"
    with patch.object(Session, "commit", side_effect=Exception("Database connection dropped during commit")):
        res = client.post(
            "/attachments/upload",
            headers={"Authorization": f"Bearer {token}"},
            data={"entity_type": "attendance", "entity_id": att_id},
            files={"file": ("crash.pdf", io.BytesIO(pdf_content), "application/pdf")},
        )
        assert res.status_code == 500

    # Ensure no orphan audit log was saved
    count_after = db.query(AuditLog).count()
    assert count_before == count_after
    db.close()


# --------------------------------------------------------------------------
# 3. DELETE: EVENTO attachment.deleted E DADOS REGISTRADOS
# --------------------------------------------------------------------------

def test_authorized_delete_creates_exactly_one_audit_log():
    token = get_token("audit_uploader")
    att_id = get_attendance_id()
    db = SessionLocal()

    # 1. Upload a file first
    pdf_content = b"%PDF-1.4\nfile to delete\n%%EOF"
    res_upload = client.post(
        "/attachments/upload",
        headers={"Authorization": f"Bearer {token}"},
        data={"entity_type": "attendance", "entity_id": att_id, "description": "Arquivo para excluir"},
        files={"file": ("para_excluir.pdf", io.BytesIO(pdf_content), "application/pdf")},
    )
    assert res_upload.status_code == 201
    attachment_id = res_upload.json()["id"]

    # 2. Delete attachment
    res_del = client.delete(
        f"/attachments/{attachment_id}",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert res_del.status_code == 200

    # 3. Verify exactly one attachment.deleted audit log
    logs = db.query(AuditLog).filter(
        AuditLog.entity_type == "attachment",
        AuditLog.entity_id == attachment_id,
        AuditLog.action == "ATTACHMENT.DELETED",
    ).all()

    assert len(logs) == 1
    log = logs[0]

    # Verify actor
    user = db.query(User).filter(User.username == "audit_uploader").first()
    assert log.user_id == user.id
    assert log.username == "audit_uploader"

    # Verify entity
    assert log.entity_type == "attachment"
    assert log.entity_id == attachment_id

    # Verify details
    details = json.loads(log.details)
    assert details["event"] == "attachment.deleted"
    assert details["original_filename"] == "para_excluir.pdf"
    assert details["parent_entity_type"] == "attendance"
    assert details["parent_entity_id"] == att_id

    # Verify soft delete persisted in database
    attachment = db.query(Attachment).filter(Attachment.id == attachment_id).first()
    assert attachment.deleted_at is not None

    # Verify physical file still exists in storage (soft delete does NOT erase physical file)
    storage = get_storage()
    assert storage.exists(attachment.stored_filename)

    db.close()


# --------------------------------------------------------------------------
# 4. FALHAS NO DELETE NÃO GERAM AUDITLOG
# --------------------------------------------------------------------------

def test_unauthorized_delete_does_not_create_audit_log():
    token_admin = get_token("audit_uploader")
    token_unprivileged = get_token("audit_unprivileged")
    att_id = get_attendance_id()
    db = SessionLocal()

    # Upload attachment with privileged user
    res_upload = client.post(
        "/attachments/upload",
        headers={"Authorization": f"Bearer {token_admin}"},
        data={"entity_type": "attendance", "entity_id": att_id},
        files={"file": ("protected.pdf", io.BytesIO(b"%PDF-1.4\nprotected\n%%EOF"), "application/pdf")},
    )
    attachment_id = res_upload.json()["id"]

    count_before = db.query(AuditLog).filter(
        AuditLog.entity_type == "attachment",
        AuditLog.action == "ATTACHMENT.DELETED",
    ).count()

    # Attempt delete with unprivileged user
    res_del = client.delete(
        f"/attachments/{attachment_id}",
        headers={"Authorization": f"Bearer {token_unprivileged}"},
    )
    assert res_del.status_code == 403

    count_after = db.query(AuditLog).filter(
        AuditLog.entity_type == "attachment",
        AuditLog.action == "ATTACHMENT.DELETED",
    ).count()
    assert count_before == count_after
    db.close()


def test_delete_nonexistent_attachment_does_not_create_audit_log():
    token = get_token("audit_uploader")
    db = SessionLocal()

    count_before = db.query(AuditLog).filter(
        AuditLog.entity_type == "attachment",
        AuditLog.action == "ATTACHMENT.DELETED",
    ).count()

    res = client.delete(
        "/attachments/9999999",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert res.status_code == 404

    count_after = db.query(AuditLog).filter(
        AuditLog.entity_type == "attachment",
        AuditLog.action == "ATTACHMENT.DELETED",
    ).count()
    assert count_before == count_after
    db.close()


def test_delete_already_deleted_attachment_does_not_create_duplicate_audit_log():
    token = get_token("audit_uploader")
    att_id = get_attendance_id()
    db = SessionLocal()

    # Upload and delete once
    res_upload = client.post(
        "/attachments/upload",
        headers={"Authorization": f"Bearer {token}"},
        data={"entity_type": "attendance", "entity_id": att_id},
        files={"file": ("double_del.pdf", io.BytesIO(b"%PDF-1.4\ndouble del\n%%EOF"), "application/pdf")},
    )
    attachment_id = res_upload.json()["id"]

    res_del1 = client.delete(
        f"/attachments/{attachment_id}",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert res_del1.status_code == 200

    # Count delete logs after first successful delete
    del_logs_count = db.query(AuditLog).filter(
        AuditLog.entity_type == "attachment",
        AuditLog.entity_id == attachment_id,
        AuditLog.action == "ATTACHMENT.DELETED",
    ).count()
    assert del_logs_count == 1

    # Attempt second delete (must return 404)
    res_del2 = client.delete(
        f"/attachments/{attachment_id}",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert res_del2.status_code == 404

    # Verify no new delete audit log was created
    del_logs_after = db.query(AuditLog).filter(
        AuditLog.entity_type == "attachment",
        AuditLog.entity_id == attachment_id,
        AuditLog.action == "ATTACHMENT.DELETED",
    ).count()
    assert del_logs_after == 1
    db.close()


# --------------------------------------------------------------------------
# 5. SEGURANÇA E HIGIENE: NENHUM DADO SENSÍVEL NO AUDITLOG
# --------------------------------------------------------------------------

def test_no_sensitive_data_in_any_attachment_audit_log():
    token = get_token("audit_uploader")
    att_id = get_attendance_id()
    db = SessionLocal()

    res_upload = client.post(
        "/attachments/upload",
        headers={"Authorization": f"Bearer {token}"},
        data={"entity_type": "attendance", "entity_id": att_id},
        files={"file": ("sensitive_check.pdf", io.BytesIO(b"%PDF-1.4\nconfidential content\n%%EOF"), "application/pdf")},
    )
    assert res_upload.status_code == 201
    attachment_id = res_upload.json()["id"]

    client.delete(
        f"/attachments/{attachment_id}",
        headers={"Authorization": f"Bearer {token}"},
    )

    logs = db.query(AuditLog).filter(
        AuditLog.entity_type == "attachment",
        AuditLog.entity_id == attachment_id,
    ).all()

    forbidden_substrings = [
        "confidential content",
        "stored_filename",
        "/app/uploads",
        "password",
        "Bearer",
        "token",
        "secret123",
    ]

    for log in logs:
        log_text = f"{log.action} {log.entity_type} {log.username} {log.details or ''}"
        for forbidden in forbidden_substrings:
            assert forbidden not in log_text, f"Audit log contained sensitive string '{forbidden}': {log_text}"

    db.close()
