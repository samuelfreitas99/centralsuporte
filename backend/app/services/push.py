"""
Web Push (notificações com a Central fechada).

Chaves VAPID vêm do ambiente (VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT); sem elas o
recurso fica desligado e o sino continua funcionando só com a Central aberta.
Gerar chaves: `python -m app.services.push` (imprime as linhas para o .env).
"""
import json
import logging
import os
from datetime import datetime, timedelta, timezone

from sqlalchemy.orm import Session

from app.models import PushSubscription, Reminder

logger = logging.getLogger(__name__)

# Lembretes que venceram há mais que isso não viram push (evita enxurrada após ficar fora do ar).
MAX_PUSH_AGE = timedelta(hours=12)


def vapid_public_key() -> str | None:
    return os.environ.get("VAPID_PUBLIC_KEY") or None


def push_enabled() -> bool:
    return bool(vapid_public_key() and os.environ.get("VAPID_PRIVATE_KEY"))


def _target_for(reminder: Reminder) -> str:
    return f"/#tasks?id={reminder.task_id}" if reminder.task_id else "/#tasks"


def send_to_user(db: Session, user_id: int, payload: dict) -> int:
    """Envia para todos os navegadores do usuário; remove inscrições expiradas. Retorna quantos receberam."""
    if not push_enabled():
        return 0
    from pywebpush import WebPushException, webpush

    sent = 0
    for sub in db.query(PushSubscription).filter(PushSubscription.user_id == user_id).all():
        try:
            webpush(
                subscription_info={"endpoint": sub.endpoint, "keys": {"p256dh": sub.p256dh, "auth": sub.auth}},
                data=json.dumps(payload),
                vapid_private_key=os.environ["VAPID_PRIVATE_KEY"],
                vapid_claims={"sub": os.environ.get("VAPID_SUBJECT", "mailto:suporte@localhost")},
                ttl=3600,
            )
            sent += 1
        except WebPushException as exc:
            status = getattr(exc.response, "status_code", None)
            if status in (404, 410):  # inscrição cancelada pelo navegador
                db.delete(sub)
            else:
                logger.warning("Falha ao enviar push (%s): %s", status, exc)
        except Exception as exc:  # rede, chave inválida etc. — nunca derruba o laço
            logger.warning("Falha ao enviar push: %s", exc)
    return sent


def push_due_reminders(db: Session) -> int:
    """Envia push dos lembretes/alertas pendentes que já chegaram na hora e ainda não foram enviados."""
    now = datetime.now(timezone.utc)
    due = (
        db.query(Reminder)
        .filter(Reminder.status == "pendente", Reminder.pushed_at.is_(None), Reminder.remind_at <= now)
        .order_by(Reminder.remind_at)
        .limit(200)
        .all()
    )
    sent = 0
    for reminder in due:
        remind_at = reminder.remind_at if reminder.remind_at.tzinfo else reminder.remind_at.replace(tzinfo=timezone.utc)
        if push_enabled() and now - remind_at <= MAX_PUSH_AGE:
            sent += send_to_user(
                db,
                reminder.user_id,
                {
                    "title": reminder.title,
                    "body": reminder.description or "Abra a Central para ver os detalhes.",
                    "url": _target_for(reminder),
                    "tag": f"reminder-{reminder.id}",
                },
            )
        reminder.pushed_at = now
    db.commit()
    return sent


if __name__ == "__main__":
    from py_vapid import Vapid01
    from cryptography.hazmat.primitives import serialization
    import base64

    v = Vapid01()
    v.generate_keys()
    raw_pub = v.public_key.public_bytes(serialization.Encoding.X962, serialization.PublicFormat.UncompressedPoint)
    raw_priv = v.private_key.private_numbers().private_value.to_bytes(32, "big")
    b64 = lambda b: base64.urlsafe_b64encode(b).decode().rstrip("=")  # noqa: E731
    print(f"VAPID_PUBLIC_KEY={b64(raw_pub)}")
    print(f"VAPID_PRIVATE_KEY={b64(raw_priv)}")
    print("VAPID_SUBJECT=mailto:suporte@voleidraft.top")
