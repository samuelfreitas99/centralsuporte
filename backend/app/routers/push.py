"""Inscrição de navegadores para Web Push."""
from fastapi import APIRouter, Depends, Request, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.auth import get_current_active_user
from app.database import get_db
from app.models import PushSubscription, User
from app.services.push import push_enabled, vapid_public_key

router = APIRouter(prefix="/push", tags=["Notificações"])


class PushKeys(BaseModel):
    p256dh: str
    auth: str


class PushSubscriptionIn(BaseModel):
    endpoint: str
    keys: PushKeys


class PushConfig(BaseModel):
    enabled: bool
    public_key: str | None = None


@router.get("/config", response_model=PushConfig)
def get_push_config(current_user: User = Depends(get_current_active_user)):
    return PushConfig(enabled=push_enabled(), public_key=vapid_public_key())


@router.post("/subscriptions", status_code=status.HTTP_204_NO_CONTENT)
def subscribe(
    payload: PushSubscriptionIn,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Registra (ou reatribui ao usuário atual) a inscrição deste navegador."""
    sub = db.query(PushSubscription).filter(PushSubscription.endpoint == payload.endpoint).first()
    if not sub:
        sub = PushSubscription(endpoint=payload.endpoint)
        db.add(sub)
    sub.user_id = current_user.id
    sub.p256dh = payload.keys.p256dh
    sub.auth = payload.keys.auth
    sub.user_agent = (request.headers.get("user-agent") or "")[:255]
    db.commit()


@router.post("/unsubscribe", status_code=status.HTTP_204_NO_CONTENT)
def unsubscribe(
    payload: PushSubscriptionIn,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    db.query(PushSubscription).filter(
        PushSubscription.endpoint == payload.endpoint, PushSubscription.user_id == current_user.id
    ).delete()
    db.commit()


class PushTestResult(BaseModel):
    sent: int


@router.post("/test", response_model=PushTestResult)
def send_test(db: Session = Depends(get_db), current_user: User = Depends(get_current_active_user)):
    """Envia uma notificação de teste para os navegadores do usuário (para conferir a configuração)."""
    from app.services.push import send_to_user

    sent = send_to_user(
        db,
        current_user.id,
        {"title": "Central de Suporte", "body": "Notificações funcionando neste dispositivo.", "url": "/#dashboard", "tag": "push-test"},
    )
    db.commit()
    return PushTestResult(sent=sent)
