import io
import csv
from datetime import datetime, timedelta, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, Query, Response
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.database import get_db
from app.models import (
    Attendance,
    MaintenanceRecord,
    Equipment,
    User,
    Store,
)
from app.schemas import (
    OperationalSummaryReport,
    RecurrentEquipmentIssue,
    TechnicianPerformanceMetric,
    WeeklyDigestResponse,
)
from app.services.weekly_digest import build_weekly_digest
from app.auth import get_current_active_user

router = APIRouter(prefix="/reports", tags=["reports"])


@router.get("/summary", response_model=OperationalSummaryReport)
def get_operational_summary(
    days: int = Query(30, ge=1, le=365, description="Período em dias para consolidação"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """
    Get consolidated operational metrics for support tickets, preventive/corrective routines,
    recurrent hardware issues, and technician productivity.
    """
    cutoff = datetime.now(timezone.utc) - timedelta(days=days)

    # 1. Attendance Metrics
    att_query = db.query(Attendance).filter(Attendance.created_at >= cutoff)
    attendances_total = att_query.count()
    attendances_resolved = att_query.filter(Attendance.status == "resolvido").count()
    attendances_in_progress = att_query.filter(Attendance.status == "em_andamento").count()

    resolution_rate = (
        round((attendances_resolved / attendances_total) * 100, 1)
        if attendances_total > 0
        else 0.0
    )

    # 2. Maintenance Metrics
    maint_query = db.query(MaintenanceRecord).filter(MaintenanceRecord.created_at >= cutoff)
    maintenances_total = maint_query.count()
    maintenances_preventive = maint_query.filter(MaintenanceRecord.maintenance_type == "preventiva").count()
    maintenances_corrective = maint_query.filter(MaintenanceRecord.maintenance_type == "corretiva").count()

    cost_sum = db.query(func.sum(MaintenanceRecord.cost)).filter(
        MaintenanceRecord.created_at >= cutoff,
        MaintenanceRecord.cost.isnot(None),
    ).scalar()
    maintenances_total_cost = float(cost_sum) if cost_sum else 0.0

    # 3. Recurrent Equipment Issues
    # Count attendances per equipment
    att_eq_counts = (
        db.query(Attendance.equipment_id, func.count(Attendance.id).label("count"))
        .filter(Attendance.equipment_id.isnot(None), Attendance.created_at >= cutoff)
        .group_by(Attendance.equipment_id)
        .all()
    )
    att_map = {row[0]: row[1] for row in att_eq_counts}

    # Count maintenances per equipment
    maint_eq_counts = (
        db.query(MaintenanceRecord.equipment_id, func.count(MaintenanceRecord.id).label("count"))
        .filter(MaintenanceRecord.equipment_id.isnot(None), MaintenanceRecord.created_at >= cutoff)
        .group_by(MaintenanceRecord.equipment_id)
        .all()
    )
    maint_map = {row[0]: row[1] for row in maint_eq_counts}

    all_eq_ids = set(att_map.keys()) | set(maint_map.keys())
    recurrent_items: List[RecurrentEquipmentIssue] = []

    if all_eq_ids:
        equipments = db.query(Equipment).filter(Equipment.id.in_(all_eq_ids)).all()
        for eq in equipments:
            a_count = att_map.get(eq.id, 0)
            m_count = maint_map.get(eq.id, 0)
            recurrent_items.append(
                RecurrentEquipmentIssue(
                    equipment_id=eq.id,
                    hostname=eq.hostname,
                    patrimony=eq.patrimony,
                    store_name=eq.store.name if eq.store else None,
                    total_incidents=a_count + m_count,
                    attendances_count=a_count,
                    maintenances_count=m_count,
                )
            )

    recurrent_items.sort(key=lambda x: x.total_incidents, reverse=True)

    # 4. Technician Productivity
    att_tech_counts = (
        db.query(Attendance.technician_id, func.count(Attendance.id))
        .filter(Attendance.technician_id.isnot(None), Attendance.created_at >= cutoff)
        .group_by(Attendance.technician_id)
        .all()
    )
    att_tech_map = {row[0]: row[1] for row in att_tech_counts}

    maint_tech_counts = (
        db.query(MaintenanceRecord.technician_id, func.count(MaintenanceRecord.id))
        .filter(MaintenanceRecord.technician_id.isnot(None), MaintenanceRecord.created_at >= cutoff)
        .group_by(MaintenanceRecord.technician_id)
        .all()
    )
    maint_tech_map = {row[0]: row[1] for row in maint_tech_counts}

    all_tech_ids = set(att_tech_map.keys()) | set(maint_tech_map.keys())
    tech_metrics: List[TechnicianPerformanceMetric] = []

    if all_tech_ids:
        users = db.query(User).filter(User.id.in_(all_tech_ids)).all()
        for u in users:
            a_cnt = att_tech_map.get(u.id, 0)
            m_cnt = maint_tech_map.get(u.id, 0)
            tech_metrics.append(
                TechnicianPerformanceMetric(
                    technician_id=u.id,
                    username=u.username,
                    attendances_count=a_cnt,
                    maintenances_count=m_cnt,
                    total_actions=a_cnt + m_cnt,
                )
            )

    tech_metrics.sort(key=lambda x: x.total_actions, reverse=True)

    return OperationalSummaryReport(
        period_days=days,
        attendances_total=attendances_total,
        attendances_resolved=attendances_resolved,
        attendances_in_progress=attendances_in_progress,
        resolution_rate=resolution_rate,
        maintenances_total=maintenances_total,
        maintenances_preventive=maintenances_preventive,
        maintenances_corrective=maintenances_corrective,
        maintenances_total_cost=maintenances_total_cost,
        recurrent_equipment=recurrent_items[:10],
        top_technicians=tech_metrics[:10],
    )


@router.get("/weekly", response_model=WeeklyDigestResponse)
def get_weekly_digest(db: Session = Depends(get_db), current_user: User = Depends(get_current_active_user)):
    """Resumo dos últimos 7 dias (o mesmo entregue aos gestores na segunda-feira)."""
    return build_weekly_digest(db)


@router.get("/export")
def export_operational_csv(
    days: int = Query(30, ge=1, le=365),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """
    Export operational incident and maintenance history as downloadable CSV.
    """
    cutoff = datetime.now(timezone.utc) - timedelta(days=days)
    attendances = (
        db.query(Attendance)
        .filter(Attendance.created_at >= cutoff)
        .order_by(Attendance.created_at.desc())
        .all()
    )

    output = io.StringIO()
    writer = csv.writer(output, delimiter=";", quoting=csv.QUOTE_MINIMAL)
    writer.writerow([
        "ID",
        "Tipo",
        "Título",
        "Chamado OTRS",
        "Status",
        "Equipamento",
        "Técnico",
        "Data Criação",
    ])

    for a in attendances:
        writer.writerow([
            a.id,
            "Atendimento",
            a.title,
            a.otrs_ticket or "",
            a.status,
            a.equipment_name or "",
            a.technician.username if a.technician else "",
            a.created_at.strftime("%d/%m/%Y %H:%M") if a.created_at else "",
        ])

    csv_content = output.getvalue()
    filename = f"relatorio_operacional_{days}d_{datetime.now().strftime('%Y%m%d')}.csv"

    return Response(
        content=csv_content,
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
