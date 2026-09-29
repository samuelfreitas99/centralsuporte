from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import or_, distinct

from app.database import get_db
from app.models import StandardResponse, User
from app.auth import get_current_active_user
from app.schemas import (
    StandardResponseCreate,
    StandardResponseUpdate,
    StandardResponseResponse,
)

router = APIRouter(prefix="/responses", tags=["Standard Responses"])

def is_admin(user: User) -> bool:
    return user.has_role("Administrador")

@router.get("", response_model=List[StandardResponseResponse])
def list_responses(
    category: Optional[str] = None,
    audience: Optional[str] = None,
    search: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    query = db.query(StandardResponse)

    # Visibility rules: non-admins cannot see private responses of others
    if not is_admin(current_user):
        query = query.filter(
            or_(
                StandardResponse.visibility.in_(["equipe", "todos"]),
                StandardResponse.author_id == current_user.id,
            )
        )

    if category:
        query = query.filter(StandardResponse.category.ilike(category))

    if audience:
        query = query.filter(StandardResponse.audience.ilike(audience))

    if search:
        query = query.filter(
            or_(
                StandardResponse.title.ilike(f"%{search}%"),
                StandardResponse.content.ilike(f"%{search}%"),
                StandardResponse.tags.ilike(f"%{search}%"),
            )
        )

    return query.order_by(StandardResponse.copies_count.desc(), StandardResponse.updated_at.desc()).all()

@router.get("/categories", response_model=List[str])
def list_response_categories(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    results = db.query(distinct(StandardResponse.category)).filter(StandardResponse.category.isnot(None)).all()
    return sorted([r[0] for r in results if r[0]])

@router.get("/audiences", response_model=List[str])
def list_response_audiences(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    results = db.query(distinct(StandardResponse.audience)).filter(StandardResponse.audience.isnot(None)).all()
    return sorted([r[0] for r in results if r[0]])

@router.post("", response_model=StandardResponseResponse, status_code=status.HTTP_201_CREATED)
def create_response(
    payload: StandardResponseCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    resp_obj = StandardResponse(
        title=payload.title,
        content=payload.content,
        category=payload.category,
        audience=payload.audience or "usuario_final",
        tags=payload.tags,
        author_id=current_user.id,
        visibility=payload.visibility or "equipe",
    )
    db.add(resp_obj)
    db.commit()
    db.refresh(resp_obj)
    return resp_obj

@router.get("/{response_id}", response_model=StandardResponseResponse)
def get_response(
    response_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    resp_obj = db.query(StandardResponse).filter(StandardResponse.id == response_id).first()
    if not resp_obj:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Resposta padrão não encontrada")

    if not is_admin(current_user) and resp_obj.visibility == "privado" and resp_obj.author_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Resposta privada")

    return resp_obj

@router.put("/{response_id}", response_model=StandardResponseResponse)
def update_response(
    response_id: int,
    payload: StandardResponseUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    resp_obj = db.query(StandardResponse).filter(StandardResponse.id == response_id).first()
    if not resp_obj:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Resposta padrão não encontrada")

    if not is_admin(current_user) and resp_obj.author_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Apenas o autor ou administrador pode editar esta resposta")

    if payload.title is not None:
        resp_obj.title = payload.title
    if payload.content is not None:
        resp_obj.content = payload.content
    if payload.category is not None:
        resp_obj.category = payload.category
    if payload.audience is not None:
        resp_obj.audience = payload.audience
    if payload.tags is not None:
        resp_obj.tags = payload.tags
    if payload.visibility is not None:
        resp_obj.visibility = payload.visibility

    db.commit()
    db.refresh(resp_obj)
    return resp_obj

@router.delete("/{response_id}")
def delete_response(
    response_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    resp_obj = db.query(StandardResponse).filter(StandardResponse.id == response_id).first()
    if not resp_obj:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Resposta padrão não encontrada")

    if not is_admin(current_user) and resp_obj.author_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Apenas o autor ou administrador pode excluir esta resposta")

    db.delete(resp_obj)
    db.commit()
    return {"message": "Resposta padrão excluída com sucesso"}

@router.post("/{response_id}/copy")
def record_response_copy(
    response_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    resp_obj = db.query(StandardResponse).filter(StandardResponse.id == response_id).first()
    if not resp_obj:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Resposta padrão não encontrada")

    resp_obj.copies_count += 1
    db.commit()
    return {"status": "ok", "copies_count": resp_obj.copies_count}
