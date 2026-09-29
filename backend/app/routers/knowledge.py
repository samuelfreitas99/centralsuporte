from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import or_

from app.database import get_db
from app.models import (
    KnowledgeCategory,
    KnowledgeTag,
    KnowledgeArticle,
    KnowledgeVersion,
    User,
)
from app.auth import get_current_active_user, require_permission
from app.schemas import (
    KnowledgeCategoryCreate,
    KnowledgeCategoryUpdate,
    KnowledgeCategoryResponse,
    KnowledgeTagResponse,
    KnowledgeVersionResponse,
    KnowledgeArticleCreate,
    KnowledgeArticleUpdate,
    KnowledgeArticleResponse,
)

router = APIRouter(prefix="/knowledge", tags=["Knowledge Base"])

def is_admin(user: User) -> bool:
    return user.has_role("Administrador")

# --- Categories Endpoints ---

@router.get("/categories", response_model=List[KnowledgeCategoryResponse])
def list_categories(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("knowledge:read")),
):
    categories = db.query(KnowledgeCategory).order_by(KnowledgeCategory.name.asc()).all()
    for cat in categories:
        cat.articles_count = len(cat.articles)
    return categories

@router.post("/categories", response_model=KnowledgeCategoryResponse, status_code=status.HTTP_201_CREATED)
def create_category(
    payload: KnowledgeCategoryCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("knowledge:write")),
):
    existing = db.query(KnowledgeCategory).filter(KnowledgeCategory.name == payload.name).first()
    if existing:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Categoria já existente")

    category = KnowledgeCategory(
        name=payload.name,
        description=payload.description,
        color=payload.color or "#3b82f6"
    )
    db.add(category)
    db.commit()
    db.refresh(category)
    category.articles_count = 0
    return category

@router.put("/categories/{category_id}", response_model=KnowledgeCategoryResponse)
def update_category(
    category_id: int,
    payload: KnowledgeCategoryUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("knowledge:write")),
):
    category = db.query(KnowledgeCategory).filter(KnowledgeCategory.id == category_id).first()
    if not category:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Categoria não encontrada")

    if payload.name is not None and payload.name.strip() != category.name:
        existing = db.query(KnowledgeCategory).filter(KnowledgeCategory.name == payload.name.strip()).first()
        if existing:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Categoria com este nome já existe")
        category.name = payload.name.strip()

    if payload.description is not None:
        category.description = payload.description
    if payload.color is not None:
        category.color = payload.color

    db.commit()
    db.refresh(category)
    category.articles_count = len(category.articles)
    return category

@router.delete("/categories/{category_id}")
def delete_category(
    category_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("knowledge:write")),
):
    category = db.query(KnowledgeCategory).filter(KnowledgeCategory.id == category_id).first()
    if not category:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Categoria não encontrada")

    articles_affected = len(category.articles)
    db.delete(category)
    db.commit()
    return {"message": "Categoria removida com sucesso", "articles_affected": articles_affected}

# --- Tags Endpoints ---

@router.get("/tags", response_model=List[KnowledgeTagResponse])
def list_tags(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("knowledge:read")),
):
    return db.query(KnowledgeTag).order_by(KnowledgeTag.name.asc()).all()

# --- Articles Endpoints ---

