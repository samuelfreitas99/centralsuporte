from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form, Query
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Attachment, User
from app.schemas import AttachmentResponse
from app.auth import require_permission
from app.services.storage import StorageAdapter, get_storage

router = APIRouter(prefix="/attachments", tags=["attachments"])

MAX_FILE_SIZE = 25 * 1024 * 1024  # 25 MB


@router.post("/upload", response_model=AttachmentResponse, status_code=status.HTTP_201_CREATED)
async def upload_attachment(
    file: UploadFile = File(...),
    entity_type: str = Form(...),
    entity_id: int = Form(...),
    description: Optional[str] = Form(None),
    db: Session = Depends(get_db),
    storage: StorageAdapter = Depends(get_storage),
    current_user: User = Depends(require_permission("attachment:upload"))
):
    """
    Upload a file and attach it to an entity (attendance, knowledge, maintenance, equipment, task, project).
    Storage operations are handled by the StorageAdapter.
    """
    original_name = file.filename or "file"

    try:
        stored_file = storage.save(
            file_obj=file.file,
            original_filename=original_name,
            mime_type=file.content_type,
            max_file_size=MAX_FILE_SIZE,
        )
    except ValueError as ve:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=str(ve),
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erro ao salvar arquivo físico no storage: {str(e)}",
        )

    attachment = Attachment(
        original_filename=original_name,
        stored_filename=stored_file.stored_filename,
        file_size=stored_file.file_size,
        mime_type=stored_file.mime_type or "application/octet-stream",
        file_hash=stored_file.file_hash,
        entity_type=entity_type,
        entity_id=entity_id,
        description=description,
        uploader_id=current_user.id,
    )

    try:
        db.add(attachment)
        db.commit()
        db.refresh(attachment)
    except Exception as exc:
        db.rollback()
        # Clean up stored file if DB commit fails to maintain consistency
        storage.delete(stored_file.stored_filename)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erro ao persistir anexo no banco de dados: {str(exc)}",
        )

    return attachment


@router.get("", response_model=List[AttachmentResponse])
def list_attachments(
    entity_type: Optional[str] = Query(None),
    entity_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("attachment:read"))
):
    """
    List active attachments filtered by entity_type and entity_id (soft-deleted are excluded).
    """
    query = db.query(Attachment).filter(Attachment.deleted_at.is_(None))
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
    Retrieve metadata for a specific active attachment.
    """
    attachment = db.query(Attachment).filter(
        Attachment.id == attachment_id,
        Attachment.deleted_at.is_(None),
    ).first()
    if not attachment:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Anexo não encontrado.")
    return attachment


@router.get("/{attachment_id}/download")
def download_attachment(
    attachment_id: int,
    db: Session = Depends(get_db),
    storage: StorageAdapter = Depends(get_storage),
    current_user: User = Depends(require_permission("attachment:read"))
):
    """
    Download attachment file as attachment.
    """
    attachment = db.query(Attachment).filter(
        Attachment.id == attachment_id,
        Attachment.deleted_at.is_(None),
    ).first()
    if not attachment:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Anexo não encontrado.")

    if not storage.exists(attachment.stored_filename):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Arquivo físico não encontrado no servidor.")

    physical_path = storage.get_path(attachment.stored_filename)

    return FileResponse(
        path=physical_path,
        filename=attachment.original_filename,
        media_type=attachment.mime_type,
        content_disposition_type="attachment",
    )


@router.get("/{attachment_id}/preview")
def preview_attachment(
    attachment_id: int,
    db: Session = Depends(get_db),
    storage: StorageAdapter = Depends(get_storage),
    current_user: User = Depends(require_permission("attachment:read"))
):
    """
    Preview attachment inline (suitable for images and PDFs).
    """
    attachment = db.query(Attachment).filter(
        Attachment.id == attachment_id,
        Attachment.deleted_at.is_(None),
    ).first()
    if not attachment:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Anexo não encontrado.")

    if not storage.exists(attachment.stored_filename):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Arquivo físico não encontrado no servidor.")

    physical_path = storage.get_path(attachment.stored_filename)

    return FileResponse(
        path=physical_path,
        filename=attachment.original_filename,
        media_type=attachment.mime_type,
        content_disposition_type="inline",
    )


@router.delete("/{attachment_id}")
def delete_attachment(
    attachment_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("attachment:delete"))
):
    """
    Soft delete attachment metadata (sets deleted_at).
    The physical file is kept in storage for subsequent asynchronous garbage collection.
    """
    attachment = db.query(Attachment).filter(
        Attachment.id == attachment_id,
        Attachment.deleted_at.is_(None),
    ).first()
    if not attachment:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Anexo não encontrado.")

    attachment.deleted_at = datetime.now(timezone.utc)
    db.commit()

    return {"detail": "Anexo excluído com sucesso."}
