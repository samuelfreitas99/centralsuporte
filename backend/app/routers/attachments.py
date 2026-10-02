from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form, Query, Request
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Attachment, User
from app.schemas import AttachmentResponse
from app.auth import get_current_active_user, require_permission
from app.services.storage import StorageAdapter, get_storage
from app.services.file_access import FileAccessService, get_file_access_service
from app.services.audit import record_audit_log
from app.services.attachment_security import (
    MAX_FILE_SIZE,
    validate_upload_metadata,
    validate_file_content,
)

router = APIRouter(prefix="/attachments", tags=["attachments"])


@router.post("/upload", response_model=AttachmentResponse, status_code=status.HTTP_201_CREATED)
async def upload_attachment(
    request: Request,
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
    Enforces contextual authorization, MIME allowlist, and file content hardening before persisting.
    """
    # 1. Contextual and global authorization BEFORE touching storage
    file_access_service.ensure_upload_access(db, current_user, entity_type, entity_id)

    # 2. Validate filename, extension, and declared MIME against allowlist BEFORE touching storage
    raw_name = file.filename or ""
    try:
        clean_name, ext, resolved_mime = validate_upload_metadata(
            original_filename=raw_name,
            declared_mime=file.content_type,
        )
    except ValueError as ve:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(ve),
        )

    # 3. Inspect content / magic bytes
    try:
        validate_file_content(file.file, ext)
    except ValueError as ve:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(ve),
        )

    # 4. Save physical file to storage (streams and enforces max_file_size)
    try:
        stored_file = storage.save(
            file_obj=file.file,
            original_filename=clean_name,
            mime_type=resolved_mime,
            max_file_size=MAX_FILE_SIZE,
        )
    except ValueError as ve:
        err_msg = str(ve)
        if "exceeds maximum allowed limit" in err_msg.lower() or "limite" in err_msg.lower():
            raise HTTPException(
                status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                detail=err_msg,
            )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=err_msg,
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erro ao salvar arquivo físico no storage: {str(e)}",
        )

    # 5. Create Attachment record
    attachment = Attachment(
        original_filename=clean_name,
        stored_filename=stored_file.stored_filename,
        file_size=stored_file.file_size,
        mime_type=stored_file.mime_type or "application/octet-stream",
        file_hash=stored_file.file_hash,
        entity_type=entity_type,
        entity_id=entity_id,
        description=description,
        uploader_id=current_user.id,
    )

    # 6. Commit to database and record AuditLog atomically with cleanup of newly saved physical file on failure
    try:
        db.add(attachment)
        db.flush()

        client_ip = request.client.host if (request and request.client) else None
        user_agent = request.headers.get("user-agent") if request else None

        record_audit_log(
            db=db,
            action="attachment.uploaded",
            entity_type="attachment",
            entity_id=attachment.id,
            user=current_user,
            ip_address=client_ip,
            user_agent=user_agent,
            details={
                "event": "attachment.uploaded",
                "original_filename": attachment.original_filename,
                "mime_type": attachment.mime_type,
                "file_size": attachment.file_size,
                "parent_entity_type": attachment.entity_type,
                "parent_entity_id": attachment.entity_id,
            },
        )

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
    search: Optional[str] = Query(None),
    mime_category: Optional[str] = Query(None),
    uploader_id: Optional[int] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
    file_access_service: FileAccessService = Depends(get_file_access_service),
    current_user: User = Depends(get_current_active_user),
):
    """
    List active attachments filtered by entity_type and entity_id (soft-deleted are excluded).
    Enforces contextual authorization: only attachments from entities the user can access are returned.
    """
    if not current_user.has_permission("attachment:read"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Acesso negado: permissão global 'attachment:read' necessária.",
        )

    # 1. When both entity_type and entity_id are provided, validate access explicitly
    if entity_type and entity_id is not None:
        file_access_service.ensure_read_access(db, current_user, entity_type, entity_id)

    # 2. When only entity_type is provided, validate that entity_type is registered
    if entity_type and not file_access_service.registry.get(entity_type):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Tipo de entidade '{entity_type}' não suportado para anexos.",
        )

    # 3. Query active attachments matching filters
    query = db.query(Attachment).filter(Attachment.deleted_at.is_(None))
    if entity_type:
        query = query.filter(Attachment.entity_type == entity_type)
    if entity_id is not None:
        query = query.filter(Attachment.entity_id == entity_id)
    if uploader_id is not None:
        query = query.filter(Attachment.uploader_id == uploader_id)
    if search:
        search_term = f"%{search}%"
        query = query.filter(
            (Attachment.original_filename.ilike(search_term)) |
            (Attachment.description.ilike(search_term))
        )
    if mime_category:
        query = query.filter(Attachment.mime_type.ilike(f"{mime_category}/%"))

    # For efficient global search without refactoring the whole auth layer, 
    # we fetch candidates and apply contextual filter in Python, then slice.
    candidates = query.order_by(Attachment.created_at.desc()).all()

    # If already validated for a specific entity, return directly with pagination
    if entity_type and entity_id is not None:
        return candidates[skip : skip + limit]

    # 4. Contextually filter candidates for entities the user can access
    allowed = []
    decision_cache = {}
    for att in candidates:
        key = (att.entity_type, att.entity_id)
        if key not in decision_cache:
            decision_cache[key] = file_access_service.can_read(db, current_user, att.entity_type, att.entity_id)
        if decision_cache[key]:
            allowed.append(att)
            
    # Apply pagination AFTER contextual filtering
    return allowed[skip : skip + limit]


@router.get("/{attachment_id}", response_model=AttachmentResponse)
def get_attachment_metadata(
    attachment_id: int,
    db: Session = Depends(get_db),
    file_access_service: FileAccessService = Depends(get_file_access_service),
    current_user: User = Depends(get_current_active_user),
):
    """
    Retrieve metadata for a specific active attachment.
    Enforces contextual authorization before returning metadata.
    """
    attachment = db.query(Attachment).filter(Attachment.id == attachment_id).first()
    if not attachment or attachment.deleted_at is not None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Anexo não encontrado.")

    file_access_service.ensure_attachment_read_access(
        db=db,
        user=current_user,
        attachment=attachment,
    )

    return attachment


@router.get("/{attachment_id}/download")
def download_attachment(
    attachment_id: int,
    db: Session = Depends(get_db),
    storage: StorageAdapter = Depends(get_storage),
    file_access_service: FileAccessService = Depends(get_file_access_service),
    current_user: User = Depends(get_current_active_user),
):
    """
    Download attachment file as attachment.
    Enforces contextual authorization BEFORE accessing the storage.
    """
    # 1. Locate attachment & reject nonexistent or soft-deleted
    attachment = db.query(Attachment).filter(Attachment.id == attachment_id).first()
    if not attachment or attachment.deleted_at is not None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Anexo não encontrado.")

    # 2. Contextual authorization check BEFORE touching storage
    file_access_service.ensure_attachment_read_access(
        db=db,
        user=current_user,
        attachment=attachment,
    )

    # 3. Verify physical file exists in storage
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
    file_access_service: FileAccessService = Depends(get_file_access_service),
    current_user: User = Depends(get_current_active_user),
):
    """
    Preview attachment inline (suitable for images, text and PDFs).
    Enforces contextual authorization BEFORE accessing the storage.
    """
    # 1. Locate attachment & reject nonexistent or soft-deleted
    attachment = db.query(Attachment).filter(Attachment.id == attachment_id).first()
    if not attachment or attachment.deleted_at is not None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Anexo não encontrado.")

    # 2. Contextual authorization check BEFORE touching storage
    file_access_service.ensure_attachment_read_access(
        db=db,
        user=current_user,
        attachment=attachment,
    )

    # 3. Verify physical file exists in storage
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
    request: Request,
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

    client_ip = request.client.host if (request and request.client) else None
    user_agent = request.headers.get("user-agent") if request else None

    record_audit_log(
        db=db,
        action="attachment.deleted",
        entity_type="attachment",
        entity_id=attachment.id,
        user=current_user,
        ip_address=client_ip,
        user_agent=user_agent,
        details={
            "event": "attachment.deleted",
            "original_filename": attachment.original_filename,
            "parent_entity_type": attachment.entity_type,
            "parent_entity_id": attachment.entity_id,
        },
    )

    db.commit()

    return {"detail": "Anexo excluído com sucesso."}