@router.get("/articles", response_model=List[KnowledgeArticleResponse])
def list_articles(
    category_id: Optional[int] = None,
    tag: Optional[str] = None,
    status_filter: Optional[str] = Query(None, alias="status"),
    search: Optional[str] = None,
    only_favorites: Optional[bool] = False,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("knowledge:read")),
):
    query = db.query(KnowledgeArticle)

    # Visibility & Status rules:
    # Non-admins: can only see 'publicado' unless they are the author
    if not is_admin(current_user):
        query = query.filter(
            or_(
                KnowledgeArticle.status == "publicado",
                KnowledgeArticle.author_id == current_user.id
            )
        )

    if category_id is not None:
        query = query.filter(KnowledgeArticle.category_id == category_id)

    if status_filter:
        query = query.filter(KnowledgeArticle.status == status_filter)

    if tag:
        query = query.filter(KnowledgeArticle.tags.any(KnowledgeTag.name == tag.lower()))

    if only_favorites:
        query = query.filter(KnowledgeArticle.favorited_by.any(User.id == current_user.id))

    if search:
        query = query.filter(
            or_(
                KnowledgeArticle.title.ilike(f"%{search}%"),
                KnowledgeArticle.summary.ilike(f"%{search}%"),
                KnowledgeArticle.content.ilike(f"%{search}%"),
                KnowledgeArticle.problem.ilike(f"%{search}%"),
                KnowledgeArticle.solution.ilike(f"%{search}%"),
                KnowledgeArticle.commands.ilike(f"%{search}%"),
                KnowledgeArticle.tags.any(KnowledgeTag.name.ilike(f"%{search}%")),
            )
        )

    articles = query.order_by(KnowledgeArticle.updated_at.desc()).all()

    # Map favorite status
    favorite_ids = {a.id for a in current_user.favorite_articles}
    for art in articles:
        art.is_favorite = art.id in favorite_ids

    return articles

@router.post("/articles", response_model=KnowledgeArticleResponse, status_code=status.HTTP_201_CREATED)
def create_article(
    payload: KnowledgeArticleCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("knowledge:write")),
):
    article = KnowledgeArticle(
        title=payload.title,
        summary=payload.summary,
        content=payload.content,
        problem=payload.problem,
        solution=payload.solution,
        commands=payload.commands,
        category_id=payload.category_id,
        author_id=current_user.id,
        status=payload.status or "rascunho",
        visibility=payload.visibility or "equipe"
    )
    db.add(article)
    db.flush()

    if payload.tag_names:
        for t_name in payload.tag_names:
            clean_name = t_name.strip().lower()
            if not clean_name:
                continue
            tag_obj = db.query(KnowledgeTag).filter(KnowledgeTag.name == clean_name).first()
            if not tag_obj:
                tag_obj = KnowledgeTag(name=clean_name)
                db.add(tag_obj)
                db.flush()
            article.tags.append(tag_obj)

    # Create initial version (v1)
    version = KnowledgeVersion(
        article_id=article.id,
        version_number=1,
        title=article.title,
        content=article.content,
        change_summary="Criação inicial do artigo",
        editor_id=current_user.id
    )
    db.add(version)

    db.commit()
    db.refresh(article)
    article.is_favorite = False
    return article

@router.get("/articles/{article_id}", response_model=KnowledgeArticleResponse)
def get_article(
    article_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("knowledge:read")),
):
    article = db.query(KnowledgeArticle).filter(KnowledgeArticle.id == article_id).first()
    if not article:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Artigo não encontrado")

    if not is_admin(current_user) and article.status != "publicado" and article.author_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Artigo em rascunho ou não disponível")

    # Increment view counter
    article.views_count += 1
    db.commit()
    db.refresh(article)

    article.is_favorite = any(u.id == current_user.id for u in article.favorited_by)
    return article

@router.put("/articles/{article_id}", response_model=KnowledgeArticleResponse)
def update_article(
    article_id: int,
    payload: KnowledgeArticleUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("knowledge:write")),
):
    article = db.query(KnowledgeArticle).filter(KnowledgeArticle.id == article_id).first()
    if not article:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Artigo não encontrado")

    content_changed = (payload.content is not None and payload.content != article.content)
    title_changed = (payload.title is not None and payload.title != article.title)

    if payload.title is not None:
        article.title = payload.title
    if payload.summary is not None:
        article.summary = payload.summary
    if payload.content is not None:
        article.content = payload.content
    if payload.problem is not None:
        article.problem = payload.problem
    if payload.solution is not None:
        article.solution = payload.solution
    if payload.commands is not None:
        article.commands = payload.commands
    if payload.category_id is not None:
        article.category_id = payload.category_id
    if payload.status is not None:
        article.status = payload.status
    if payload.visibility is not None:
        article.visibility = payload.visibility

    if payload.tag_names is not None:
        article.tags = []
        for t_name in payload.tag_names:
            clean_name = t_name.strip().lower()
            if not clean_name:
                continue
            tag_obj = db.query(KnowledgeTag).filter(KnowledgeTag.name == clean_name).first()
            if not tag_obj:
                tag_obj = KnowledgeTag(name=clean_name)
                db.add(tag_obj)
                db.flush()
            article.tags.append(tag_obj)

    # Versioning: If title or content changed, record a new version
    if content_changed or title_changed or payload.change_summary:
        next_version_num = len(article.versions) + 1
        new_version = KnowledgeVersion(
            article_id=article.id,
            version_number=next_version_num,
            title=article.title,
            content=article.content,
            change_summary=payload.change_summary or f"Atualização de conteúdo (v{next_version_num})",
            editor_id=current_user.id
        )
        db.add(new_version)

    db.commit()
    db.refresh(article)
    article.is_favorite = any(u.id == current_user.id for u in article.favorited_by)
    return article

