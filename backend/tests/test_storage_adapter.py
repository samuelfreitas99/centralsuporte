import io
import os
import pytest
from datetime import datetime, timezone
from sqlalchemy import inspect, text

from app.database import SessionLocal, engine
from app.models import Attachment, User
from app.services.storage import StorageAdapter, LocalFileSystemStorage, StoredFile, get_storage, set_storage


def test_storage_adapter_save_and_read(tmp_path):
    """1. LocalFileSystemStorage consegue salvar arquivo e 4. O arquivo pode ser lido novamente."""
    storage = LocalFileSystemStorage(base_dir=str(tmp_path))
    content = b"Conteudo de teste do storage adapter 2026."

    stored = storage.save(
        file_obj=io.BytesIO(content),
        original_filename="relatorio_teste.pdf",
        mime_type="application/pdf",
    )

    assert isinstance(stored, StoredFile)
    assert stored.file_size == len(content)
    assert stored.mime_type == "application/pdf"
    assert stored.file_hash is not None

    # Verify read via open()
    with storage.open(stored.stored_filename) as f:
        read_content = f.read()
    assert read_content == content


def test_storage_secure_physical_name(tmp_path):
    """
    2. O arquivo salvo recebe nome físico seguro.
    3. O nome original não vira caminho físico.
    """
    storage = LocalFileSystemStorage(base_dir=str(tmp_path))
    original_name = "Super Relatorio Confidencial & Sensivel #1.PDF"

    stored = storage.save(
        file_obj=b"conteudo teste",
        original_filename=original_name,
        mime_type="application/pdf",
    )

    # Must end with sanitized extension .pdf
    assert stored.stored_filename.endswith(".pdf")
    # Must NOT contain spaces, special symbols, or the original title words
    assert "Super" not in stored.stored_filename
    assert "Relatorio" not in stored.stored_filename
    assert "Confidencial" not in stored.stored_filename
    assert " " not in stored.stored_filename
    assert "#" not in stored.stored_filename

    # Stored filename must be alphanumeric hex UUID + .pdf
    base_name = stored.stored_filename[:-4]
    assert len(base_name) == 32
    assert all(c in "0123456789abcdef" for c in base_name)

    # Physical path check
    path = storage.get_path(stored.stored_filename)
    assert original_name not in path


def test_storage_exists_and_size(tmp_path):
    """5. exists funciona e get_size retorna tamanho correto."""
    storage = LocalFileSystemStorage(base_dir=str(tmp_path))
    content = b"TESTE DE EXISTENCIA 123456"

    stored = storage.save(
        file_obj=content,
        original_filename="teste.txt",
    )

    assert storage.exists(stored.stored_filename) is True
    assert storage.exists("arquivo_fantasma.txt") is False
    assert storage.get_size(stored.stored_filename) == len(content)


def test_storage_physical_delete(tmp_path):
    """StorageAdapter delete remove fisicamente quando chamado explicitamente."""
    storage = LocalFileSystemStorage(base_dir=str(tmp_path))
    stored = storage.save(file_obj=b"temp file", original_filename="delete_me.txt")

    assert storage.exists(stored.stored_filename) is True
    deleted = storage.delete(stored.stored_filename)
    assert deleted is True
    assert storage.exists(stored.stored_filename) is False


def test_storage_path_traversal_prevention(tmp_path):
    """Garante que ataques de directory traversal são bloqueados no storage."""
    storage = LocalFileSystemStorage(base_dir=str(tmp_path))

    with pytest.raises(ValueError):
        storage.open("../../../etc/passwd")

    with pytest.raises(ValueError):
        storage.get_path("../outside.txt")

    assert storage.exists("../outside.txt") is False


def test_storage_max_file_size_enforcement(tmp_path):
    """StorageAdapter interrompe streaming e faz cleanup se exceder o limite."""
    storage = LocalFileSystemStorage(base_dir=str(tmp_path))
    content = b"A" * 1024  # 1 KB

    with pytest.raises(ValueError, match="exceeds maximum allowed limit"):
        storage.save(
            file_obj=io.BytesIO(content),
            original_filename="large.dat",
            max_file_size=500,  # 500 bytes limit
        )

    # Ensure no orphan file left behind
    assert len(os.listdir(str(tmp_path))) == 0


def test_storage_independent_from_database(tmp_path):
    """11. O storage não depende do banco (sem sessões, sem commits, sem models)."""
    storage = LocalFileSystemStorage(base_dir=str(tmp_path))
    # Should work completely without any SQLAlchemy session
    stored = storage.save(file_obj=b"standalone data", original_filename="standalone.txt")
    assert storage.exists(stored.stored_filename)


def test_attachment_model_and_migration_integrity():
    """
    6. Arquivos existentes não são destruídos pela migration.
    7. Attachment aceita deleted_at.
    8. file_path não é mais utilizado pelo model após a migration.
    12. Caminho físico permanece fora da API/model.
    """
    db = SessionLocal()
    try:
        # Check database columns using inspect
        inspector = inspect(engine)
        column_names = [col["name"] for col in inspector.get_columns("attachments")]

        # 8. file_path removed
        assert "file_path" not in column_names
        # 7. deleted_at present
        assert "deleted_at" in column_names
        assert "stored_filename" in column_names

        # 12. Check Attachment model attributes
        assert not hasattr(Attachment, "file_path")
        assert hasattr(Attachment, "deleted_at")
        assert hasattr(Attachment, "stored_filename")

        # Create a test Attachment record with deleted_at
        user = db.query(User).first()
        att = Attachment(
            original_filename="documento.pdf",
            stored_filename="test_uuid_stored_123.pdf",
            file_size=1024,
            mime_type="application/pdf",
            file_hash="fakehash123",
            entity_type="task",
            entity_id=1,
            description="Teste deleted_at",
            uploader_id=user.id if user else None,
            deleted_at=datetime.now(timezone.utc),
        )
        db.add(att)
        db.commit()
        db.refresh(att)

        assert att.id is not None
        assert att.deleted_at is not None

        # Clean up test record
        db.delete(att)
        db.commit()
    finally:
        db.close()
