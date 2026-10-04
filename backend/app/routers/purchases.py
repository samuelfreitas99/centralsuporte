"""
Compras operacionais (DOMAIN_RULES §4): pedido com orçamentos -> aprovação do gestor -> recebimento.

Não movimenta dinheiro nem gera contabilidade. Ao receber um pedido ligado a um item de estoque,
registra a entrada no estoque automaticamente. Pedidos e decisões geram avisos no sino (e push).
"""
from datetime import datetime, timezone
from typing import List, Literal, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy import or_
from sqlalchemy.orm import Session, joinedload, selectinload

from app.auth import require_permission
from app.database import get_db
from app.models import (
    Permission,
    Project,
    PurchaseQuote,
    PurchaseRequest,
    Reminder,
    Role,
    StockItem,
    StockMovement,
    User,
)
from app.schemas import UserSimpleResponse
from app.services.audit import record_audit_log

router = APIRouter(prefix="/purchases", tags=["Compras"])

PurchaseStatus = Literal["aguardando_aprovacao", "aprovada", "rejeitada", "recebida", "cancelada"]


# ---------------------------------------------------------------- schemas
class PurchaseQuoteIn(BaseModel):
    supplier: str = Field(min_length=1, max_length=150)
    unit_price: float = Field(ge=0)
    delivery_days: Optional[int] = Field(default=None, ge=0)
    link: Optional[str] = Field(default=None, max_length=500)
    notes: Optional[str] = None


class PurchaseQuoteResponse(PurchaseQuoteIn):
    id: int
    total: float


