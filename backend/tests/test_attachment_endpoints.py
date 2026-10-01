import io
import os
from unittest.mock import patch
import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.database import Base, engine, SessionLocal
from app.models import Attendance, Attachment, Permission, Project, Role, User
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
def setup_database():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    # 1. Seed global attachment and entity permissions
    perm_names = [
        "attachment:read",
        "attachment:upload",
        "attachment:delete",
        "attendance:read",
        "attendance:write",
        "project:read",
        "project:update",
        "project:delete",
        "tasks:read",
        "tasks:write",
    ]
    perms = [get_or_create_perm(db, name) for name in perm_names]
    db.flush()

    # 2. Main technician role & user
    role = db.query(Role).filter(Role.name == "Tecnico_Attachment_Test").first()
    if not role:
        role = Role(name="Tecnico_Attachment_Test", description="Role teste para anexos")
        db.add(role)
        db.flush()

    current_perm_ids = {p.id for p in role.permissions}
    for p in perms:
        if p.id not in current_perm_ids:
            role.permissions.append(p)

    test_user = db.query(User).filter(User.username == "attachment_tester").first()
    if not test_user:
        test_user = User(
            username="attachment_tester",
            email="tester@centralsuporte.local",
            hashed_password=get_password_hash("secret123"),
            is_active=True,
        )
        test_user.roles = [role]
        db.add(test_user)
        db.flush()

    # 3. User without upload permission (only read)
    read_only_role = db.query(Role).filter(Role.name == "Role_Attachment_ReadOnly").first()
    if not read_only_role:
        read_only_role = Role(name="Role_Attachment_ReadOnly", description="Read only")
        read_only_role.permissions.append(get_or_create_perm(db, "attachment:read"))
        db.add(read_only_role)
        db.flush()

    no_upload_user = db.query(User).filter(User.username == "att_no_upload_user").first()
    if not no_upload_user:
        no_upload_user = User(
            username="att_no_upload_user",
            email="no_upload@central.local",
            hashed_password=get_password_hash("secret123"),
            is_active=True,
        )
        no_upload_user.roles = [read_only_role]
        db.add(no_upload_user)

    # 4. Inactive user
    inactive_user = db.query(User).filter(User.username == "att_inactive_user").first()
    if not inactive_user:
        inactive_user = User(
            username="att_inactive_user",
            email="inactive@central.local",
            hashed_password=get_password_hash("secret123"),
            is_active=False,
        )
        inactive_user.roles = [role]
        db.add(inactive_user)

    # 5. Outsider user: has attachment:upload & attachment:delete, but NO contextual permissions for attendance
    outsider_role = db.query(Role).filter(Role.name == "Role_Attachment_Outsider").first()
    if not outsider_role:
        outsider_role = Role(name="Role_Attachment_Outsider", description="Outsider")
        outsider_role.permissions.extend([
            get_or_create_perm(db, "attachment:read"),
            get_or_create_perm(db, "attachment:upload"),
            get_or_create_perm(db, "attachment:delete"),
        ])
        db.add(outsider_role)
        db.flush()

    outsider_user = db.query(User).filter(User.username == "att_outsider_user").first()
    if not outsider_user:
        outsider_user = User(
            username="att_outsider_user",
            email="outsider@central.local",
            hashed_password=get_password_hash("secret123"),
            is_active=True,
        )
        outsider_user.roles = [outsider_role]
        db.add(outsider_user)

    # 6. Seed test parent entities:
    # Attendance with id=99 assigned to attachment_tester
    attendance = db.query(Attendance).filter(Attendance.id == 99).first()
    if not attendance:
        attendance = Attendance(
            id=99,
            title="Atendimento Teste Anexos 99",
            technician_id=test_user.id,
            status="em_andamento",
        )
        db.add(attendance)
    else:
        attendance.technician_id = test_user.id
        attendance.status = "em_andamento"

    # Cancelled project with id=98
    cancelled_proj = db.query(Project).filter(Project.id == 98).first()
    if not cancelled_proj:
        cancelled_proj = Project(
            id=98,
            title="Projeto Cancelado Teste 98",
            owner_id=test_user.id,
            status="cancelado",
        )
        db.add(cancelled_proj)
    else:
        cancelled_proj.status = "cancelado"
        cancelled_proj.owner_id = test_user.id

    db.commit()
    db.close()


def get_token_for(username: str) -> str:
    return create_access_token(data={"sub": username})


# ==============================================================================
# 1. LIFECYCLE HAPPY PATH TEST
# ==============================================================================

