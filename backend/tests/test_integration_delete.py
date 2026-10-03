import sys
import os

sys.path.append(os.path.dirname(__file__))

from app.database import SessionLocal
from app import models
from datetime import datetime, timezone

def test_integration():
    db = SessionLocal()
    
    # Get user 1 or create one
    user = db.query(models.User).first()
    if not user:
        print("No user found")
        return
        
    store = db.query(models.Store).first()
    if not store:
        print("No store found")
        return
        
    equipment = db.query(models.Equipment).first()
    if not equipment:
        print("No equipment found")
        return
        
    stock_item = db.query(models.StockItem).first()
    if not stock_item:
        print("No stock item found")
        return

    print(f"Using user {user.id}, store {store.id}, equipment {equipment.id}")

    try:
        # 1. Create project
        project = models.Project(
            title="Projeto Teste Integracao Audit",
            owner_id=user.id,
            status="planejado"
        )
        db.add(project)
        db.commit()
        db.refresh(project)
        project_id = project.id
        print(f"Created Project {project_id}")

        # 2. Create entities linked to project
        task = models.Task(title="Task Integ", creator_id=user.id, project_id=project_id)
        
        # Need to create attendance before maintenance if we link it? No, attendance is independent
        attendance = models.Attendance(title="Attendance Integ", technician_id=user.id, project_id=project_id)
        db.add(attendance)
        db.commit()
        db.refresh(attendance)
        
        maintenance = models.MaintenanceRecord(
            title="Maintenance Integ", equipment_id=equipment.id, project_id=project_id,
            maintenance_type="preventiva", status="agendada", priority="media"
        )
        
        checklist = models.Checklist(title="Checklist Integ", creator_id=user.id, project_id=project_id)
        
        calendar = models.CalendarEvent(
            title="Calendar Integ", start_time=datetime.now(timezone.utc), 
            end_time=datetime.now(timezone.utc), user_id=user.id, project_id=project_id
        )
        
        stock_mov = models.StockMovement(
            stock_item_id=stock_item.id, user_id=user.id, movement_type="entrada", quantity=10, project_id=project_id
        )
        
        db.add_all([task, maintenance, checklist, calendar, stock_mov])
        
        # Link equipment to project (N:N)
        project.equipment_list.append(equipment)
        
        db.commit()
        
        # Refresh all to get IDs
        db.refresh(task)
        db.refresh(maintenance)
        db.refresh(checklist)
        db.refresh(calendar)
        db.refresh(stock_mov)
        
        task_id = task.id
        maintenance_id = maintenance.id
        checklist_id = checklist.id
        calendar_id = calendar.id
        stock_mov_id = stock_mov.id
        attendance_id = attendance.id
        eq_id = equipment.id
        
        print(f"Created Entities: Task {task_id}, Maint {maintenance_id}, Check {checklist_id}, Cal {calendar_id}, Stock {stock_mov_id}, Att {attendance_id}")
        
        # 3. Delete Project
        print("Deleting project...")
        db.delete(project)
        db.commit()
        
        # 4. Confirm entities exist and project_id is NULL
        task_after = db.query(models.Task).filter_by(id=task_id).first()
        maint_after = db.query(models.MaintenanceRecord).filter_by(id=maintenance_id).first()
        check_after = db.query(models.Checklist).filter_by(id=checklist_id).first()
        cal_after = db.query(models.CalendarEvent).filter_by(id=calendar_id).first()
        stock_after = db.query(models.StockMovement).filter_by(id=stock_mov_id).first()
        att_after = db.query(models.Attendance).filter_by(id=attendance_id).first()
        eq_after = db.query(models.Equipment).filter_by(id=eq_id).first()
        
        assert task_after is not None, "Task was deleted!"
        assert task_after.project_id is None, "Task project_id is not NULL"
        
        assert maint_after is not None, "Maintenance was deleted!"
        assert maint_after.project_id is None, "Maintenance project_id is not NULL"
        
        assert check_after is not None, "Checklist was deleted!"
        assert check_after.project_id is None, "Checklist project_id is not NULL"
        
        assert cal_after is not None, "CalendarEvent was deleted!"
        assert cal_after.project_id is None, "Calendar project_id is not NULL"
        
        assert stock_after is not None, "StockMovement was deleted!"
        assert stock_after.project_id is None, "StockMovement project_id is not NULL"
        
        assert att_after is not None, "Attendance was deleted!"
        assert att_after.project_id is None, "Attendance project_id is not NULL"
        
        assert eq_after is not None, "Equipment was deleted!"
        
        # also verify project_equipment association is gone
        assoc = db.query(models.project_equipment).filter_by(project_id=project_id, equipment_id=eq_id).first()
        assert assoc is None, "Equipment association still exists!"
        
        print("SUCCESS: Preserve Data confirmed for all entities. project_id is NULL for all.")
        
    except Exception as e:
        print(f"FAILED: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    test_integration()
