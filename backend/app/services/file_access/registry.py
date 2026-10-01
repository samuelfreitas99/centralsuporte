from abc import ABC, abstractmethod
from typing import Any, Dict, List, Optional
from sqlalchemy.orm import Session

from app.models import Attachment, User


class AttachmentAccessValidator(ABC):
    """
    Abstract contract for entity-specific attachment authorization.
    Each domain entity (project, task, maintenance, etc.) implements this contract
    to encapsulate its contextual visibility and modification rules.
    """

    @property
    @abstractmethod
    def entity_type(self) -> str:
        """Name of the supported entity_type (e.g. 'project', 'task')."""
        pass

    @abstractmethod
    def get_entity(self, db: Session, entity_id: int) -> Optional[Any]:
        """Loads and returns the entity instance from the database, or None if not found."""
        pass

    @abstractmethod
    def can_read(self, db: Session, user: User, entity: Any) -> bool:
        """Determines if the user has contextual permission to view/list/download attachments for this entity."""
        pass

    @abstractmethod
    def can_upload(self, db: Session, user: User, entity: Any) -> bool:
        """Determines if the user has contextual permission to upload/attach files to this entity."""
        pass

    @abstractmethod
    def can_delete(self, db: Session, user: User, entity: Any, attachment: Optional[Attachment] = None) -> bool:
        """Determines if the user has contextual permission to delete an attachment from this entity."""
        pass


class AttachmentAccessRegistry:
    """
    Registry that maintains validators for each entity_type.
    Prevents silent duplicate registrations and enforces default-deny for unknown entity types.
    """

    def __init__(self) -> None:
        self._validators: Dict[str, AttachmentAccessValidator] = {}

    def register(self, validator: AttachmentAccessValidator) -> None:
        """
        Registers an entity validator.
        Raises ValueError if entity_type is empty or already registered.
        """
        entity_type = validator.entity_type
        if not entity_type or not entity_type.strip():
            raise ValueError("Validator must define a non-empty entity_type.")
        if entity_type in self._validators:
            raise ValueError(f"Validator for entity_type '{entity_type}' is already registered.")
        self._validators[entity_type] = validator

    def get(self, entity_type: str) -> Optional[AttachmentAccessValidator]:
        """Returns the validator for entity_type, or None if not registered."""
        return self._validators.get(entity_type)

    def is_supported(self, entity_type: str) -> bool:
        """Checks if the entity_type has a registered validator."""
        return entity_type in self._validators

    def supported_types(self) -> List[str]:
        """Returns a list of all registered entity types."""
        return list(self._validators.keys())

    def clear(self) -> None:
        """Clears all registered validators (primarily for isolated test teardowns)."""
        self._validators.clear()
