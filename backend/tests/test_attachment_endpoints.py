import io
import os
from unittest.mock import patch
import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.database import Base, engine, SessionLocal
from app.models import Attendance, Attachment, Permission, Project, Role, Task, User
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

    # 5. Outsider user: has attachment:upload & attachment:delete & attachment:read, but NO contextual permissions
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

    # 6. User with attachment:read and tasks:read, but outsider to private tasks of others
    task_reader_role = db.query(Role).filter(Role.name == "Role_Task_Reader").first()
    if not task_reader_role:
        task_reader_role = Role(name="Role_Task_Reader", description="Task reader role")
        task_reader_role.permissions.extend([
            get_or_create_perm(db, "attachment:read"),
            get_or_create_perm(db, "tasks:read"),
        ])
        db.add(task_reader_role)
        db.flush()

    task_reader_user = db.query(User).filter(User.username == "att_task_reader").first()
    if not task_reader_user:
        task_reader_user = User(
            username="att_task_reader",
            email="task_reader@central.local",
            hashed_password=get_password_hash("secret123"),
            is_active=True,
        )
        task_reader_user.roles = [task_reader_role]
        db.add(task_reader_user)

    # 7. Seed test parent entities:
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

    # Private task with id=97 owned by attachment_tester
    private_task = db.query(Task).filter(Task.id == 97).first()
    if not private_task:
        private_task = Task(
            id=97,
            title="Tarefa Privada Teste 97",
            creator_id=test_user.id,
            visibility="privada",
            status="pendente",
            priority="media",
        )
        db.add(private_task)
    else:
        private_task.creator_id = test_user.id
        private_task.visibility = "privada"

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


# ==============================================================================
# 5. TAREFA 4 — READ METADATA SCENARIOS
# ==============================================================================

def test_read_metadata_scenarios():
    """Valida leitura contextual de metadados, 403 para não autorizados e 404 para inexistentes/deletados."""
    token_tester = get_token_for("attachment_tester")
    token_outsider = get_token_for("att_outsider_user")
    token_inactive = get_token_for("att_inactive_user")
    storage = get_storage()

    # 1. Cria anexo de teste no atendimento 99
    res_upload = client.post(
        "/attachments/upload",
        files={"file": ("meta_test.txt", io.BytesIO(b"conteudo meta"), "text/plain")},
        data={"entity_type": "attendance", "entity_id": 99, "description": "Descricao de teste"},
        headers={"Authorization": f"Bearer {token_tester}"},
    )
    assert res_upload.status_code == 201
    att_id = res_upload.json()["id"]
    stored_name = res_upload.json()["stored_filename"]

    # 2. Usuário autorizado consulta metadados com sucesso
    res_meta = client.get(f"/attachments/{att_id}", headers={"Authorization": f"Bearer {token_tester}"})
    assert res_meta.status_code == 200
    meta = res_meta.json()
    assert meta["id"] == att_id
    assert meta["original_filename"] == "meta_test.txt"
    assert meta["entity_type"] == "attendance"
    assert meta["entity_id"] == 99
    assert meta["file_size"] == len(b"conteudo meta")
    assert meta["stored_filename"] == stored_name
    assert "file_path" not in meta

    # 3. Usuário com attachment:read mas SEM acesso contextual recebe 403
    res_outsider = client.get(f"/attachments/{att_id}", headers={"Authorization": f"Bearer {token_outsider}"})
    assert res_outsider.status_code == 403

    # 4. Usuário inativo recebe 403
    res_inactive = client.get(f"/attachments/{att_id}", headers={"Authorization": f"Bearer {token_inactive}"})
    assert res_inactive.status_code == 403

    # 5. Attachment inexistente retorna 404
    res_nonexistent = client.get("/attachments/99999999", headers={"Authorization": f"Bearer {token_tester}"})
    assert res_nonexistent.status_code == 404

    # 6. Attachment soft-deleted retorna 404
    db = SessionLocal()
    try:
        att = db.query(Attachment).filter(Attachment.id == att_id).first()
        from datetime import datetime, timezone
        att.deleted_at = datetime.now(timezone.utc)
        db.commit()

        res_deleted = client.get(f"/attachments/{att_id}", headers={"Authorization": f"Bearer {token_tester}"})
        assert res_deleted.status_code == 404

        # Cleanup
        storage.delete(stored_name)
        db.delete(att)
        db.commit()
    finally:
        db.close()


