"""
Cofre de Senhas.

Regras (DECISIONS.md, 2026-09-24):
* listagem nunca devolve usuário/senha/notas — só metadados;
* revelar é uma chamada explícita que grava PASSWORD_REVEAL na auditoria (usuário, IP, registro);
* "equipe" = visível para quem tem vault:read; "pessoal" = só o dono (nem administradores veem);
* alterar/excluir: dono, ou administrador em registros da equipe.
"""
from datetime import datetime
from typing import List, Literal, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from pydantic import BaseModel, Field
from sqlalchemy import or_
from sqlalchemy.orm import Session, joinedload

from app.auth import require_permission
from app.database import get_db
from app.models import Equipment, Store, User, VaultEntry
from app.schemas import UserSimpleResponse
from app.services.audit import record_audit_log
from app.services.vault_crypto import VaultUnavailable, decrypt_secret, encrypt_secret, vault_configured

router = APIRouter(prefix="/vault", tags=["Cofre de Senhas"])

Visibility = Literal["equipe", "pessoal"]


class VaultStatus(BaseModel):
    configured: bool


class VaultEntryBase(BaseModel):
    title: str = Field(min_length=1, max_length=150)
    system_url: Optional[str] = Field(default=None, max_length=500)
    category: Optional[str] = Field(default=None, max_length=50)
    visibility: Visibility = "equipe"
    store_id: Optional[int] = None
    equipment_id: Optional[int] = None


class VaultEntryCreate(VaultEntryBase):
    username: Optional[str] = None
    password: str = Field(min_length=1)
    notes: Optional[str] = None


class VaultEntryUpdate(BaseModel):
    title: Optional[str] = Field(default=None, min_length=1, max_length=150)
    system_url: Optional[str] = None
    category: Optional[str] = None
    visibility: Optional[Visibility] = None
    store_id: Optional[int] = None
    equipment_id: Optional[int] = None
    # Campos secretos: só são alterados quando enviados
    username: Optional[str] = None
    password: Optional[str] = None
    notes: Optional[str] = None


class VaultEntryOut(VaultEntryBase):
    """Metadados — nunca inclui usuário, senha ou notas."""
    id: int
    owner_id: int
    owner: Optional[UserSimpleResponse] = None
    store_name: Optional[str] = None
    equipment_name: Optional[str] = None
    can_edit: bool = False
    created_at: datetime
    updated_at: datetime


class VaultSecretOut(BaseModel):
    username: Optional[str] = None
    password: str
    notes: Optional[str] = None


SECRET_FIELDS = ("username", "password", "notes")


def _ensure_configured():
    if not vault_configured():
        raise HTTPException(status.HTTP_503_SERVICE_UNAVAILABLE, "Cofre não configurado no servidor (CENTRAL_VAULT_KEY).")


def _visible(query, user: User):
    return query.filter(or_(VaultEntry.visibility == "equipe", VaultEntry.owner_id == user.id))


def _can_edit(entry: VaultEntry, user: User) -> bool:
    return entry.owner_id == user.id or (entry.visibility == "equipe" and user.has_role("Administrador"))


def _get_visible(db: Session, entry_id: int, user: User) -> VaultEntry:
    entry = _visible(db.query(VaultEntry), user).filter(VaultEntry.id == entry_id).first()
    if not entry:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Registro não encontrado")
    return entry


def _out(entry: VaultEntry, user: User) -> VaultEntryOut:
    return VaultEntryOut(
        id=entry.id,
        title=entry.title,
        system_url=entry.system_url,
        category=entry.category,
        visibility=entry.visibility,
        store_id=entry.store_id,
        equipment_id=entry.equipment_id,
        owner_id=entry.owner_id,
        owner=UserSimpleResponse.model_validate(entry.owner) if entry.owner else None,
        store_name=entry.store.name if entry.store else None,
        equipment_name=(entry.equipment.hostname or entry.equipment.patrimony) if entry.equipment else None,
        can_edit=_can_edit(entry, user),
        created_at=entry.created_at,
        updated_at=entry.updated_at,
    )


def _validate_links(db: Session, store_id: Optional[int], equipment_id: Optional[int]):
    if store_id and not db.get(Store, store_id):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Loja informada não existe")
    if equipment_id and not db.get(Equipment, equipment_id):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Equipamento informado não existe")


@router.get("/status", response_model=VaultStatus)
def get_status(current_user: User = Depends(require_permission("vault:read"))):
    return VaultStatus(configured=vault_configured())


