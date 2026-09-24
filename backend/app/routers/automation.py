from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import User
from app.auth import get_current_active_user, require_permission
from app.schemas import (
    AutomationRuleItem,
    AutomationTriggerResponse,
    AutomationStatusResponse,
)
from app.services.automation import (
    run_automation_rules,
    get_automation_status,
    get_automation_rules_catalog,
)

router = APIRouter(prefix="/automation", tags=["Automação e Regras Reativas"])


@router.get("/status", response_model=AutomationStatusResponse)
def get_status(current_user: User = Depends(get_current_active_user)):
    """
    Retorna o status em tempo real do agendador e estatísticas da última execução.
    """
    return get_automation_status()


@router.get("/rules", response_model=List[AutomationRuleItem])
def get_rules(current_user: User = Depends(get_current_active_user)):
    """
    Retorna as regras automáticas ativas no sistema.
    """
    return get_automation_rules_catalog()


@router.post("/trigger", response_model=AutomationTriggerResponse)
def trigger_rules(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("tasks:write")),
):
    """
    Executa imediatamente a avaliação de todas as regras reativas sob demanda
    (alertas de tarefas vencidas, manutenções preventivas e equipamentos críticos).
    """
    stats = run_automation_rules(db, triggered_by_user=current_user)
    return stats