def test_attachment_lifecycle_and_security(tmp_path):
    token = get_token_for("attachment_tester")
    headers = {"Authorization": f"Bearer {token}"}

    # 1. Upload an attachment
    fake_content = b"LOG DE ERRO DO SWITCH HP:\nInterface GigabitEthernet1/0/1 is down"
    file_payload = {
        "file": ("switch_error.log", io.BytesIO(fake_content), "text/plain")
    }
    data_payload = {
        "entity_type": "attendance",
        "entity_id": 99,
        "description": "Log técnico de diagnóstico da porta com defeito",
    }

    res_upload = client.post(
        "/attachments/upload",
        files=file_payload,
        data=data_payload,
        headers=headers,
    )
    assert res_upload.status_code == 201
    created_att = res_upload.json()
    assert created_att["original_filename"] == "switch_error.log"
    assert created_att["entity_type"] == "attendance"
    assert created_att["entity_id"] == 99
    assert created_att["file_size"] == len(fake_content)
    assert "file_path" not in created_att
    assert "stored_filename" in created_att
    assert created_att["stored_filename"].endswith(".log")
    stored_filename = created_att["stored_filename"]
    attachment_id = created_att["id"]

    # 2. List attachments filtered by entity
    res_list = client.get(
        "/attachments",
        params={"entity_type": "attendance", "entity_id": 99},
        headers=headers,
    )
    assert res_list.status_code == 200
    items = res_list.json()
    assert len(items) >= 1
    assert any(item["id"] == attachment_id for item in items)

    # 3. Retrieve metadata
    res_meta = client.get(f"/attachments/{attachment_id}", headers=headers)
    assert res_meta.status_code == 200
    assert res_meta.json()["id"] == attachment_id
    assert "file_path" not in res_meta.json()

    # 4. Preview attachment (inline)
    res_preview = client.get(f"/attachments/{attachment_id}/preview", headers=headers)
    assert res_preview.status_code == 200
    assert res_preview.content == fake_content
    assert "inline" in res_preview.headers.get("content-disposition", "")

    # 5. Download attachment (attachment)
    res_download = client.get(f"/attachments/{attachment_id}/download", headers=headers)
    assert res_download.status_code == 200
    assert res_download.content == fake_content
    assert "attachment" in res_download.headers.get("content-disposition", "")

    # 6. Delete attachment (Soft delete)
    res_delete = client.delete(f"/attachments/{attachment_id}", headers=headers)
    assert res_delete.status_code == 200

    # 7. Verify soft deletion: not visible via API
    res_meta_after = client.get(f"/attachments/{attachment_id}", headers=headers)
    assert res_meta_after.status_code == 404

    # 8. Verify soft deletion in DB: record exists with deleted_at set
    db = SessionLocal()
    try:
        db_att = db.query(Attachment).filter(Attachment.id == attachment_id).first()
        assert db_att is not None
        assert db_att.deleted_at is not None

        # 9. Verify physical file is NOT deleted from storage during soft delete
        storage = get_storage()
        assert storage.exists(stored_filename) is True

        # Clean up test artifact from storage and DB
        storage.delete(stored_filename)
        db.delete(db_att)
        db.commit()
    finally:
        db.close()


# ==============================================================================
# 2. UPLOAD DENIED SCENARIOS
# ==============================================================================

def test_upload_denied_scenarios():
    """Valida todos os cenários de negação de upload sem tocar no storage."""
    storage = get_storage()

    # 6. Usuário sem attachment:upload
    token_no_upload = get_token_for("att_no_upload_user")
    res = client.post(
        "/attachments/upload",
        files={"file": ("test.txt", io.BytesIO(b"data"), "text/plain")},
        data={"entity_type": "attendance", "entity_id": 99},
        headers={"Authorization": f"Bearer {token_no_upload}"},
    )
    assert res.status_code == 403
    assert "attachment:upload" in res.json()["detail"]

    # 7. Usuário sem acesso contextual (outsider sem attendance:write)
    token_outsider = get_token_for("att_outsider_user")
    res = client.post(
        "/attachments/upload",
        files={"file": ("test.txt", io.BytesIO(b"data"), "text/plain")},
        data={"entity_type": "attendance", "entity_id": 99},
        headers={"Authorization": f"Bearer {token_outsider}"},
    )
    assert res.status_code == 403

    # 8. entity_type desconhecido
    token_tester = get_token_for("attachment_tester")
    res = client.post(
        "/attachments/upload",
        files={"file": ("test.txt", io.BytesIO(b"data"), "text/plain")},
        data={"entity_type": "entidade_inexistente_xyz", "entity_id": 99},
        headers={"Authorization": f"Bearer {token_tester}"},
    )
    assert res.status_code == 400
    assert "não suportado" in res.json()["detail"]

    # 9. entity_id inexistente
    res = client.post(
        "/attachments/upload",
        files={"file": ("test.txt", io.BytesIO(b"data"), "text/plain")},
        data={"entity_type": "attendance", "entity_id": 9999999},
        headers={"Authorization": f"Bearer {token_tester}"},
    )
    assert res.status_code == 404
    assert "não encontrada" in res.json()["detail"]

    # 10. Entidade em estado que bloqueia upload (Projeto Cancelado id=98)
    res = client.post(
        "/attachments/upload",
        files={"file": ("test.txt", io.BytesIO(b"data"), "text/plain")},
        data={"entity_type": "project", "entity_id": 98},
        headers={"Authorization": f"Bearer {token_tester}"},
    )
    assert res.status_code == 403

    # 11. Usuário inativo
    token_inactive = get_token_for("att_inactive_user")
    res = client.post(
        "/attachments/upload",
        files={"file": ("test.txt", io.BytesIO(b"data"), "text/plain")},
        data={"entity_type": "attendance", "entity_id": 99},
        headers={"Authorization": f"Bearer {token_inactive}"},
    )
    assert res.status_code == 403
    assert "inativo" in res.json()["detail"].lower()


