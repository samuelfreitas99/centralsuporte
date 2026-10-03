from typing import List, Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_

from app.database import get_db
from app.models import (
    CommandStep,
    KnowledgeArticle,
    Command,
    Attendance,
    Equipment,
    MaintenanceRecord,
    Task,
    User,
)
from app.schemas import GlobalSearchResponse, SearchResultItem
from app.auth import get_current_active_user

router = APIRouter(prefix="/search", tags=["search"])


@router.get("/global", response_model=GlobalSearchResponse)
def global_search(
    q: str = Query(..., min_length=1, description="Termo de busca global"),
    entity_type: Optional[str] = Query(None, description="Filtrar por tipo de entidade"),
    store_id: Optional[int] = Query(None, description="Filtrar por ID da loja"),
    limit: int = Query(50, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """
    Unified search across Knowledge Articles, Commands, Attendances, Equipment, Maintenances, and Tasks.
    """
    clean_q = q.strip()
    term = f"%{clean_q}%"
    results: List[SearchResultItem] = []

    # 1. Knowledge Articles
    if not entity_type or entity_type == "knowledge":
        from app.models import KnowledgeTag
        k_query = db.query(KnowledgeArticle).filter(
            or_(
                KnowledgeArticle.title.ilike(term),
                KnowledgeArticle.summary.ilike(term),
                KnowledgeArticle.content.ilike(term),
                KnowledgeArticle.tags.any(KnowledgeTag.name.ilike(term)),
            )
        )
        for article in k_query.limit(limit).all():
            snippet = article.summary or (article.content[:140] + "..." if len(article.content) > 140 else article.content)
            results.append(
                SearchResultItem(
                    id=article.id,
                    entity_type="knowledge",
                    title=article.title,
                    snippet=snippet,
                    badge=article.category.name if article.category else "Conhecimento",
                    created_at=article.created_at,
                    url_tab="knowledge",
                    metadata={
                        "views_count": article.views_count,
                        "tags": [t.name for t in article.tags],
                    },
                )
            )

    # 2. Commands & Responses
    if not entity_type or entity_type in ("command", "commands"):
        c_query = db.query(Command).filter(
            or_(
                Command.title.ilike(term),
                Command.command.ilike(term),
                Command.description.ilike(term),
                Command.category.ilike(term),
                Command.tags.ilike(term),
                Command.steps.any(CommandStep.command_text.ilike(term)),
                Command.steps.any(CommandStep.title.ilike(term)),
            )
        )
        for cmd in c_query.limit(limit).all():
            first_step = cmd.steps[0].command_text if cmd.steps else None
            results.append(
                SearchResultItem(
                    id=cmd.id,
                    entity_type="command",
                    title=cmd.title or cmd.description or cmd.command or first_step or f"Comando #{cmd.id}",
                    snippet=first_step or cmd.command or cmd.description or "",
                    badge=(cmd.category or "comando").upper(),
                    created_at=cmd.created_at,
                    url_tab="commands",
                    metadata={"copies_count": cmd.copies_count, "category": cmd.category},
                )
            )

    # 3. Attendances
    if not entity_type or entity_type == "attendance":
        att_query = db.query(Attendance).filter(
            or_(
                Attendance.title.ilike(term),
                Attendance.otrs_ticket.ilike(term),
                Attendance.problem_description.ilike(term),
                Attendance.solution.ilike(term),
                Attendance.commands_used.ilike(term),
            )
        )
        for att in att_query.limit(limit).all():
            snippet = att.solution or att.problem_description or "Atendimento registrado"
            if len(snippet) > 140:
                snippet = snippet[:140] + "..."
            results.append(
                SearchResultItem(
                    id=att.id,
                    entity_type="attendance",
                    title=att.title,
                    snippet=snippet,
                    badge=att.otrs_ticket or att.status.upper(),
                    created_at=att.created_at,
                    url_tab="attendance",
                    metadata={"status": att.status, "otrs_ticket": att.otrs_ticket},
                )
            )

    # 4. Equipment
    if not entity_type or entity_type == "equipment":
        eq_query = db.query(Equipment).filter(
            or_(
                Equipment.hostname.ilike(term),
                Equipment.patrimony.ilike(term),
                Equipment.equipment_type.ilike(term),
                Equipment.brand.ilike(term),
                Equipment.serial_number.ilike(term),
                Equipment.ip_address.ilike(term),
                Equipment.mac_address.ilike(term),
                Equipment.model.ilike(term),
            )
        )
        if store_id:
            eq_query = eq_query.filter(Equipment.store_id == store_id)
        for eq in eq_query.limit(limit).all():
            snippet_parts = []
            if eq.ip_address:
                snippet_parts.append(f"IP: {eq.ip_address}")
            if eq.mac_address:
                snippet_parts.append(f"MAC: {eq.mac_address}")
            if eq.model:
                snippet_parts.append(f"Modelo: {eq.model}")
            if eq.store:
                snippet_parts.append(f"Loja: {eq.store.name}")
            snippet = " • ".join(snippet_parts) or "Equipamento cadastrado"

            results.append(
                SearchResultItem(
                    id=eq.id,
                    entity_type="equipment",
                    title=eq.hostname or eq.model or f"Equipamento #{eq.id}",
                    snippet=snippet,
                    badge=eq.patrimony or eq.equipment_type.upper(),
                    created_at=eq.created_at,
                    url_tab="equipment",
                    metadata={"status": eq.status, "type": eq.equipment_type},
                )
            )

    # 5. Maintenance Records
    if not entity_type or entity_type == "maintenance":
        m_query = db.query(MaintenanceRecord).filter(
            or_(
                MaintenanceRecord.title.ilike(term),
                MaintenanceRecord.description.ilike(term),
                MaintenanceRecord.procedure_performed.ilike(term),
                MaintenanceRecord.diagnosis.ilike(term),
            )
        )
        if store_id:
            m_query = m_query.filter(MaintenanceRecord.store_id == store_id)
        for m in m_query.limit(limit).all():
            snippet = m.procedure_performed or m.description or "Rotina de manutenção"
            if len(snippet) > 140:
                snippet = snippet[:140] + "..."
            results.append(
                SearchResultItem(
                    id=m.id,
                    entity_type="maintenance",
                    title=m.title,
                    snippet=snippet,
                    badge=m.maintenance_type.upper(),
                    created_at=m.created_at,
                    url_tab="maintenances",
                    metadata={"status": m.status, "priority": m.priority},
                )
            )

    # 6. Tasks
    if not entity_type or entity_type == "tasks":
        t_query = db.query(Task).filter(
            or_(
                Task.title.ilike(term),
                Task.description.ilike(term),
            )
        )
        for t in t_query.limit(limit).all():
            snippet = t.description or "Tarefa operacional"
            if len(snippet) > 140:
                snippet = snippet[:140] + "..."
            results.append(
                SearchResultItem(
                    id=t.id,
                    entity_type="task",
                    title=t.title,
                    snippet=snippet,
                    badge=t.priority.upper(),
                    created_at=t.created_at,
                    url_tab="tasks",
                    metadata={"status": t.status, "priority": t.priority},
                )
            )

    # Sort results with best relevance (exact matches first, then newest)
    results.sort(
        key=lambda r: (
            0 if clean_q.lower() in r.title.lower() else 1,
            -(r.created_at.timestamp() if r.created_at else 0),
        )
    )

    return GlobalSearchResponse(
        query=clean_q,
        total_results=len(results),
        results=results[:limit],
    )