class PurchaseRequestIn(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    reason: Optional[str] = None
    quantity: int = Field(default=1, ge=1)
    stock_item_id: Optional[int] = None
    project_id: Optional[int] = None
    quotes: List[PurchaseQuoteIn] = Field(min_length=1)


class PurchaseDecisionIn(BaseModel):
    quote_id: Optional[int] = None
    note: Optional[str] = None


class PurchaseRequestResponse(BaseModel):
    id: int
    title: str
    reason: Optional[str] = None
    quantity: int
    status: PurchaseStatus
    requester: Optional[UserSimpleResponse] = None
    approver: Optional[UserSimpleResponse] = None
    chosen_quote_id: Optional[int] = None
    decision_note: Optional[str] = None
    decided_at: Optional[datetime] = None
    received_at: Optional[datetime] = None
    stock_item_id: Optional[int] = None
    stock_item_name: Optional[str] = None
    project_id: Optional[int] = None
    project_title: Optional[str] = None
    quotes: List[PurchaseQuoteResponse] = []
    best_total: Optional[float] = None
    chosen_total: Optional[float] = None
    can_edit: bool = False
    can_decide: bool = False
    created_at: datetime
    updated_at: datetime


# ---------------------------------------------------------------- helpers
def _quote_out(q: PurchaseQuote, quantity: int) -> PurchaseQuoteResponse:
    return PurchaseQuoteResponse(
        id=q.id, supplier=q.supplier, unit_price=q.unit_price, delivery_days=q.delivery_days,
        link=q.link, notes=q.notes, total=round(q.unit_price * quantity, 2),
    )


def _out(p: PurchaseRequest, user: User) -> PurchaseRequestResponse:
    quotes = [_quote_out(q, p.quantity) for q in p.quotes]
    chosen = next((q for q in quotes if q.id == p.chosen_quote_id), None)
    return PurchaseRequestResponse(
        id=p.id, title=p.title, reason=p.reason, quantity=p.quantity, status=p.status,
        requester=UserSimpleResponse.model_validate(p.requester) if p.requester else None,
        approver=UserSimpleResponse.model_validate(p.approver) if p.approver else None,
        chosen_quote_id=p.chosen_quote_id, decision_note=p.decision_note, decided_at=p.decided_at,
        received_at=p.received_at, stock_item_id=p.stock_item_id,
        stock_item_name=p.stock_item.name if p.stock_item else None,
        project_id=p.project_id, project_title=p.project.title if p.project else None,
        quotes=quotes, best_total=min((q.total for q in quotes), default=None),
        chosen_total=chosen.total if chosen else None,
        can_edit=p.status == "aguardando_aprovacao" and (p.requester_id == user.id or user.has_role("Administrador")),
        can_decide=p.status == "aguardando_aprovacao" and user.has_permission("purchase:approve"),
        created_at=p.created_at, updated_at=p.updated_at,
    )


def _load(db: Session, purchase_id: int) -> PurchaseRequest:
    p = (
        db.query(PurchaseRequest)
        .options(
            joinedload(PurchaseRequest.requester), joinedload(PurchaseRequest.approver),
            joinedload(PurchaseRequest.stock_item), joinedload(PurchaseRequest.project),
            selectinload(PurchaseRequest.quotes),
        )
        .filter(PurchaseRequest.id == purchase_id)
        .first()
    )
    if not p:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Pedido de compra não encontrado")
    return p


def _approvers(db: Session) -> List[User]:
    return (
        db.query(User)
        .join(User.roles)
        .filter(
            User.is_active.is_(True),
            or_(Role.name == "Administrador", Role.permissions.any(Permission.name == "purchase:approve")),
        )
        .distinct()
        .all()
    )


def _notify(db: Session, users, title: str, body: str, purchase_id: int) -> None:
    now = datetime.now(timezone.utc)
    for u in users:
        db.add(Reminder(title=title, description=body, remind_at=now, user_id=u.id, priority="alta", source="automacao"))


def _validate_links(db: Session, data: PurchaseRequestIn) -> None:
    if data.stock_item_id and not db.get(StockItem, data.stock_item_id):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Item de estoque informado não existe")
    if data.project_id and not db.get(Project, data.project_id):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Projeto informado não existe")


def _require_status(p: PurchaseRequest, *allowed: str) -> None:
    if p.status not in allowed:
        raise HTTPException(status.HTTP_409_CONFLICT, f"Ação não permitida para pedido com status '{p.status}'")


# ---------------------------------------------------------------- rotas
@router.get("", response_model=List[PurchaseRequestResponse])
def list_purchases(
    status_filter: Optional[PurchaseStatus] = None,
    search: Optional[str] = None,
    mine: bool = False,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("purchase:read")),
):
    query = db.query(PurchaseRequest).options(
        joinedload(PurchaseRequest.requester), joinedload(PurchaseRequest.approver),
        joinedload(PurchaseRequest.stock_item), joinedload(PurchaseRequest.project),
        selectinload(PurchaseRequest.quotes),
    )
    if status_filter:
        query = query.filter(PurchaseRequest.status == status_filter)
    if mine:
        query = query.filter(PurchaseRequest.requester_id == current_user.id)
    if search:
        query = query.filter(PurchaseRequest.title.ilike(f"%{search}%"))
    rows = query.order_by(PurchaseRequest.created_at.desc()).limit(300).all()
    return [_out(p, current_user) for p in rows]


@router.get("/{purchase_id}", response_model=PurchaseRequestResponse)
def get_purchase(purchase_id: int, db: Session = Depends(get_db), current_user: User = Depends(require_permission("purchase:read"))):
    return _out(_load(db, purchase_id), current_user)


@router.post("", response_model=PurchaseRequestResponse, status_code=status.HTTP_201_CREATED)
def create_purchase(
    data: PurchaseRequestIn,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("purchase:write")),
):
    _validate_links(db, data)
    p = PurchaseRequest(**data.model_dump(exclude={"quotes"}), requester_id=current_user.id)
    p.quotes = [PurchaseQuote(**q.model_dump()) for q in data.quotes]
    db.add(p)
    db.flush()
    record_audit_log(db=db, action="CREATE", entity_type="purchase", entity_id=p.id, user=current_user,
                     details={"title": p.title, "quotes": len(data.quotes)})
    _notify(
        db, [u for u in _approvers(db) if u.id != current_user.id],
        f"Compra aguardando aprovação: {p.title}",
        f"{current_user.full_name or current_user.username} pediu {p.quantity}x com {len(data.quotes)} orçamento(s).",
        p.id,
    )
    db.commit()
    return _out(_load(db, p.id), current_user)