# ==============================================================================
# 6. TAREFA 4 — DOWNLOAD SCENARIOS & STORAGE PROTECTION
# ==============================================================================

def test_download_scenarios_and_storage_protection():
    """Valida download contextual, bloqueio de tarefas privadas e que o storage nunca é acessado em 403."""
    token_tester = get_token_for("attachment_tester")
    token_outsider = get_token_for("att_outsider_user")
    token_task_reader = get_token_for("att_task_reader")
    storage = get_storage()

    # 1. Anexo no atendimento 99
    fake_data = b"DADOS IMPORTANTES DO ATENDIMENTO 99"
    res_upload_att = client.post(
        "/attachments/upload",
        files={"file": ("relatorio.pdf", io.BytesIO(fake_data), "application/pdf")},
        data={"entity_type": "attendance", "entity_id": 99},
        headers={"Authorization": f"Bearer {token_tester}"},
    )
    assert res_upload_att.status_code == 201
    att_id = res_upload_att.json()["id"]
    stored_name = res_upload_att.json()["stored_filename"]

    # 2. Anexo na tarefa privada 97
    res_upload_task = client.post(
        "/attachments/upload",
        files={"file": ("privado.txt", io.BytesIO(b"SEGREDO TAREFA 97"), "text/plain")},
        data={"entity_type": "task", "entity_id": 97},
        headers={"Authorization": f"Bearer {token_tester}"},
    )
    assert res_upload_task.status_code == 201
    task_att_id = res_upload_task.json()["id"]
    task_stored_name = res_upload_task.json()["stored_filename"]

    # 3. Usuário autorizado baixa com sucesso
    res_down = client.get(f"/attachments/{att_id}/download", headers={"Authorization": f"Bearer {token_tester}"})
    assert res_down.status_code == 200
    assert res_down.content == fake_data
    assert "attachment" in res_down.headers.get("content-disposition", "")

    # 4. Usuário outsider (sem attendance:read) recebe 403 e NÃO toca no storage
    with patch.object(storage, "get_path") as mock_get_path, patch.object(storage, "exists") as mock_exists:
        res_denied = client.get(f"/attachments/{att_id}/download", headers={"Authorization": f"Bearer {token_outsider}"})
        assert res_denied.status_code == 403
        mock_get_path.assert_not_called()
        mock_exists.assert_not_called()

    # 5. att_task_reader possui attachment:read e tasks:read, mas a tarefa 97 é privada de outro usuário
    # Prova que permissão global NÃO é suficiente quando a regra contextual da entidade nega
    res_task_denied = client.get(f"/attachments/{task_att_id}/download", headers={"Authorization": f"Bearer {token_task_reader}"})
    assert res_task_denied.status_code == 403

    # O dono da tarefa privada consegue baixar
    res_task_owner = client.get(f"/attachments/{task_att_id}/download", headers={"Authorization": f"Bearer {token_tester}"})
    assert res_task_owner.status_code == 200
    assert res_task_owner.content == b"SEGREDO TAREFA 97"

    # 6. Attachment inexistente retorna 404
    res_none = client.get("/attachments/99999999/download", headers={"Authorization": f"Bearer {token_tester}"})
    assert res_none.status_code == 404

    # 7. Arquivo físico ausente no storage retorna 404 coerente
    storage.delete(stored_name)
    assert storage.exists(stored_name) is False
    res_missing_file = client.get(f"/attachments/{att_id}/download", headers={"Authorization": f"Bearer {token_tester}"})
    assert res_missing_file.status_code == 404
    assert "Arquivo físico não encontrado" in res_missing_file.json()["detail"]

    # Cleanup
    storage.delete(task_stored_name)
    db = SessionLocal()
    try:
        a1 = db.query(Attachment).filter(Attachment.id == att_id).first()
        a2 = db.query(Attachment).filter(Attachment.id == task_att_id).first()
        if a1: db.delete(a1)
        if a2: db.delete(a2)
        db.commit()
    finally:
        db.close()