@router.delete("/articles/{article_id}")
def delete_article(
    article_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("knowledge:write")),
):
    article = db.query(KnowledgeArticle).filter(KnowledgeArticle.id == article_id).first()
    if not article:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Artigo não encontrado")

    if not is_admin(current_user) and article.author_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Apenas o autor ou administrador pode excluir este artigo")

    db.delete(article)
    db.commit()
    return {"message": "Artigo excluído com sucesso"}

@router.post("/articles/{article_id}/favorite")
def toggle_favorite(
    article_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("knowledge:read")),
):
    article = db.query(KnowledgeArticle).filter(KnowledgeArticle.id == article_id).first()
    if not article:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Artigo não encontrado")

    is_fav = any(u.id == current_user.id for u in article.favorited_by)
    if is_fav:
        article.favorited_by.remove(current_user)
        action = "removed"
    else:
        article.favorited_by.append(current_user)
        action = "added"

    db.commit()
    return {"status": "ok", "action": action, "is_favorite": not is_fav}

# --- Versioning Endpoints ---

@router.get("/articles/{article_id}/versions", response_model=List[KnowledgeVersionResponse])
def list_article_versions(
    article_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("knowledge:read")),
):
    article = db.query(KnowledgeArticle).filter(KnowledgeArticle.id == article_id).first()
    if not article:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Artigo não encontrado")

    if not is_admin(current_user) and article.status != "publicado" and article.author_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Artigo não disponível para visualização")

    return article.versions

@router.get("/articles/{article_id}/versions/{version_number}", response_model=KnowledgeVersionResponse)
def get_article_version(
    article_id: int,
    version_number: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("knowledge:read")),
):
    article = db.query(KnowledgeArticle).filter(KnowledgeArticle.id == article_id).first()
    if not article:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Artigo não encontrado")

    if not is_admin(current_user) and article.status != "publicado" and article.author_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Artigo não disponível para visualização")

    ver = db.query(KnowledgeVersion).filter(
        KnowledgeVersion.article_id == article_id,
        KnowledgeVersion.version_number == version_number,
    ).first()
    if not ver:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Versão não encontrada")

    return ver

@router.post("/articles/{article_id}/versions/{version_number}/restore", response_model=KnowledgeArticleResponse)
def restore_article_version(
    article_id: int,
    version_number: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("knowledge:write")),
):
    article = db.query(KnowledgeArticle).filter(KnowledgeArticle.id == article_id).first()
    if not article:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Artigo não encontrado")

    target_ver = db.query(KnowledgeVersion).filter(
        KnowledgeVersion.article_id == article_id,
        KnowledgeVersion.version_number == version_number,
    ).first()
    if not target_ver:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Versão alvo não encontrada")

    article.title = target_ver.title
    article.content = target_ver.content

    new_version_num = len(article.versions) + 1
    restored_version = KnowledgeVersion(
        article_id=article.id,
        version_number=new_version_num,
        title=article.title,
        content=article.content,
        change_summary=f"Restauração a partir da versão v{target_ver.version_number}",
        editor_id=current_user.id,
    )
    db.add(restored_version)
    db.commit()
    db.refresh(article)
    article.is_favorite = any(u.id == current_user.id for u in article.favorited_by)
    return article
