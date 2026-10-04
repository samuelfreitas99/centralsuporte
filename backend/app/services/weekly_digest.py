"""
Resumo semanal para gestores: o que aconteceu nos últimos 7 dias e o que pede atenção.

Usado por GET /reports/weekly (tela Relatórios) e pela automação, que na segunda-feira de manhã
entrega o resumo no sino (e por push) de cada gestor/administrador ativo.
"""
import os
from collections import Counter
from datetime import datetime, timedelta, timezone
from typing import Optional

from sqlalchemy import func, or_
from sqlalchemy.orm import Session, joinedload

from app.models import (
    Attendance,
    MaintenanceRecord,
    Permission,
    PurchaseRequest,
    Reminder,
    Role,
    StockItem,
    Task,
    User,
)

DIGEST_PREFIX = "Resumo da semana"


def local_offset() -> timedelta:
    """Fuso da operação (Brasil sem horário de verão = -3). Configurável por CENTRAL_UTC_OFFSET_HOURS."""
    try:
        return timedelta(hours=float(os.getenv("CENTRAL_UTC_OFFSET_HOURS", "-3")))
    except ValueError:
        return timedelta(hours=-3)


def build_weekly_digest(db: Session, now: Optional[datetime] = None) -> dict:
    now = now or datetime.now(timezone.utc)
    start = now - timedelta(days=7)

    attendances = (
        db.query(Attendance)
        .options(joinedload(Attendance.equipment))
        .filter(Attendance.created_at >= start)
        .all()
    )
    by_store = Counter(
        (a.equipment.store.name if a.equipment and a.equipment.store else None) or (a.store_department or "").split("/")[0].strip() or "Sem loja"
        for a in attendances
    )
    by_equipment = Counter(a.equipment_id for a in attendances if a.equipment_id)
    eq_names = {a.equipment_id: (a.equipment.hostname or a.equipment.patrimony or f"#{a.equipment_id}") for a in attendances if a.equipment}

    maint_done = (
        db.query(MaintenanceRecord)
        .filter(
            MaintenanceRecord.status == "concluida",
            func.coalesce(MaintenanceRecord.performed_date, MaintenanceRecord.updated_at) >= start,
        )
        .count()
    )
    overdue_tasks = (
        db.query(Task)
        .filter(Task.status.in_(["pendente", "em_andamento"]), Task.due_date.isnot(None), Task.due_date < now)
        .count()
    )
    pending_purchases = db.query(PurchaseRequest).filter(PurchaseRequest.status == "aguardando_aprovacao").count()
    low_stock = db.query(StockItem).filter(StockItem.current_quantity <= StockItem.min_quantity).count()

    return {
        "start": start,
        "end": now,
        "attendances_total": len(attendances),
        "attendances_resolved": sum(1 for a in attendances if a.status == "resolvido"),
        "attendances_open": sum(1 for a in attendances if a.status == "em_andamento"),
        "by_store": [{"name": n, "count": c} for n, c in by_store.most_common(5)],
        "top_equipment": [
            {"equipment_id": eid, "name": eq_names.get(eid, f"#{eid}"), "count": c}
            for eid, c in by_equipment.most_common(3)
            if c >= 2
        ],
        "maintenances_done": maint_done,
        "overdue_tasks": overdue_tasks,
        "pending_purchases": pending_purchases,
        "low_stock_items": low_stock,
    }


def digest_text(d: dict) -> str:
    lines = [
        f"Atendimentos: {d['attendances_total']} ({d['attendances_resolved']} resolvidos, {d['attendances_open']} em andamento).",
        f"Manutenções concluídas: {d['maintenances_done']}.",
    ]
    if d["by_store"]:
        lines.append("Lojas com mais atendimentos: " + ", ".join(f"{s['name']} ({s['count']})" for s in d["by_store"][:3]) + ".")
    if d["top_equipment"]:
        lines.append("Equipamentos que mais falharam: " + ", ".join(f"{e['name']} ({e['count']})" for e in d["top_equipment"]) + ".")
    attention = []
    if d["overdue_tasks"]:
        attention.append(f"{d['overdue_tasks']} tarefa(s) atrasada(s)")
    if d["pending_purchases"]:
        attention.append(f"{d['pending_purchases']} compra(s) aguardando aprovação")
    if d["low_stock_items"]:
        attention.append(f"{d['low_stock_items']} item(ns) com estoque baixo")
    if attention:
        lines.append("Pede atenção: " + "; ".join(attention) + ".")
    lines.append("Detalhes em Relatórios.")
    return "\n".join(lines)


def deliver_weekly_digest(db: Session, now: Optional[datetime] = None, force: bool = False) -> int:
    """Na segunda-feira a partir das 7h (hora local), entrega o resumo a gestores/administradores. Idempotente na semana."""
    now = now or datetime.now(timezone.utc)
    local = now + local_offset()
    if not force and (local.weekday() != 0 or local.hour < 7):
        return 0
    week_label = f"{DIGEST_PREFIX} ({(local - timedelta(days=7)).strftime('%d/%m')} a {local.strftime('%d/%m')})"
    managers = (
        db.query(User)
        .join(User.roles)
        .filter(
            User.is_active.is_(True),
            or_(Role.name.in_(["Administrador", "Gestor"]), Role.permissions.any(Permission.name == "purchase:approve")),
        )
        .distinct()
        .all()
    )
    if not managers:
        return 0
    digest = None
    created = 0
    for user in managers:
        already = (
            db.query(Reminder)
            .filter(Reminder.user_id == user.id, Reminder.title == week_label)
            .first()
        )
        if already:
            continue
        digest = digest or digest_text(build_weekly_digest(db, now))
        db.add(Reminder(title=week_label, description=digest, remind_at=now, user_id=user.id, priority="media", source="automacao"))
        created += 1
    if created:
        db.commit()
    return created
