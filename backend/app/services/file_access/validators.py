from typing import Any, Optional
from sqlalchemy.orm import Session

from app.models import (
    Attachment,
    Attendance,
    Equipment,
    KnowledgeArticle,
    MaintenanceRecord,
    Project,
    Task,
    User,
    Department,
)
from app.services.file_access.registry import AttachmentAccessValidator


def is_admin(user: User) -> bool:
    return user.has_role("Administrador")


class ProjectAttachmentValidator(AttachmentAccessValidator):
    @property
    def entity_type(self) -> str:
        return "project"

    def get_entity(self, db: Session, entity_id: int) -> Optional[Project]:
        return db.query(Project).filter(Project.id == entity_id).first()

    def can_read(self, db: Session, user: User, entity: Project) -> bool:
        if is_admin(user):
            return True
        return user.has_permission("project:read")

    def can_upload(self, db: Session, user: User, entity: Project) -> bool:
        if is_admin(user):
            return True
        if not user.has_permission("project:update"):
            return False
        # Do not allow uploading to cancelled projects
        if entity.status == "cancelado":
            return False
        return True

    def can_delete(self, db: Session, user: User, entity: Project, attachment: Optional[Attachment] = None) -> bool:
        if is_admin(user) or user.has_permission("project:delete"):
            return True
        # If user has update access and is the uploader or project owner
        if user.has_permission("project:update"):
            if attachment and attachment.uploader_id == user.id:
                return True
            if entity.owner_id == user.id:
                return True
        return False


class TaskAttachmentValidator(AttachmentAccessValidator):
    @property
    def entity_type(self) -> str:
        return "task"

    def get_entity(self, db: Session, entity_id: int) -> Optional[Task]:
        return db.query(Task).filter(Task.id == entity_id).first()

    def can_read(self, db: Session, user: User, entity: Task) -> bool:
        if is_admin(user):
            return True
        if not user.has_permission("tasks:read"):
            return False
        # Contextual task visibility rules from tasks router
        if entity.visibility in ("equipe", "todos"):
            return True
        if entity.creator_id == user.id:
            return True
        if any(u.id == user.id for u in entity.assigned_users):
            return True
        return False

    def can_upload(self, db: Session, user: User, entity: Task) -> bool:
        if is_admin(user):
            return True
        if not user.has_permission("tasks:write"):
            return False
        # Only task creator or assigned users can modify / attach
        if entity.creator_id == user.id:
            return True
        if any(u.id == user.id for u in entity.assigned_users):
            return True
        return False

    def can_delete(self, db: Session, user: User, entity: Task, attachment: Optional[Attachment] = None) -> bool:
        if is_admin(user):
            return True
        if not user.has_permission("tasks:write"):
            return False
        if entity.creator_id == user.id:
            return True
        if attachment and attachment.uploader_id == user.id:
            return True
        return False


class MaintenanceAttachmentValidator(AttachmentAccessValidator):
    @property
    def entity_type(self) -> str:
        return "maintenance"

    def get_entity(self, db: Session, entity_id: int) -> Optional[MaintenanceRecord]:
        return db.query(MaintenanceRecord).filter(MaintenanceRecord.id == entity_id).first()

    def can_read(self, db: Session, user: User, entity: MaintenanceRecord) -> bool:
        if is_admin(user):
            return True
        return user.has_permission("maintenance:read")

    def can_upload(self, db: Session, user: User, entity: MaintenanceRecord) -> bool:
        if is_admin(user):
            return True
        if not user.has_permission("maintenance:write"):
            return False
        if entity.status == "cancelada":
            return False
        return True

    def can_delete(self, db: Session, user: User, entity: MaintenanceRecord, attachment: Optional[Attachment] = None) -> bool:
        if is_admin(user):
            return True
        if not user.has_permission("maintenance:write"):
            return False
        if attachment and attachment.uploader_id == user.id:
            return True
        if entity.technician_id == user.id:
            return True
        return False


