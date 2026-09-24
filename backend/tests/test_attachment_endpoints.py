import os
import io
import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.database import Base, engine, SessionLocal
from app.models import User, Role, Permission
from app.auth import get_password_hash, create_access_token

client = TestClient(app)


@pytest.fixture(scope="module", autouse=True)
def setup_database():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    # Seed permissions
    read_perm = db.query(Permission).filter(Permission.name == "attachment:read").first()
    if not read_perm:
        read_perm = Permission(name="attachment:read", description="Visualizar e baixar anexos")
        db.add(read_perm)

    upload_perm = db.query(Permission).filter(Permission.name == "attachment:upload").first()
    if not upload_perm:
        upload_perm = Permission(name="attachment:upload", description="Fazer upload de anexos")
        db.add(upload_perm)

    delete_perm = db.query(Permission).filter(Permission.name == "attachment:delete").first()
    if not delete_perm:
        delete_perm = Permission(name="attachment:delete", description="Excluir arquivos e anexos")
        db.add(delete_perm)

    db.flush()

    role = db.query(Role).filter(Role.name == "Tecnico_Attachment_Test").first()
    if not role:
        role = Role(name="Tecnico_Attachment_Test", description="Role teste para anexos")
        db.add(role)
        db.flush()

    current_perm_ids = {p.id for p in role.permissions}
    for p in [read_perm, upload_perm, delete_perm]:
        if p.id not in current_perm_ids:
            role.permissions.append(p)

    test_user = db.query(User).filter(User.username == "attachment_tester").first()
    if not test_user:
        test_user = User(
            username="attachment_tester",
            email="tester@centralsuporte.local",
            hashed_password=get_password_hash("secret123"),
            is_active=True,
            role_id=role.id,
        )
        db.add(test_user)

    db.commit()
    db.close()


def get_auth_token():
    return create_access_token(data={"sub": "attachment_tester"})


def test_attachment_lifecycle_and_security(tmp_path):
    token = get_auth_token()
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
    assert created_att["file_hash"] is not None
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

    # 6. Delete attachment
    res_delete = client.delete(f"/attachments/{attachment_id}", headers=headers)
    assert res_delete.status_code == 200

    # 7. Verify deletion
    res_meta_after = client.get(f"/attachments/{attachment_id}", headers=headers)
    assert res_meta_after.status_code == 404
