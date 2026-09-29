import asyncio
import logging
from datetime import datetime, timedelta, timezone
from typing import Optional, Dict, Any, List
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_, func

from app.database import SessionLocal
from app.models import Task, Reminder, MaintenanceRecord, Equipment, User, Role
from app.services.audit import record_audit_log

logger = logging.getLogger(__name__)


def to_utc(dt: Optional[datetime]) -> Optional[datetime]:
    """Ensures datetime is timezone-aware in UTC."""
    if dt is None:
        return None
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc)


# In-memory automation state
_automation_state = {
    "status": "stopped",
    "interval_minutes": 60,
    "last_run_at": None,
    "run_count": 0,
    "last_stats": {},
}

_stop_event = asyncio.Event()
_scheduler_task: Optional[asyncio.Task] = None


def get_automation_rules_catalog() -> List[Dict[str, Any]]:
    """Returns the descriptive list of internal reactive rules."""
    return [
        {
            "id": "task_due_alerts",
            "name": "Alertas de Prazos de Tarefas",
            "description": "Monitora tarefas ativas que vencem nas próximas 24 horas ou estão atrasadas, gerando lembretes de prioridade alta/urgente aos técnicos responsáveis.",
            "category": "tarefas",
            "frequency": "A cada 60 minutos",
            "is_active": True,
        },
        {
            "id": "maintenance_scheduled_alerts",
            "name": "Lembretes de Manutenções Preventivas",
            "description": "Verifica ordens de manutenção agendadas para os próximos 3 dias e notifica o analista designado.",
            "category": "manutencao",
            "frequency": "A cada 60 minutos",
            "is_active": True,
        },
        {
            "id": "critical_equipment_alerts",
            "name": "Detecção Reativa de Equipamentos Crônicos",
            "description": "Identifica ativos com recorrência de falhas ou manutenções (>= 3 eventos em 30 dias) e gera alertas operacionais preventivos.",
            "category": "equipamentos",
            "frequency": "A cada 60 minutos",
            "is_active": True,
        },
    ]