class AttendanceAttachmentValidator(AttachmentAccessValidator):
    @property
    def entity_type(self) -> str:
        return "attendance"

    def get_entity(self, db: Session, entity_id: int) -> Optional[Attendance]:
        return db.query(Attendance).filter(Attendance.id == entity_id).first()

    def can_read(self, db: Session, user: User, entity: Attendance) -> bool:
        if is_admin(user):
            return True
        return user.has_permission("attendance:read")

    def can_upload(self, db: Session, user: User, entity: Attendance) -> bool:
        if is_admin(user):
            return True
        if not user.has_permission("attendance:write"):
            return False
        # As per attendances router: only assigned technician or admin can alter
        if entity.technician_id is None or entity.technician_id == user.id:
            return True
        return False

    def can_delete(self, db: Session, user: User, entity: Attendance, attachment: Optional[Attachment] = None) -> bool:
        if is_admin(user):
            return True
        if not user.has_permission("attendance:write"):
            return False
        if entity.technician_id == user.id:
            return True
        if attachment and attachment.uploader_id == user.id:
            return True
        return False


class EquipmentAttachmentValidator(AttachmentAccessValidator):
    @property
    def entity_type(self) -> str:
        return "equipment"

    def get_entity(self, db: Session, entity_id: int) -> Optional[Equipment]:
        return db.query(Equipment).filter(Equipment.id == entity_id).first()

    def can_read(self, db: Session, user: User, entity: Equipment) -> bool:
        if is_admin(user):
            return True
        if not user.has_permission("equipment:read"):
            return False
        if entity.status == "descartado":
            return False
        return True

    def can_upload(self, db: Session, user: User, entity: Equipment) -> bool:
        if is_admin(user):
            return True
        if not user.has_permission("equipment:write"):
            return False
        if entity.status == "descartado":
            return False
        return True

    def can_delete(self, db: Session, user: User, entity: Equipment, attachment: Optional[Attachment] = None) -> bool:
        if is_admin(user):
            return True
        if not user.has_permission("equipment:write"):
            return False
        if attachment and attachment.uploader_id == user.id:
            return True
        return False


class KnowledgeAttachmentValidator(AttachmentAccessValidator):
    @property
    def entity_type(self) -> str:
        return "knowledge"

    def get_entity(self, db: Session, entity_id: int) -> Optional[KnowledgeArticle]:
        return db.query(KnowledgeArticle).filter(KnowledgeArticle.id == entity_id).first()

    def can_read(self, db: Session, user: User, entity: KnowledgeArticle) -> bool:
        if is_admin(user):
            return True
        if not user.has_permission("knowledge:read"):
            return False
        # As per knowledge router: published articles or author viewing draft
        if entity.status == "publicado":
            return True
        if entity.author_id == user.id:
            return True
        return False

    def can_upload(self, db: Session, user: User, entity: KnowledgeArticle) -> bool:
        if is_admin(user):
            return True
        if not user.has_permission("knowledge:write"):
            return False
        # Only article author can modify/attach
        if entity.author_id == user.id:
            return True
        return False

    def can_delete(self, db: Session, user: User, entity: KnowledgeArticle, attachment: Optional[Attachment] = None) -> bool:
        if is_admin(user):
            return True
        if not user.has_permission("knowledge:write"):
            return False
        if entity.author_id == user.id:
            return True
        if attachment and attachment.uploader_id == user.id:
            return True
        return False

class DepartmentAttachmentValidator(AttachmentAccessValidator):
    @property
    def entity_type(self) -> str:
        return "department"

    def get_entity(self, db: Session, entity_id: int) -> Optional[Department]:
        return db.query(Department).filter(Department.id == entity_id).first()

    def can_read(self, db: Session, user: User, entity: Department) -> bool:
        # Departments are globally visible to any authenticated user in the system
        return True

    def can_upload(self, db: Session, user: User, entity: Department) -> bool:
        if is_admin(user):
            return True
        # Rely on equipment:write or similar infrastructure write permission
        if user.has_permission("equipment:write"):
            return True
        return False

    def can_delete(self, db: Session, user: User, entity: Department, attachment: Optional[Attachment] = None) -> bool:
        if is_admin(user):
            return True
        if attachment and attachment.uploader_id == user.id:
            return True
        if user.has_permission("equipment:write"):
            return True
        return False
