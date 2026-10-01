from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form, Query
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Attachment, User
from app.schemas import AttachmentResponse
from app.auth import get_current_active_user, require_permission
from app.services.storage import StorageAdapter, get_storage
from app.services.file_access import FileAccessService, get_file_access_service

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
    file_access_service: FileAccessService = Depends(get_file_access_service),
    current_user: User = Depends(get_current_active_user),
):
    """
    Upload a file and attach it to an entity.
    Enforces contextual authorization before persisting to storage.
    """
    # 1. Contextual and global authorization BEFORE touching storage
    file_access_service.ensure_upload_access(db, current_user, entity_type, entity_id)

    # 2. Save physical file to storage
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

    # 3. Create Attachment record
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

    # 4. Commit to database with cleanup of newly saved physical file on failure
    try:
        db.add(attachment)
        db.commit()
        db.refresh(attachment)
    except Exception as exc:
        db.rollback()
        # Clean up newly created physical file to prevent orphan files
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
    current_user: User = Depends(require_permission("attachment:read")),
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
    current_user: User = Depends(require_permission("attachment:read")),
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
    current_user: User = Depends(require_permission("attachment:read")),
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
    current_user: User = Depends(require_permission("attachment:read")),
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
    file_access_service: FileAccessService = Depends(get_file_access_service),
    current_user: User = Depends(get_current_active_user),
):
    """
    Soft delete attachment metadata (sets deleted_at).
    Enforces contextual authorization before soft deletion.
    The physical file is kept in storage for subsequent asynchronous garbage collection.
    """
    # 1. Load attachment
    attachment = db.query(Attachment).filter(Attachment.id == attachment_id).first()
    if not attachment or attachment.deleted_at is not None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Anexo não encontrado.")

    # 2. Contextual authorization check
    file_access_service.ensure_delete_access(
        db=db,
        user=current_user,
        entity_type=attachment.entity_type,
        entity_id=attachment.entity_id,
        attachment=attachment,
    )

    # 3. Soft delete (mark deleted_at, do NOT delete physical file)
    attachment.deleted_at = datetime.now(timezone.utc)
    db.commit()

    return {"detail": "Anexo excluído com sucesso."}