@router.put("/{purchase_id}", response_model=PurchaseRequestResponse)
def update_purchase(
    purchase_id: int,
    data: PurchaseRequestIn,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("purchase:write")),
):
    p = _load(db, purchase_id)
    _require_status(p, "aguardando_aprovacao")
    if p.requester_id != current_user.id and not current_user.has_role("Administrador"):
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Só quem pediu pode alterar o pedido")
    _validate_links(db, data)
    for key, value in data.model_dump(exclude={"quotes"}).items():
        setattr(p, key, value)
    p.quotes = [PurchaseQuote(**q.model_dump()) for q in data.quotes]
    record_audit_log(db=db, action="UPDATE", entity_type="purchase", entity_id=p.id, user=current_user, details={"title": p.title})
    db.commit()
    return _out(_load(db, p.id), current_user)


@router.post("/{purchase_id}/approve", response_model=PurchaseRequestResponse)
def approve_purchase(
    purchase_id: int,
    decision: PurchaseDecisionIn,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("purchase:approve")),
):
    p = _load(db, purchase_id)
    _require_status(p, "aguardando_aprovacao")
    if not decision.quote_id or decision.quote_id not in {q.id for q in p.quotes}:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Escolha um dos orçamentos do pedido")
    p.status, p.chosen_quote_id = "aprovada", decision.quote_id
    p.approver_id, p.decision_note, p.decided_at = current_user.id, decision.note, datetime.now(timezone.utc)
    chosen = next(q for q in p.quotes if q.id == decision.quote_id)
    record_audit_log(db=db, action="APPROVE", entity_type="purchase", entity_id=p.id, user=current_user,
                     details={"title": p.title, "fornecedor": chosen.supplier})
    _notify(db, [p.requester], f"Compra aprovada: {p.title}", f"Fornecedor escolhido: {chosen.supplier}.", p.id)
    db.commit()
    return _out(_load(db, p.id), current_user)


@router.post("/{purchase_id}/reject", response_model=PurchaseRequestResponse)
def reject_purchase(
    purchase_id: int,
    decision: PurchaseDecisionIn,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("purchase:approve")),
):
    p = _load(db, purchase_id)
    _require_status(p, "aguardando_aprovacao")
    if not (decision.note or "").strip():
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Informe o motivo da rejeição")
    p.status, p.approver_id = "rejeitada", current_user.id
    p.decision_note, p.decided_at = decision.note, datetime.now(timezone.utc)
    record_audit_log(db=db, action="REJECT", entity_type="purchase", entity_id=p.id, user=current_user, details={"title": p.title})
    _notify(db, [p.requester], f"Compra rejeitada: {p.title}", decision.note, p.id)
    db.commit()
    return _out(_load(db, p.id), current_user)


@router.post("/{purchase_id}/receive", response_model=PurchaseRequestResponse)
def receive_purchase(
    purchase_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("purchase:write")),
):
    """Marca como recebida; se ligada a um item de estoque, registra a entrada da quantidade."""
    p = _load(db, purchase_id)
    _require_status(p, "aprovada")
    p.status, p.received_at = "recebida", datetime.now(timezone.utc)
    if p.stock_item:
        p.stock_item.current_quantity += p.quantity
        db.add(StockMovement(
            stock_item_id=p.stock_item_id, user_id=current_user.id, movement_type="entrada",
            quantity=p.quantity, project_id=p.project_id, reason=f"Compra #{p.id} recebida",
        ))
    record_audit_log(db=db, action="RECEIVE", entity_type="purchase", entity_id=p.id, user=current_user,
                     details={"title": p.title, "estoque": bool(p.stock_item_id)})
    db.commit()
    return _out(_load(db, p.id), current_user)


@router.post("/{purchase_id}/cancel", response_model=PurchaseRequestResponse)
def cancel_purchase(
    purchase_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("purchase:write")),
):
    p = _load(db, purchase_id)
    _require_status(p, "aguardando_aprovacao", "aprovada")
    if p.requester_id != current_user.id and not current_user.has_permission("purchase:approve"):
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Só quem pediu ou quem aprova pode cancelar")
    p.status = "cancelada"
    record_audit_log(db=db, action="CANCEL", entity_type="purchase", entity_id=p.id, user=current_user, details={"title": p.title})
    db.commit()
    return _out(_load(db, p.id), current_user)
