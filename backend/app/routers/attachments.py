import os
import uuid
import hashlib
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form, Query
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Attachment, User
from app.schemas import AttachmentResponse
from app.auth import get_current_active_user, require_permission

router = APIRouter(prefix="/attachments", tags=["attachments"])

UPLOAD_DIR = os.environ.get("UPLOAD_DIR", "/app/uploads")
MAX_FILE_SIZE = 25 * 1024 * 1024  # 25 MB

os.makedirs(UPLOAD_DIR, exist_ok=True)


def get_safe_filename(filename: str) -> str:
    """Sanitize original filename to avoid directory traversal or bad characters."""
    base = os.path.basename(filename)
    clean = "".join(c for c in base if c.isalnum() or c in (".", "-", "_")).strip()
    return clean or "unnamed_file"


@router.post("/upload", response_model=AttachmentResponse, status_code=status.HTTP_201_CREATED)
async def upload_attachment(
    file: UploadFile = File(...),
    entity_type: str = Form(...),
    entity_id: int = Form(...),
    description: Optional[str] = Form(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("attachment:upload"))
):
    """
    Upload a file and attach it to an entity (attendance, knowledge, maintenance, equipment, task).
    """
    original_name = file.filename or "file"
    safe_name = get_safe_filename(original_name)
    stored_name = f"{uuid.uuid4().hex}_{safe_name}"
    file_path = os.path.join(UPLOAD_DIR, stored_name)

    # Validate path containment
    real_target_dir = os.path.realpath(UPLOAD_DIR)
    real_file_path = os.path.realpath(file_path)
    if not real_file_path.startswith(real_target_dir):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Caminho de arquivo inválido."
        )

    # Stream file to disk while calculating sha256 and checking file size
    sha256 = hashlib.sha256()
    total_bytes = 0

    try:
        with open(file_path, "wb") as f:
            while chunk := await file.read(64 * 1024):  # 64KB chunks
                total_bytes += len(chunk)
                if total_bytes > MAX_FILE_SIZE:
                    raise HTTPException(
                        status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                        detail=f"Arquivo excede o limite máximo permitido de {MAX_FILE_SIZE // (1024 * 1024)}MB."
                    )
                sha256.update(chunk)
                f.write(chunk)
    except HTTPException:
        if os.path.exists(file_path):
            os.remove(file_path)
        raise
    except Exception as e:
        if os.path.exists(file_path):
            os.remove(file_path)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erro ao salvar arquivo físico: {str(e)}"
        )

    mime_type = file.content_type or "application/octet-stream"

    attachment = Attachment(
        original_filename=original_name,
        stored_filename=stored_name,
        file_path=file_path,
        file_size=total_bytes,
        mime_type=mime_type,
        file_hash=sha256.hexdigest(),
        entity_type=entity_type,
        entity_id=entity_id,
        description=description,
        uploader_id=current_user.id
    )

    db.add(attachment)
    db.commit()
    db.refresh(attachment)

    return attachment


@router.get("", response_model=List[AttachmentResponse])
def list_attachments(
    entity_type: Optional[str] = Query(None),
    entity_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("attachment:read"))
):
    """
    List attachments filtered by entity_type and entity_id.
    """
    query = db.query(Attachment)
    if entity_type:
        query = query.filter(Attachment.entity_type == entity_type)
    if entity_id is not None:
        query = query.filter(Attachment.entity_id == entity_id)

    return query.order_by(Attachment.created_at.desc()).all()


@router.get("/{attachment_id}", response_model=AttachmentResponse)
def get_attachment_metadata(
    attachment_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("attachment:read"))
):
    """
    Retrieve metadata for a specific attachment.
    """
    attachment = db.query(Attachment).filter(Attachment.id == attachment_id).first()
    if not attachment:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Anexo não encontrado.")
    return attachment


@router.get("/{attachment_id}/download")
def download_attachment(
    attachment_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("attachment:read"))
):
    """
    Download attachment file as attachment.
    """
    attachment = db.query(Attachment).filter(Attachment.id == attachment_id).first()
    if not attachment:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Anexo não encontrado.")

    if not os.path.exists(attachment.file_path):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Arquivo físico não encontrado no servidor.")

    return FileResponse(
        path=attachment.file_path,
        filename=attachment.original_filename,
        media_type=attachment.mime_type,
        content_disposition_type="attachment"
    )


@router.get("/{attachment_id}/preview")
def preview_attachment(
    attachment_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("attachment:read"))
):
    """
    Preview attachment inline (suitable for images and PDFs).
    """
    attachment = db.query(Attachment).filter(Attachment.id == attachment_id).first()
    if not attachment:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Anexo não encontrado.")

    if not os.path.exists(attachment.file_path):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Arquivo físico não encontrado no servidor.")

    return FileResponse(
        path=attachment.file_path,
        filename=attachment.original_filename,
        media_type=attachment.mime_type,
        content_disposition_type="inline"
    )


@router.delete("/{attachment_id}")
def delete_attachment(
    attachment_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("attachment:delete"))
):
    """
    Delete attachment metadata from database and remove file from disk.
    """
    attachment = db.query(Attachment).filter(Attachment.id == attachment_id).first()
    if not attachment:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Anexo não encontrado.")

    if os.path.exists(attachment.file_path):
        try:
            os.remove(attachment.file_path)
        except OSError:
            pass

    db.delete(attachment)
    db.commit()

    return {"detail": "Anexo excluído com sucesso."}