# ==============================================================================
# 3. UPLOAD DB FAILURE CLEANUP TEST
# ==============================================================================

def test_upload_db_failure_cleans_up_storage():
    """12-14. Se a criação/commit no banco falhar, o arquivo físico recém-salvo deve ser removido."""
    token = get_token_for("attachment_tester")
    headers = {"Authorization": f"Bearer {token}"}
    storage = get_storage()

    saved_filenames = []
    original_save = storage.save

    def tracking_save(*args, **kwargs):
        res = original_save(*args, **kwargs)
        saved_filenames.append(res.stored_filename)
        return res

    with patch.object(storage, "save", side_effect=tracking_save):
        with patch("sqlalchemy.orm.Session.commit", side_effect=RuntimeError("Simulated DB Crash")):
            res = client.post(
                "/attachments/upload",
                files={"file": ("crash_test.txt", io.BytesIO(b"dados do crash"), "text/plain")},
                data={"entity_type": "attendance", "entity_id": 99},
                headers=headers,
            )
            assert res.status_code == 500

    # Verify that the file was indeed saved during step 2, but cleaned up in step 4
    assert len(saved_filenames) == 1
    stored_name = saved_filenames[0]
    assert storage.exists(stored_name) is False


# ==============================================================================
# 4. DELETE AUTHORIZATION & EDGE CASES
# ==============================================================================

def test_delete_authorization_and_edge_cases():
    """19-23. Valida negação de delete, 404 para inexistente/já deletado e preservação física."""
    token_tester = get_token_for("attachment_tester")
    token_no_delete = get_token_for("att_no_upload_user")  # only attachment:read
    token_outsider = get_token_for("att_outsider_user")    # no attendance:write

    # 1. Create an attachment to test deletion
    res_upload = client.post(
        "/attachments/upload",
        files={"file": ("delete_test.txt", io.BytesIO(b"conteudo para deletar"), "text/plain")},
        data={"entity_type": "attendance", "entity_id": 99},
        headers={"Authorization": f"Bearer {token_tester}"},
    )
    assert res_upload.status_code == 201
    att_id = res_upload.json()["id"]
    stored_filename = res_upload.json()["stored_filename"]
    storage = get_storage()

    # 19. Usuário sem attachment:delete (read only user)
    res_denied_perm = client.delete(
        f"/attachments/{att_id}",
        headers={"Authorization": f"Bearer {token_no_delete}"},
    )
    assert res_denied_perm.status_code == 403

    # 20. Usuário sem permissão contextual naquela entidade
    res_denied_ctx = client.delete(
        f"/attachments/{att_id}",
        headers={"Authorization": f"Bearer {token_outsider}"},
    )
    assert res_denied_ctx.status_code == 403

    # 22. Attachment inexistente
    res_nonexistent = client.delete(
        "/attachments/99999999",
        headers={"Authorization": f"Bearer {token_tester}"},
    )
    assert res_nonexistent.status_code == 404

    # 15. Usuário autorizado consegue excluir (soft delete)
    res_delete = client.delete(
        f"/attachments/{att_id}",
        headers={"Authorization": f"Bearer {token_tester}"},
    )
    assert res_delete.status_code == 200

    # 18. O arquivo físico NÃO foi apagado do storage
    assert storage.exists(stored_filename) is True

    # 23. Attachment já deletado retorna 404 em nova tentativa de delete
    res_already_deleted = client.delete(
        f"/attachments/{att_id}",
        headers={"Authorization": f"Bearer {token_tester}"},
    )
    assert res_already_deleted.status_code == 404

    # Cleanup test artifact from disk and DB
    storage.delete(stored_filename)
    db = SessionLocal()
    try:
        att = db.query(Attachment).filter(Attachment.id == att_id).first()
        if att:
            db.delete(att)
            db.commit()
    finally:
        db.close()
