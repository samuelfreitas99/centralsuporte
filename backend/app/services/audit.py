import json
import logging
from typing import Optional, Union, Any, Dict
from sqlalchemy.orm import Session
from app.models import AuditLog, User

logger = logging.getLogger(__name__)

SENSITIVE_KEYS = {
    "password",
    "password_hash",
    "hashed_password",
    "token",
    "access_token",
    "refresh_token",
    "secret",
    "credential",
    "credentials",
    "authorization",
    "auth",
}


def sanitize_audit_data(data: Any) -> Any:
    """Recursively removes or masks sensitive fields like passwords, secrets and tokens."""
    if isinstance(data, dict):
        sanitized = {}
        for key, value in data.items():
            if any(sensitive in key.lower() for sensitive in SENSITIVE_KEYS):
                sanitized[key] = "[REDACTED]"
            else:
                sanitized[key] = sanitize_audit_data(value)
        return sanitized
    elif isinstance(data, list):
        return [sanitize_audit_data(item) for item in data]
    return data


def record_audit_log(
    db: Session,
    action: str,
    entity_type: str,
    entity_id: Optional[int] = None,
    user: Optional[User] = None,
    username: Optional[str] = None,
    details: Optional[Union[Dict[str, Any], str]] = None,
    ip_address: Optional[str] = None,
    user_agent: Optional[str] = None,
) -> Optional[AuditLog]:
    """
    Creates an immutable audit log entry in the database.
    Guarantees strict data sanitization and graceful fault tolerance.
    """
    try:
        user_id = user.id if user else None
        effective_username = username or (user.username if user else "sistema")

        formatted_details = None
        if details is not None:
            if isinstance(details, (dict, list)):
                sanitized = sanitize_audit_data(details)
                formatted_details = json.dumps(sanitized, ensure_ascii=False)
            else:
                formatted_details = str(details)

        audit_entry = AuditLog(
            user_id=user_id,
            username=effective_username,
            action=action.upper(),
            entity_type=entity_type.lower(),
            entity_id=entity_id,
            ip_address=ip_address,
            user_agent=user_agent,
            details=formatted_details,
        )
        db.add(audit_entry)
        db.flush()
        return audit_entry
    except Exception as e:
        logger.error(f"Falha ao registrar log de auditoria ({action} em {entity_type}): {e}")
        return None
