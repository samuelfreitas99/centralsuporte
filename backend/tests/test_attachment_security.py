import io
import os
import pytest
from unittest.mock import patch
from fastapi.testclient import TestClient

from app.main import app
from app.database import Base, engine, SessionLocal
from app.models import Attachment, Attendance, Permission, Role, User
from app.auth import get_password_hash, create_access_token
from app.services.storage import get_storage
from app.services.attachment_security import (
    MAX_FILE_SIZE,
    validate_upload_metadata,
    validate_file_content,
    ALLOWED_EXTENSIONS_MAP,
    DANGEROUS_EXTENSIONS,
)

client = TestClient(app)


def get_or_create_perm(db, name, desc=""):
    perm = db.query(Permission).filter(Permission.name == name).first()
    if not perm:
        perm = Permission(name=name, description=desc or name)
        db.add(perm)
        db.flush()
    return perm


@pytest.fixture(scope="module", autouse=True)
def setup_security_test_db():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    perms = [
        get_or_create_perm(db, "attachment:read"),
        get_or_create_perm(db, "attachment:upload"),
        get_or_create_perm(db, "attachment:delete"),
        get_or_create_perm(db, "attendance:read"),
        get_or_create_perm(db, "attendance:write"),
    ]

    role = db.query(Role).filter(Role.name == "Role_Security_Tester").first()
    if not role:
        role = Role(name="Role_Security_Tester", description="Role para testes de segurança de arquivos")
        db.add(role)
        db.flush()

    for p in perms:
        if p not in role.permissions:
            role.permissions.append(p)

    user = db.query(User).filter(User.username == "sec_uploader").first()
    if not user:
        user = User(
            username="sec_uploader",
            email="sec_uploader@test.local",
            hashed_password=get_password_hash("secret123"),
            is_active=True,
        )
        user.roles = [role]
        db.add(user)
        db.flush()

    # Attendance parent entity
    attendance = db.query(Attendance).filter(Attendance.id == 99).first()
    if not attendance:
        attendance = Attendance(
            id=99,
            title="Atendimento Teste 99",
            technician_id=user.id,
            status="em_andamento",
        )
        db.add(attendance)
    else:
        attendance.technician_id = user.id

    db.commit()
    db.close()


def get_sec_token() -> str:
    return create_access_token(data={"sub": "sec_uploader"})


# ==============================================================================
# 1. TESTES DE FORMATOS ACEITOS (MIME ALLOWLIST)
# ==============================================================================

