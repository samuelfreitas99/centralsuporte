from datetime import datetime, timedelta, timezone
import pytest
from app.database import SessionLocal
from app.models import (
    User,
    Task,
    Checklist,
    ChecklistItem,
    Reminder,
    CalendarEvent,
)

@pytest.fixture(scope="module")
def db_session():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def test_task_creation_and_relationships(db_session):
    admin = db_session.query(User).filter(User.username == "admin").first()
    assert admin is not None

    # Create a task
    task = Task(
        title="Verificar switch central",
        description="Checar portas e conexões de fibra no rack principal",
        creator_id=admin.id,
        priority="alta",
        status="pendente",
        due_date=datetime.now(timezone.utc) + timedelta(days=1),
        visibility="equipe",
        category="Redes",
        otrs_reference="Ticket#20260924001"
    )
    task.assigned_users.append(admin)
    db_session.add(task)
    db_session.commit()
    db_session.refresh(task)

    assert task.id is not None
    assert task.title == "Verificar switch central"
    assert task.creator.username == "admin"
    assert len(task.assigned_users) == 1
    assert task.assigned_users[0].username == "admin"
    assert task.otrs_reference == "Ticket#20260924001"

    # Add a checklist with items
    checklist = Checklist(
        title="Checklist de Inspeção Física",
        task_id=task.id,
        creator_id=admin.id
    )
    item1 = ChecklistItem(title="Verificar LEDs de status", position=1)
    item2 = ChecklistItem(title="Testar porta SFP+", position=2)
    checklist.items.extend([item1, item2])
    db_session.add(checklist)
    db_session.commit()
    db_session.refresh(checklist)

    assert checklist.id is not None
    assert len(checklist.items) == 2
    assert checklist.items[0].title == "Verificar LEDs de status"
    assert checklist.items[0].is_completed is False

    # Mark item as completed
    item1.is_completed = True
    item1.completed_at = datetime.now(timezone.utc)
    item1.completed_by_id = admin.id
    db_session.commit()
    db_session.refresh(item1)
    assert item1.is_completed is True
    assert item1.completed_by.username == "admin"

    # Add a reminder
    reminder = Reminder(
        title="Lembrar de comprar cabos DAC",
        description="Faltam 2 cabos DAC de 1m",
        remind_at=datetime.now(timezone.utc) + timedelta(hours=4),
        user_id=admin.id,
        priority="media",
        status="pendente",
        task_id=task.id
    )
    db_session.add(reminder)
    db_session.commit()
    db_session.refresh(reminder)
    assert reminder.id is not None
    assert reminder.task.id == task.id
    assert reminder.user.username == "admin"

    # Add a calendar event
    event = CalendarEvent(
        title="Janela de Manutenção Switch",
        description="Reinicialização programada do switch do core",
        start_time=datetime.now(timezone.utc) + timedelta(days=2),
        end_time=datetime.now(timezone.utc) + timedelta(days=2, hours=1),
        event_type="manutencao",
        user_id=admin.id
    )
    db_session.add(event)
    db_session.commit()
    db_session.refresh(event)
    assert event.id is not None
    assert event.user.username == "admin"

    # Cleanup test entities
    db_session.delete(event)
    db_session.delete(reminder)
    db_session.delete(checklist)
    db_session.delete(task)
    db_session.commit()