# ==============================================================================
# 7. TAREFA 4 — PREVIEW SCENARIOS & STORAGE PROTECTION
# ==============================================================================

def test_preview_scenarios_and_storage_protection():
    """Valida preview inline contextual e proteção antecipada de storage."""
    token_tester = get_token_for("attachment_tester")
    token_outsider = get_token_for("att_outsider_user")
    storage = get_storage()

    png_bytes = b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDRTEST"
    res_upload = client.post(
        "/attachments/upload",
        files={"file": ("esquema.png", io.BytesIO(png_bytes), "image/png")},
        data={"entity_type": "attendance", "entity_id": 99},
        headers={"Authorization": f"Bearer {token_tester}"},
    )
    assert res_upload.status_code == 201
    att_id = res_upload.json()["id"]
    stored_name = res_upload.json()["stored_filename"]

    # 1. Usuário autorizado visualiza inline
    res_prev = client.get(f"/attachments/{att_id}/preview", headers={"Authorization": f"Bearer {token_tester}"})
    assert res_prev.status_code == 200
    assert res_prev.content == png_bytes
    assert "inline" in res_prev.headers.get("content-disposition", "")
    assert res_prev.headers.get("content-type") == "image/png"

    # 2. Usuário não autorizado recebe 403 e NÃO toca no storage
    with patch.object(storage, "get_path") as mock_get_path, patch.object(storage, "exists") as mock_exists:
        res_prev_denied = client.get(f"/attachments/{att_id}/preview", headers={"Authorization": f"Bearer {token_outsider}"})
        assert res_prev_denied.status_code == 403
        mock_get_path.assert_not_called()
        mock_exists.assert_not_called()

    # 3. Soft-deleted retorna 404
    db = SessionLocal()
    try:
        att = db.query(Attachment).filter(Attachment.id == att_id).first()
        from datetime import datetime, timezone
        att.deleted_at = datetime.now(timezone.utc)
        db.commit()

        res_deleted = client.get(f"/attachments/{att_id}/preview", headers={"Authorization": f"Bearer {token_tester}"})
        assert res_deleted.status_code == 404

        # Cleanup
        storage.delete(stored_name)
        db.delete(att)
        db.commit()
    finally:
        db.close()


# ==============================================================================
# 8. TAREFA 4 — LIST ATTACHMENTS CONTEXTUAL FILTERING
# ==============================================================================