@pytest.mark.parametrize(
    "filename, content, mime_type, expected_mime",
    [
        ("documento.pdf", b"%PDF-1.4\nExemplo de documento oficial", "application/pdf", "application/pdf"),
        ("foto.png", b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR", "image/png", "image/png"),
        ("foto.jpg", b"\xff\xd8\xff\xe0\x00\x10JFIF", "image/jpeg", "image/jpeg"),
        ("foto.jpeg", b"\xff\xd8\xff\xe0\x00\x10JFIF", "image/jpeg", "image/jpeg"),
        ("arquivo.docx", b"PK\x03\x04\x14\x00\x00\x00word/document.xml", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"),
        ("planilha.xlsx", b"PK\x03\x04\x14\x00\x00\x00xl/workbook.xml", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"),
        ("notas.txt", b"Texto simples de anotacao tecnica", "text/plain", "text/plain"),
        ("dados.csv", b"coluna1,coluna2\nvalor1,valor2", "text/csv", "text/csv"),
        ("backup.zip", b"PK\x03\x04\x14\x00\x00\x00conteudo.txt", "application/zip", "application/zip"),
    ],
)
def test_upload_accepted_file_formats(filename, content, mime_type, expected_mime):
    """Garante que todos os formatos previstos na AllowList são aceitos com sucesso."""
    token = get_sec_token()
    headers = {"Authorization": f"Bearer {token}"}
    storage = get_storage()

    res = client.post(
        "/attachments/upload",
        files={"file": (filename, io.BytesIO(content), mime_type)},
        data={"entity_type": "attendance", "entity_id": 99},
        headers=headers,
    )
    assert res.status_code == 201, f"Falha ao enviar {filename}: {res.text}"
    data = res.json()
    assert data["original_filename"] == filename
    assert data["mime_type"] == expected_mime
    assert data["file_size"] == len(content)
    assert storage.exists(data["stored_filename"]) is True

    # Cleanup
    storage.delete(data["stored_filename"])
    db = SessionLocal()
    try:
        att = db.query(Attachment).filter(Attachment.id == data["id"]).first()
        if att:
            db.delete(att)
            db.commit()
    finally:
        db.close()


# ==============================================================================
# 2. TESTES DE FORMATOS E EXTENSÕES REJEITADAS (BLOCKLIST & NÃO SUPORTADOS)
# ==============================================================================

@pytest.mark.parametrize(
    "filename, content, mime_type",
    [
        ("malware.exe", b"MZ\x90\x00\x03\x00\x00\x00", "application/x-msdownload"),
        ("driver.dll", b"MZ\x90\x00\x03\x00\x00\x00", "application/x-msdownload"),
        ("installer.msi", b"\xd0\xcf\x11\xe0", "application/x-msi"),
        ("script.bat", b"@echo off\ndel /f /q C:\\*", "application/x-bat"),
        ("cmd_script.cmd", b"@echo off\ndir", "application/x-bat"),
        ("powershell.ps1", b"Get-Process | Stop-Process", "text/plain"),
        ("shell.sh", b"#!/bin/bash\nrm -rf /", "application/x-sh"),
        ("app.jar", b"PK\x03\x04META-INF/MANIFEST.MF", "application/java-archive"),
        ("android.apk", b"PK\x03\x04AndroidManifest.xml", "application/vnd.android.package-archive"),
        ("arquivo_sem_extensao", b"dados aleatorios", "application/octet-stream"),
        ("arquivo_ponto_final.", b"dados", "text/plain"),
        ("formato_estranho.xyz", b"dados", "application/octet-stream"),
        ("desconhecido.bin", b"\x00\x01\x02", "application/octet-stream"),
    ],
)
def test_upload_rejected_dangerous_and_unsupported_formats(filename, content, mime_type):
    """Garante que formatos perigosos, executáveis e extensões não autorizadas são bloqueados com HTTP 400."""
    token = get_sec_token()
    headers = {"Authorization": f"Bearer {token}"}
    storage = get_storage()

    res = client.post(
        "/attachments/upload",
        files={"file": (filename, io.BytesIO(content), mime_type)},
        data={"entity_type": "attendance", "entity_id": 99},
        headers=headers,
    )
    assert res.status_code == 400
    assert "bloqueado" in res.json()["detail"].lower()

    # Garantir que NENHUM Attachment foi criado no banco
    db = SessionLocal()
    try:
        att = db.query(Attachment).filter(Attachment.original_filename == filename).first()
        assert att is None
    finally:
        db.close()


# ==============================================================================
# 3. TESTES DE INCONSISTÊNCIA MIME E EXECUTÁVEL DISFARÇADO
# ==============================================================================

def test_inconsistent_mime_declared_as_pdf_for_exe():
    """Arquivo .exe declarado como application/pdf deve ser sumariamente rejeitado."""
    token = get_sec_token()
    headers = {"Authorization": f"Bearer {token}"}

    res = client.post(
        "/attachments/upload",
        files={"file": ("virus.exe", io.BytesIO(b"MZ\x00\x00"), "application/pdf")},
        data={"entity_type": "attendance", "entity_id": 99},
        headers=headers,
    )
    assert res.status_code == 400
    assert "perigosa ou executável" in res.json()["detail"]


def test_inconsistent_mime_mismatch_extension():
    """Arquivo .pdf declarado com MIME image/png deve ser rejeitado por inconsistência."""
    token = get_sec_token()
    headers = {"Authorization": f"Bearer {token}"}

    res = client.post(
        "/attachments/upload",
        files={"file": ("relatorio.pdf", io.BytesIO(b"%PDF-1.4\nTeste"), "image/png")},
        data={"entity_type": "attendance", "entity_id": 99},
        headers=headers,
    )
    assert res.status_code == 400
    assert "incompatível com a extensão" in res.json()["detail"]


def test_legitimate_format_with_generic_octet_stream_mime():
    """
    Formatos legítimos (.pdf, .docx, .zip) enviados com MIME genérico application/octet-stream
    devem ser aceitos e normalizados para o MIME canônico.
    """
    token = get_sec_token()
    headers = {"Authorization": f"Bearer {token}"}
    storage = get_storage()

    res = client.post(
        "/attachments/upload",
        files={"file": ("guia.pdf", io.BytesIO(b"%PDF-1.4\nGuia Oficial"), "application/octet-stream")},
        data={"entity_type": "attendance", "entity_id": 99},
        headers=headers,
    )
    assert res.status_code == 201
    data = res.json()
    assert data["mime_type"] == "application/pdf"
    assert storage.exists(data["stored_filename"]) is True

    # Cleanup
    storage.delete(data["stored_filename"])
    db = SessionLocal()
    try:
        att = db.query(Attachment).filter(Attachment.id == data["id"]).first()
        if att:
            db.delete(att)
            db.commit()
    finally:
        db.close()


def test_executable_disguised_with_allowed_extension():
    """Arquivo binário executável (MZ / ELF) disfarçado com extensão .txt ou .pdf deve ser rejeitado."""
    token = get_sec_token()
    headers = {"Authorization": f"Bearer {token}"}

    # Disfarçado como .txt
    res_txt = client.post(
        "/attachments/upload",
        files={"file": ("script.txt", io.BytesIO(b"MZ\x90\x00\x03\x00executavel"), "text/plain")},
        data={"entity_type": "attendance", "entity_id": 99},
        headers=headers,
    )
    assert res_txt.status_code == 400
    assert "assinatura executável detectada" in res_txt.json()["detail"]

    # Disfarçado como .pdf
    res_pdf = client.post(
        "/attachments/upload",
        files={"file": ("fatura.pdf", io.BytesIO(b"\x7fELF\x02\x01\x01LinuxBin"), "application/pdf")},
        data={"entity_type": "attendance", "entity_id": 99},
        headers=headers,
    )
    assert res_pdf.status_code == 400
    assert "assinatura executável detectada" in res_pdf.json()["detail"]


# ==============================================================================
# 4. TESTES DE LIMITE DE TAMANHO (MAX FILE SIZE)
# ==============================================================================

def test_file_size_exceeded_rejection_and_cleanup():
    """Arquivo que excede o limite configurado deve retornar HTTP 413 e NÃO deixar lixo no storage."""
    token = get_sec_token()
    headers = {"Authorization": f"Bearer {token}"}
    storage = get_storage()

    # Simular limite reduzido de 100 bytes via patch em MAX_FILE_SIZE
    with patch("app.routers.attachments.MAX_FILE_SIZE", 100):
        oversized_content = b"A" * 150
        res = client.post(
            "/attachments/upload",
            files={"file": ("grande.txt", io.BytesIO(oversized_content), "text/plain")},
            data={"entity_type": "attendance", "entity_id": 99},
            headers=headers,
        )
        assert res.status_code == 413
        assert "exceeds maximum allowed limit" in res.json()["detail"]

    # Verificar que nenhum arquivo foi criado no banco
    db = SessionLocal()
    try:
        att = db.query(Attachment).filter(Attachment.original_filename == "grande.txt").first()
        assert att is None
    finally:
        db.close()


# ==============================================================================
# 5. TESTES DE SEGURANÇA E PATH TRAVERSAL NO NOME DO ARQUIVO
# ==============================================================================

@pytest.mark.parametrize(
    "traversal_name, expected_base",
    [
        ("../../relatorio_seguro.pdf", "relatorio_seguro.pdf"),
        ("..\\..\\relatorio_seguro.pdf", "relatorio_seguro.pdf"),
        ("../../../relatorio_seguro.pdf", "relatorio_seguro.pdf"),
        ("/etc/passwd.pdf", "passwd.pdf"),
        ("C:\\Windows\\System32\\relatorio_seguro.pdf", "relatorio_seguro.pdf"),
    ],
)
def test_path_traversal_in_filename_is_sanitized(traversal_name, expected_base):
    """
    Caracteres de path traversal em original_filename devem ser completamente limpos,
    e o arquivo físico deve ser gravado exclusivamente com UUID no diretório de uploads.
    """
    token = get_sec_token()
    headers = {"Authorization": f"Bearer {token}"}
    storage = get_storage()

    pdf_content = b"%PDF-1.4\nTeste de Traversal"
    res = client.post(
        "/attachments/upload",
        files={"file": (traversal_name, io.BytesIO(pdf_content), "application/pdf")},
        data={"entity_type": "attendance", "entity_id": 99},
        headers=headers,
    )
    assert res.status_code == 201
    data = res.json()
    assert data["original_filename"] == expected_base
    assert "/" not in data["original_filename"]
    assert "\\" not in data["original_filename"]
    assert ".." not in data["original_filename"]

    # O nome armazenado é UUID + extensão limpa
    assert data["stored_filename"].endswith(".pdf")
    assert storage.exists(data["stored_filename"]) is True

    # Cleanup
    storage.delete(data["stored_filename"])
    db = SessionLocal()
    try:
        att = db.query(Attachment).filter(Attachment.id == data["id"]).first()
        if att:
            db.delete(att)
            db.commit()
    finally:
        db.close()
