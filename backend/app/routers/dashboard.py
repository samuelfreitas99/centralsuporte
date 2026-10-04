"""Resumo do Início: contagens reais e alertas de início de turno, filtrados por permissão."""
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.auth import get_current_active_user
from app.database import get_db
from app.models import (
    Attendance,
    KnowledgeArticle,
    License,
    MaintenanceRecord,
    PurchaseRequest,
    Reminder,
    StockItem,
    Task,
    User,
)
from app.routers.tasks import visible_tasks_query
from app.schemas import DashboardSummaryResponse

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])

OPEN_TASK_STATUSES = ("pendente", "em_andamento")
OPEN_MAINTENANCE_STATUSES = ("agendada", "em_andamento")
LICENSE_WARNING_DAYS = 30
ALERT_LIST_LIMIT = 5


@router.get("/summary", response_model=DashboardSummaryResponse)
def get_dashboard_summary(
    tz_offset: int = Query(
        0,
        ge=-840,
        le=840,
        description="Diferença do fuso do navegador em minutos (Date.getTimezoneOffset()), para calcular 'hoje'.",
    ),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    now = datetime.now(timezone.utc)
    local_now = now - timedelta(minutes=tz_offset)
    day_start = (local_now.replace(hour=0, minute=0, second=0, microsecond=0) + timedelta(minutes=tz_offset))
    day_end = day_start + timedelta(days=1)

    summary: dict = {"generated_at": now}

    if current_user.has_permission("tasks:read"):
        open_tasks = visible_tasks_query(db, current_user).filter(Task.status.in_(OPEN_TASK_STATUSES))
        summary["tasks"] = {
            "pending": open_tasks.filter(Task.status == "pendente").count(),
            "in_progress": open_tasks.filter(Task.status == "em_andamento").count(),
            "overdue": open_tasks.filter(Task.due_date.isnot(None), Task.due_date < now).count(),
            "urgent": open_tasks.filter(Task.priority == "urgente").count(),
            "assigned_to_me": open_tasks.filter(Task.assigned_users.any(User.id == current_user.id)).count(),
        }

    if current_user.has_permission("attendance:read"):
        summary["attendances"] = {
            "open": db.query(Attendance).filter(Attendance.status == "em_andamento").count(),
            "mine_open": db.query(Attendance)
            .filter(Attendance.status == "em_andamento", Attendance.technician_id == current_user.id)
            .count(),
            "today": db.query(Attendance)
            .filter(Attendance.created_at >= day_start, Attendance.created_at < day_end)
            .count(),
        }

    if current_user.has_permission("maintenance:read"):
        open_maint = db.query(MaintenanceRecord).filter(MaintenanceRecord.status.in_(OPEN_MAINTENANCE_STATUSES))
        summary["maintenances"] = {
            "today": open_maint.filter(
                MaintenanceRecord.scheduled_date >= day_start, MaintenanceRecord.scheduled_date < day_end
            ).count(),
            "overdue": open_maint.filter(
                MaintenanceRecord.status == "agendada", MaintenanceRecord.scheduled_date < day_start
            ).count(),
            "next_7_days": open_maint.filter(
                MaintenanceRecord.scheduled_date >= day_end,
                MaintenanceRecord.scheduled_date < day_start + timedelta(days=8),
            ).count(),
        }

    if current_user.has_permission("equipment:read"):
        low_stock = (
            db.query(StockItem)
            .filter(StockItem.current_quantity <= StockItem.min_quantity)
            .order_by((StockItem.current_quantity - StockItem.min_quantity).asc(), StockItem.name)
        )
        summary["low_stock_total"] = low_stock.count()
        summary["low_stock"] = [
            {
                "id": i.id,
                "name": i.name,
                "current_quantity": i.current_quantity,
                "min_quantity": i.min_quantity,
                "unit": i.unit,
            }
            for i in low_stock.limit(ALERT_LIST_LIMIT).all()
        ]

        expiring = (
            db.query(License)
            .filter(
                License.status == "ativa",
                License.expiration_date.isnot(None),
                License.expiration_date < now + timedelta(days=LICENSE_WARNING_DAYS),
            )
            .order_by(License.expiration_date.asc())
        )
        summary["expiring_licenses_total"] = expiring.count()
        summary["expiring_licenses"] = [
            {
                "id": lic.id,
                "name": lic.name,
                "expiration_date": lic.expiration_date,
                "days_left": (lic.expiration_date - now).days,
            }
            for lic in expiring.limit(ALERT_LIST_LIMIT).all()
        ]

    summary["reminders_pending"] = (
        db.query(Reminder)
        .filter(Reminder.user_id == current_user.id, Reminder.status == "pendente", Reminder.remind_at < day_end)
        .count()
    )

    if current_user.has_permission("purchase:approve"):
        summary["purchases_pending_approval"] = (
            db.query(PurchaseRequest).filter(PurchaseRequest.status == "aguardando_aprovacao").count()
        )

    if current_user.has_permission("knowledge:read"):
        summary["knowledge_published"] = (
            db.query(func.count(KnowledgeArticle.id)).filter(KnowledgeArticle.status == "publicado").scalar()
        )

    return summary