def test_list_attachments_contextual_filtering():
    """Valida listagem de anexos com filtros, ocultação contextual de entidades privadas e exclusão de soft-deleted."""
    token_tester = get_token_for("attachment_tester")
    token_outsider = get_token_for("att_outsider_user")
    token_task_reader = get_token_for("att_task_reader")
    storage = get_storage()

    # Anexo 1: Atendimento 99
    res1 = client.post(
        "/attachments/upload",
        files={"file": ("doc_att.txt", io.BytesIO(b"att 99 doc"), "text/plain")},
        data={"entity_type": "attendance", "entity_id": 99},
        headers={"Authorization": f"Bearer {token_tester}"},
    )
    assert res1.status_code == 201
    id1 = res1.json()["id"]
    file1 = res1.json()["stored_filename"]

    # Anexo 2: Tarefa privada 97
    res2 = client.post(
        "/attachments/upload",
        files={"file": ("doc_task.txt", io.BytesIO(b"task 97 doc"), "text/plain")},
        data={"entity_type": "task", "entity_id": 97},
        headers={"Authorization": f"Bearer {token_tester}"},
    )
    assert res2.status_code == 201
    id2 = res2.json()["id"]
    file2 = res2.json()["stored_filename"]

    # Anexo 3: No atendimento 99, mas soft-deletado
    res3 = client.post(
        "/attachments/upload",
        files={"file": ("deleted_doc.txt", io.BytesIO(b"deleted doc"), "text/plain")},
        data={"entity_type": "attendance", "entity_id": 99},
        headers={"Authorization": f"Bearer {token_tester}"},
    )
    assert res3.status_code == 201
    id3 = res3.json()["id"]
    file3 = res3.json()["stored_filename"]

    # Marca Anexo 3 como deleted_at
    db = SessionLocal()
    try:
        att3 = db.query(Attachment).filter(Attachment.id == id3).first()
        from datetime import datetime, timezone
        att3.deleted_at = datetime.now(timezone.utc)
        db.commit()
    finally:
        db.close()

    # 1. attachment_tester lista com filtros específicos: vê id1, mas não vê id3 (deletado)
    res_list_filter = client.get(
        "/attachments",
        params={"entity_type": "attendance", "entity_id": 99},
        headers={"Authorization": f"Bearer {token_tester}"},
    )
    assert res_list_filter.status_code == 200
    ids = [item["id"] for item in res_list_filter.json()]
    assert id1 in ids
    assert id3 not in ids

    # 2. outsider tenta listar com filtro do atendimento 99: recebe 403 (autorização contextual falha)
    res_outsider_filter = client.get(
        "/attachments",
        params={"entity_type": "attendance", "entity_id": 99},
        headers={"Authorization": f"Bearer {token_outsider}"},
    )
    assert res_outsider_filter.status_code == 403

    # 3. att_task_reader tenta listar anexos da tarefa privada 97: recebe 403
    res_task_reader_filter = client.get(
        "/attachments",
        params={"entity_type": "task", "entity_id": 97},
        headers={"Authorization": f"Bearer {token_task_reader}"},
    )
    assert res_task_reader_filter.status_code == 403

    # 4. Listagem ampla sem filtros:
    # attachment_tester vê id1 e id2, nunca id3
    res_broad_tester = client.get("/attachments", headers={"Authorization": f"Bearer {token_tester}"})
    assert res_broad_tester.status_code == 200
    broad_tester_ids = [item["id"] for item in res_broad_tester.json()]
    assert id1 in broad_tester_ids
    assert id2 in broad_tester_ids
    assert id3 not in broad_tester_ids

    # att_outsider_user faz listagem ampla: NÃO vê id1, id2, nem id3 (todos omitidos contextualmente)
    res_broad_outsider = client.get("/attachments", headers={"Authorization": f"Bearer {token_outsider}"})
    assert res_broad_outsider.status_code == 200
    broad_outsider_ids = [item["id"] for item in res_broad_outsider.json()]
    assert id1 not in broad_outsider_ids
    assert id2 not in broad_outsider_ids
    assert id3 not in broad_outsider_ids

    # 5. Filtros inválidos
    res_invalid_type = client.get("/attachments", params={"entity_type": "tipo_inexistente"}, headers={"Authorization": f"Bearer {token_tester}"})
    assert res_invalid_type.status_code == 400

    res_nonexistent_entity = client.get(
        "/attachments",
        params={"entity_type": "attendance", "entity_id": 99999999},
        headers={"Authorization": f"Bearer {token_tester}"},
    )
    assert res_nonexistent_entity.status_code == 404

    # Cleanup
    storage.delete(file1)
    storage.delete(file2)
    storage.delete(file3)
    db = SessionLocal()
    try:
        for x in [id1, id2, id3]:
            a = db.query(Attachment).filter(Attachment.id == x).first()
            if a: db.delete(a)
        db.commit()
    finally:
        db.close()

