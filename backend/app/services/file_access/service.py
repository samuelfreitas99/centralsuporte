from dataclasses import dataclass
from typing import Any, Optional
from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models import Attachment, User
from app.services.file_access.registry import AttachmentAccessRegistry
from app.services.file_access.validators import (
    AttendanceAttachmentValidator,
    EquipmentAttachmentValidator,
    KnowledgeAttachmentValidator,
    MaintenanceAttachmentValidator,
    ProjectAttachmentValidator,
    TaskAttachmentValidator,
)


@dataclass
class AccessDecision:
    """Represents the authorization decision with structured status code and reason."""
    allowed: bool
    status_code: int = status.HTTP_200_OK
    reason: Optional[str] = None
    entity: Optional[Any] = None


class FileAccessService:
    """
    Central authorization service for attachment operations.
    Enforces a strict two-tier authorization model:
    1. Global RBAC Permission (attachment:read, attachment:upload, attachment:delete).
    2. Contextual Entity Authorization via registered domain validators.
    """

    def __init__(self, registry: Optional[AttachmentAccessRegistry] = None) -> None:
        self.registry = registry or create_default_registry()

    def check_read_access(
        self,
        db: Session,
        user: Optional[User],
        entity_type: str,
        entity_id: int,
    ) -> AccessDecision:
        """Evaluates whether the user can read/list/download attachments for the given entity."""
        user_check = self._validate_user(user)
        if not user_check.allowed:
            return user_check

        if not user.has_permission("attachment:read"):
            return AccessDecision(
                allowed=False,
                status_code=status.HTTP_403_FORBIDDEN,
                reason="Acesso negado: permissão global 'attachment:read' necessária.",
            )

        validator = self.registry.get(entity_type)
        if not validator:
            return AccessDecision(
                allowed=False,
                status_code=status.HTTP_400_BAD_REQUEST,
                reason=f"Tipo de entidade '{entity_type}' não suportado para anexos.",
            )

        entity = validator.get_entity(db, entity_id)
        if not entity:
            return AccessDecision(
                allowed=False,
                status_code=status.HTTP_404_NOT_FOUND,
                reason=f"Entidade '{entity_type}' com ID {entity_id} não encontrada.",
            )

        try:
            can_read = validator.can_read(db, user, entity)
        except Exception as e:
            return AccessDecision(
                allowed=False,
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                reason=f"Erro interno ao validar acesso contextual de leitura: {str(e)}",
            )

        if not can_read:
            return AccessDecision(
                allowed=False,
                status_code=status.HTTP_403_FORBIDDEN,
                reason="Acesso contextual negado para esta entidade.",
            )

        return AccessDecision(allowed=True, entity=entity)

    def check_upload_access(
        self,
        db: Session,
        user: Optional[User],
        entity_type: str,
        entity_id: int,
    ) -> AccessDecision:
        """Evaluates whether the user can upload and attach files to the given entity."""
        user_check = self._validate_user(user)
        if not user_check.allowed:
            return user_check

        if not user.has_permission("attachment:upload"):
            return AccessDecision(
                allowed=False,
                status_code=status.HTTP_403_FORBIDDEN,
                reason="Acesso negado: permissão global 'attachment:upload' necessária.",
            )

        validator = self.registry.get(entity_type)
        if not validator:
            return AccessDecision(
                allowed=False,
                status_code=status.HTTP_400_BAD_REQUEST,
                reason=f"Tipo de entidade '{entity_type}' não suportado para anexos.",
            )

        entity = validator.get_entity(db, entity_id)
        if not entity:
            return AccessDecision(
                allowed=False,
                status_code=status.HTTP_404_NOT_FOUND,
                reason=f"Entidade '{entity_type}' com ID {entity_id} não encontrada.",
            )

        try:
            can_upload = validator.can_upload(db, user, entity)
        except Exception as e:
            return AccessDecision(
                allowed=False,
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                reason=f"Erro interno ao validar permissão contextual de upload: {str(e)}",
            )

        if not can_upload:
            return AccessDecision(
                allowed=False,
                status_code=status.HTTP_403_FORBIDDEN,
                reason="Permissão contextual insuficiente para anexar arquivos nesta entidade.",
            )

        return AccessDecision(allowed=True, entity=entity)

    def check_delete_access(
        self,
        db: Session,
        user: Optional[User],
        entity_type: str,
        entity_id: int,
        attachment: Optional[Attachment] = None,
    ) -> AccessDecision:
        """Evaluates whether the user can delete an attachment from the given entity."""
        user_check = self._validate_user(user)
        if not user_check.allowed:
            return user_check

        if not user.has_permission("attachment:delete"):
            return AccessDecision(
                allowed=False,
                status_code=status.HTTP_403_FORBIDDEN,
                reason="Acesso negado: permissão global 'attachment:delete' necessária.",
            )

        validator = self.registry.get(entity_type)
        if not validator:
            return AccessDecision(
                allowed=False,
                status_code=status.HTTP_400_BAD_REQUEST,
                reason=f"Tipo de entidade '{entity_type}' não suportado para anexos.",
            )

        entity = validator.get_entity(db, entity_id)
        if not entity:
            return AccessDecision(
                allowed=False,
                status_code=status.HTTP_404_NOT_FOUND,
                reason=f"Entidade '{entity_type}' com ID {entity_id} não encontrada.",
            )

        try:
            can_delete = validator.can_delete(db, user, entity, attachment)
        except Exception as e:
            return AccessDecision(
                allowed=False,
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                reason=f"Erro interno ao validar permissão contextual de exclusão: {str(e)}",
            )

        if not can_delete:
            return AccessDecision(
                allowed=False,
                status_code=status.HTTP_403_FORBIDDEN,
                reason="Permissão contextual insuficiente para excluir anexo desta entidade.",
            )

        return AccessDecision(allowed=True, entity=entity)

    def check_attachment_read_access(
        self,
        db: Session,
        user: Optional[User],
        attachment: Attachment,
    ) -> AccessDecision:
        """Helper to check read access directly from an Attachment model instance."""
        return self.check_read_access(db, user, attachment.entity_type, attachment.entity_id)

    def check_attachment_delete_access(
        self,
        db: Session,
        user: Optional[User],
        attachment: Attachment,
    ) -> AccessDecision:
        """Helper to check delete access directly from an Attachment model instance."""
        return self.check_delete_access(
            db=db,
            user=user,
            entity_type=attachment.entity_type,
            entity_id=attachment.entity_id,
            attachment=attachment,
        )

    def can_read(self, db: Session, user: Optional[User], entity_type: str, entity_id: int) -> bool:
        """Returns True if the user is authorized to read attachments for the entity."""
        return self.check_read_access(db, user, entity_type, entity_id).allowed

    def can_upload(self, db: Session, user: Optional[User], entity_type: str, entity_id: int) -> bool:
        """Returns True if the user is authorized to upload attachments for the entity."""
        return self.check_upload_access(db, user, entity_type, entity_id).allowed

    def can_delete(
        self,
        db: Session,
        user: Optional[User],
        entity_type: str,
        entity_id: int,
        attachment: Optional[Attachment] = None,
    ) -> bool:
        """Returns True if the user is authorized to delete the attachment from the entity."""
        return self.check_delete_access(db, user, entity_type, entity_id, attachment).allowed

    def ensure_read_access(self, db: Session, user: Optional[User], entity_type: str, entity_id: int) -> Any:
        """Enforces read access, raising HTTPException on denial. Returns the parent entity."""
        decision = self.check_read_access(db, user, entity_type, entity_id)
        if not decision.allowed:
            raise HTTPException(status_code=decision.status_code, detail=decision.reason)
        return decision.entity

    def ensure_upload_access(self, db: Session, user: Optional[User], entity_type: str, entity_id: int) -> Any:
        """Enforces upload access, raising HTTPException on denial. Returns the parent entity."""
        decision = self.check_upload_access(db, user, entity_type, entity_id)
        if not decision.allowed:
            raise HTTPException(status_code=decision.status_code, detail=decision.reason)
        return decision.entity

    def ensure_delete_access(
        self,
        db: Session,
        user: Optional[User],
        entity_type: str,
        entity_id: int,
        attachment: Optional[Attachment] = None,
    ) -> Any:
        """Enforces delete access, raising HTTPException on denial. Returns the parent entity."""
        decision = self.check_delete_access(db, user, entity_type, entity_id, attachment)
        if not decision.allowed:
            raise HTTPException(status_code=decision.status_code, detail=decision.reason)
        return decision.entity

    def _validate_user(self, user: Optional[User]) -> AccessDecision:
        if not user:
            return AccessDecision(
                allowed=False,
                status_code=status.HTTP_401_UNAUTHORIZED,
                reason="Usuário não autenticado.",
            )
        if not user.is_active:
            return AccessDecision(
                allowed=False,
                status_code=status.HTTP_403_FORBIDDEN,
                reason="Usuário inativo.",
            )
        return AccessDecision(allowed=True)


def create_default_registry() -> AttachmentAccessRegistry:
    """Instantiates the default registry populated with all standard domain validators."""
    registry = AttachmentAccessRegistry()
    registry.register(ProjectAttachmentValidator())
    registry.register(TaskAttachmentValidator())
    registry.register(MaintenanceAttachmentValidator())
    registry.register(AttendanceAttachmentValidator())
    registry.register(EquipmentAttachmentValidator())
    registry.register(KnowledgeAttachmentValidator())
    return registry


_file_access_service_instance: Optional[FileAccessService] = None


def get_file_access_service() -> FileAccessService:
    """FastAPI dependency provider for FileAccessService."""
    global _file_access_service_instance
    if _file_access_service_instance is None:
        _file_access_service_instance = FileAccessService()
    return _file_access_service_instance


def set_file_access_service(service: Optional[FileAccessService]) -> None:
    """Allows injecting or resetting the FileAccessService singleton for testing."""
    global _file_access_service_instance
    _file_access_service_instance = service