@router.get("", response_model=List[VaultEntryOut])
def list_entries(
    search: Optional[str] = None,
    store_id: Optional[int] = None,
    equipment_id: Optional[int] = None,
    visibility: Optional[Visibility] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("vault:read")),
):
    query = _visible(db.query(VaultEntry), current_user).options(
        joinedload(VaultEntry.owner), joinedload(VaultEntry.store), joinedload(VaultEntry.equipment)
    )
    if search:
        term = f"%{search}%"
        query = query.filter(
            or_(VaultEntry.title.ilike(term), VaultEntry.system_url.ilike(term), VaultEntry.category.ilike(term))
        )
    if store_id:
        query = query.filter(VaultEntry.store_id == store_id)
    if equipment_id:
        query = query.filter(VaultEntry.equipment_id == equipment_id)
    if visibility:
        query = query.filter(VaultEntry.visibility == visibility)
    return [_out(e, current_user) for e in query.order_by(VaultEntry.title).all()]


@router.post("", response_model=VaultEntryOut, status_code=status.HTTP_201_CREATED)
def create_entry(
    payload: VaultEntryCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("vault:write")),
):
    _ensure_configured()
    _validate_links(db, payload.store_id, payload.equipment_id)
    entry = VaultEntry(
        **payload.model_dump(exclude=set(SECRET_FIELDS)),
        owner_id=current_user.id,
        nonce=b"",
        ciphertext=b"",
        auth_tag=b"",
    )
    db.add(entry)
    db.flush()  # precisa do id para o dado associado da criptografia
    entry.nonce, entry.ciphertext, entry.auth_tag = encrypt_secret(
        entry.id, {k: getattr(payload, k) for k in SECRET_FIELDS}
    )
    record_audit_log(db=db, action="CREATE", entity_type="vault", entity_id=entry.id, user=current_user,
                     details={"title": entry.title, "visibility": entry.visibility})
    db.commit()
    db.refresh(entry)
    return _out(entry, current_user)


@router.put("/{entry_id}", response_model=VaultEntryOut)
def update_entry(
    entry_id: int,
    payload: VaultEntryUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("vault:write")),
):
    _ensure_configured()
    entry = _get_visible(db, entry_id, current_user)
    if not _can_edit(entry, current_user):
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Só o dono (ou um administrador, em registros da equipe) pode alterar")
    data = payload.model_dump(exclude_unset=True)
    _validate_links(db, data.get("store_id"), data.get("equipment_id"))

    changed_secret = [k for k in SECRET_FIELDS if k in data]
    if changed_secret:
        current = decrypt_secret(entry.id, entry.nonce, entry.ciphertext, entry.auth_tag)
        current.update({k: data[k] for k in changed_secret})
        if not current.get("password"):
            raise HTTPException(status.HTTP_400_BAD_REQUEST, "A senha não pode ficar vazia")
        entry.nonce, entry.ciphertext, entry.auth_tag = encrypt_secret(entry.id, current)
    for key, value in data.items():
        if key not in SECRET_FIELDS:
            setattr(entry, key, value)
    entry.updated_at = datetime.utcnow()

    labels = {"username": "usuário", "password": "senha", "notes": "notas"}
    record_audit_log(db=db, action="UPDATE", entity_type="vault", entity_id=entry.id, user=current_user,
                     details={"title": entry.title, "alterou": [labels[k] for k in changed_secret] + [k for k in data if k not in SECRET_FIELDS]})
    db.commit()
    db.refresh(entry)
    return _out(entry, current_user)


@router.delete("/{entry_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_entry(
    entry_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("vault:write")),
):
    entry = _get_visible(db, entry_id, current_user)
    if not _can_edit(entry, current_user):
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Só o dono (ou um administrador, em registros da equipe) pode excluir")
    record_audit_log(db=db, action="DELETE", entity_type="vault", entity_id=entry.id, user=current_user,
                     details={"title": entry.title})
    db.delete(entry)
    db.commit()


@router.post("/{entry_id}/reveal", response_model=VaultSecretOut)
def reveal_entry(
    entry_id: int,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("vault:read")),
):
    """Decifra e devolve a credencial. Sempre auditado (PASSWORD_REVEAL)."""
    _ensure_configured()
    entry = _get_visible(db, entry_id, current_user)
    try:
        secret = decrypt_secret(entry.id, entry.nonce, entry.ciphertext, entry.auth_tag)
    except VaultUnavailable:
        raise
    except Exception:
        raise HTTPException(status.HTTP_500_INTERNAL_SERVER_ERROR, "Não foi possível decifrar o registro (chave diferente da usada ao salvar?)")
    record_audit_log(
        db=db,
        action="PASSWORD_REVEAL",
        entity_type="vault",
        entity_id=entry.id,
        user=current_user,
        details={"title": entry.title},
        ip_address=request.client.host if request.client else None,
        user_agent=request.headers.get("user-agent"),
    )
    db.commit()
    return VaultSecretOut(**secret)