def run_automation_rules(db: Session, triggered_by_user: Optional[User] = None) -> Dict[str, Any]:
    """
    Executes all internal automation rules reactively:
    1. Task due date warnings (due within 24h or overdue).
    2. Scheduled maintenance warnings (within next 3 days).
    3. Critical equipment detection alerts.
    """
    now = datetime.now(timezone.utc)
    stats = {
        "executed_at": now.isoformat(),
        "tasks_evaluated": 0,
        "task_reminders_created": 0,
        "maintenances_evaluated": 0,
        "maintenance_reminders_created": 0,
        "equipment_alerts_created": 0,
        "total_created": 0,
    }

    try:
        # --- RULE 1: Task Due Dates ---
        due_threshold = now + timedelta(hours=24)
        active_tasks = (
            db.query(Task)
            .filter(
                and_(
                    Task.status.notin_(["concluida", "cancelada"]),
                    Task.due_date != None,
                    Task.due_date <= due_threshold,
                )
            )
            .all()
        )
        stats["tasks_evaluated"] = len(active_tasks)

        for task in active_tasks:
            task_due_utc = to_utc(task.due_date)
            is_overdue = task_due_utc < now if task_due_utc else False
            target_priority = "urgente" if is_overdue else "alta"
            title_prefix = "🚨 Tarefa Atrasada:" if is_overdue else "⏰ Prazo Próximo:"
            reminder_title = f"{title_prefix} {task.title}"

            # Technicians assigned to this task (or creator if none assigned)
            target_users = task.assigned_users if task.assigned_users else ([task.creator] if task.creator else [])

            for user in target_users:
                # Check for existing pending reminder within last 24h
                existing = (
                    db.query(Reminder)
                    .filter(
                        and_(
                            Reminder.task_id == task.id,
                            Reminder.user_id == user.id,
                            Reminder.status == "pendente",
                            Reminder.created_at >= now - timedelta(hours=24),
                        )
                    )
                    .first()
                )

                if not existing:
                    due_str = task_due_utc.strftime('%d/%m/%Y %H:%M') if task_due_utc else 'Em breve'
                    new_reminder = Reminder(
                        title=reminder_title,
                        description=f"Tarefa '{task.title}' com vencimento em {due_str}.",
                        remind_at=now,
                        user_id=user.id,
                        priority=target_priority,
                        status="pendente",
                        task_id=task.id,
                    )
                    db.add(new_reminder)
                    stats["task_reminders_created"] += 1
                    stats["total_created"] += 1

        # --- RULE 2: Scheduled Maintenances ---
        maint_window = now + timedelta(days=3)
        all_scheduled_maintenances = (
            db.query(MaintenanceRecord)
            .filter(
                and_(
                    MaintenanceRecord.status == "agendada",
                    MaintenanceRecord.scheduled_date != None,
                )
            )
            .all()
        )

        filtered_maintenances = []
        for maint in all_scheduled_maintenances:
            maint_date_utc = to_utc(maint.scheduled_date)
            if maint_date_utc and (now - timedelta(hours=6)) <= maint_date_utc <= maint_window:
                filtered_maintenances.append((maint, maint_date_utc))

        stats["maintenances_evaluated"] = len(filtered_maintenances)

        for maint, maint_date_utc in filtered_maintenances:
            if maint.technician_id:
                maint_title = f"🔧 Manutenção Programada: {maint.title}"
                existing_maint_rem = (
                    db.query(Reminder)
                    .filter(
                        and_(
                            Reminder.user_id == maint.technician_id,
                            Reminder.title == maint_title,
                            Reminder.status == "pendente",
                            Reminder.created_at >= now - timedelta(days=2),
                        )
                    )
                    .first()
                )
                if not existing_maint_rem:
                    maint_date_str = (
                        maint_date_utc.strftime("%d/%m/%Y %H:%M")
                        if maint_date_utc
                        else "Em breve"
                    )
                    new_reminder = Reminder(
                        title=maint_title,
                        description=f"Manutenção do ativo #{maint.equipment_id} programada para {maint_date_str}.",
                        remind_at=now,
                        user_id=maint.technician_id,
                        priority="alta",
                        status="pendente",
                    )
                    db.add(new_reminder)
                    stats["maintenance_reminders_created"] += 1
                    stats["total_created"] += 1

        # --- RULE 3: Equipment Recurring Incidents Alerts ---
        # Find active equipment with >= 3 maintenance records
        recurrent_equipment = (
            db.query(
                MaintenanceRecord.equipment_id,
                func.count(MaintenanceRecord.id).label("total_maint"),
            )
            .filter(MaintenanceRecord.created_at >= now - timedelta(days=30))
            .group_by(MaintenanceRecord.equipment_id)
            .having(func.count(MaintenanceRecord.id) >= 3)
            .all()
        )

        if recurrent_equipment:
            admin_users = (
                db.query(User)
                .join(User.roles)
                .filter(Role.name.in_(["Administrador", "Gestor"]))
                .all()
            )
            for eq_id, count in recurrent_equipment:
                eq = db.query(Equipment).filter(Equipment.id == eq_id).first()
                hostname = eq.hostname if eq else f"ID #{eq_id}"
                alert_title = f"⚠️ Ativo Crítico: {hostname} ({count} intervenções)"

                for admin in admin_users:
                    existing_alert = (
                        db.query(Reminder)
                        .filter(
                            and_(
                                Reminder.user_id == admin.id,
                                Reminder.title == alert_title,
                                Reminder.created_at >= now - timedelta(days=7),
                            )
                        )
                        .first()
                    )
                    if not existing_alert:
                        alert_rem = Reminder(
                            title=alert_title,
                            description=f"Equipamento {hostname} concentrou {count} intervenções nos últimos 30 dias. Recomendada vistoria técnica.",
                            remind_at=now,
                            user_id=admin.id,
                            priority="urgente",
                            status="pendente",
                        )
                        db.add(alert_rem)
                        stats["equipment_alerts_created"] += 1
                        stats["total_created"] += 1

        db.commit()

        # Audit trail
        record_audit_log(
            db=db,
            action="AUTOMATION_RUN",
            entity_type="system",
            user=triggered_by_user,
            details=stats,
        )
        db.commit()

    except Exception as e:
        db.rollback()
        logger.error(f"Erro ao executar regras de automação: {e}", exc_info=True)
        stats["error"] = str(e)

    # Update in-memory state
    _automation_state["last_run_at"] = now.isoformat()
    _automation_state["run_count"] += 1
    _automation_state["last_stats"] = stats

    return stats


def get_automation_status() -> Dict[str, Any]:
    """Returns current runtime status and statistics of the automation scheduler."""
    return {
        "status": _automation_state["status"],
        "interval_minutes": _automation_state["interval_minutes"],
        "last_run_at": _automation_state["last_run_at"],
        "run_count": _automation_state["run_count"],
        "last_stats": _automation_state["last_stats"],
        "active_rules_count": len(get_automation_rules_catalog()),
    }


async def _background_scheduler_loop():
    """Lightweight background loop that fires automation rules periodically."""
    logger.info("Iniciando scheduler de automação em segundo plano...")
    _automation_state["status"] = "running"

    while not _stop_event.is_set():
        try:
            db = SessionLocal()
            try:
                run_automation_rules(db)
            finally:
                db.close()
        except Exception as e:
            logger.error(f"Erro no loop do scheduler de automação: {e}")

        # Sleep interval or exit on stop_event
        try:
            await asyncio.wait_for(
                _stop_event.wait(),
                timeout=_automation_state["interval_minutes"] * 60,
            )
            break
        except asyncio.TimeoutError:
            pass


def start_automation_scheduler(interval_minutes: int = 60):
    """Starts the background scheduler task."""
    global _scheduler_task
    _stop_event.clear()
    _automation_state["interval_minutes"] = interval_minutes
    if _scheduler_task is None or _scheduler_task.done():
        try:
            loop = asyncio.get_running_loop()
            _scheduler_task = loop.create_task(_background_scheduler_loop())
        except RuntimeError:
            # When outside running loop (e.g. during sync tests)
            _automation_state["status"] = "ready"


def stop_automation_scheduler():
    """Signals the background scheduler task to gracefully stop."""
    global _scheduler_task
    _stop_event.set()
    _automation_state["status"] = "stopped"
    if _scheduler_task and not _scheduler_task.done():
        _scheduler_task.cancel()
        _scheduler_task = None
