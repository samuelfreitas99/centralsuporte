from datetime import datetime
from sqlalchemy import Column, Integer, String, Boolean, ForeignKey, Table, DateTime, Text
from sqlalchemy.orm import relationship
from app.database import Base

# Association table for many-to-many relationship between Role and Permission
role_permissions = Table(
    'role_permissions',
    Base.metadata,
    Column('role_id', Integer, ForeignKey('roles.id', ondelete="CASCADE"), primary_key=True),
    Column('permission_id', Integer, ForeignKey('permissions.id', ondelete="CASCADE"), primary_key=True)
)

# Association table for many-to-many relationship between Task and User (assigned users)
task_assignments = Table(
    'task_assignments',
    Base.metadata,
    Column('task_id', Integer, ForeignKey('tasks.id', ondelete="CASCADE"), primary_key=True),
    Column('user_id', Integer, ForeignKey('users.id', ondelete="CASCADE"), primary_key=True),
    Column('assigned_at', DateTime(timezone=True), default=datetime.utcnow, nullable=False)
)

class Permission(Base):
    __tablename__ = "permissions"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(50), unique=True, index=True, nullable=False)
    description = Column(String(255))
    
    roles = relationship("Role", secondary=role_permissions, back_populates="permissions")

class Role(Base):
    __tablename__ = "roles"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(50), unique=True, index=True, nullable=False)
    description = Column(String(255))
    
    permissions = relationship("Permission", secondary=role_permissions, back_populates="roles")
    users = relationship("User", back_populates="role")

class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, index=True, nullable=False)
    email = Column(String(100), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    is_active = Column(Boolean, default=True)
    
    role_id = Column(Integer, ForeignKey('roles.id'))
    role = relationship("Role", back_populates="users")

    # Relationships for Phase 4 (Organization)
    created_tasks = relationship("Task", foreign_keys="Task.creator_id", back_populates="creator")
    assigned_tasks = relationship("Task", secondary=task_assignments, back_populates="assigned_users")
    created_checklists = relationship("Checklist", back_populates="creator")
    reminders = relationship("Reminder", back_populates="user")
    calendar_events = relationship("CalendarEvent", back_populates="user")

class Task(Base):
    __tablename__ = "tasks"
    
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(255), nullable=False, index=True)
    description = Column(Text, nullable=True)
    creator_id = Column(Integer, ForeignKey('users.id', ondelete="RESTRICT"), nullable=False)
    priority = Column(String(20), default="media", nullable=False)  # baixa, media, alta, urgente
    status = Column(String(20), default="pendente", nullable=False)  # pendente, em_andamento, concluida, cancelada
    due_date = Column(DateTime(timezone=True), nullable=True)
    completed_at = Column(DateTime(timezone=True), nullable=True)
    visibility = Column(String(20), default="equipe", nullable=False)  # privado, equipe, todos
    category = Column(String(50), nullable=True)
    otrs_reference = Column(String(100), nullable=True)  # Referência complementar ao OTRS (número ou link)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    
    # Relationships
    creator = relationship("User", foreign_keys=[creator_id], back_populates="created_tasks")
    assigned_users = relationship("User", secondary=task_assignments, back_populates="assigned_tasks")
    checklists = relationship("Checklist", back_populates="task", cascade="all, delete-orphan")
    reminders = relationship("Reminder", back_populates="task", cascade="all, delete-orphan")

class Checklist(Base):
    __tablename__ = "checklists"
    
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(255), nullable=False)
    description = Column(String(500), nullable=True)
    task_id = Column(Integer, ForeignKey('tasks.id', ondelete="CASCADE"), nullable=True)
    creator_id = Column(Integer, ForeignKey('users.id', ondelete="RESTRICT"), nullable=False)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)
    
    # Relationships
    task = relationship("Task", back_populates="checklists")
    creator = relationship("User", back_populates="created_checklists")
    items = relationship("ChecklistItem", back_populates="checklist", cascade="all, delete-orphan", order_by="ChecklistItem.position")

class ChecklistItem(Base):
    __tablename__ = "checklist_items"
    
    id = Column(Integer, primary_key=True, index=True)
    checklist_id = Column(Integer, ForeignKey('checklists.id', ondelete="CASCADE"), nullable=False)
    title = Column(String(255), nullable=False)
    is_completed = Column(Boolean, default=False, nullable=False)
    position = Column(Integer, default=0, nullable=False)
    completed_at = Column(DateTime(timezone=True), nullable=True)
    completed_by_id = Column(Integer, ForeignKey('users.id', ondelete="SET NULL"), nullable=True)
    
    # Relationships
    checklist = relationship("Checklist", back_populates="items")
    completed_by = relationship("User", foreign_keys=[completed_by_id])

class Reminder(Base):
    __tablename__ = "reminders"
    
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    remind_at = Column(DateTime(timezone=True), nullable=False)
    user_id = Column(Integer, ForeignKey('users.id', ondelete="CASCADE"), nullable=False)
    priority = Column(String(20), default="media", nullable=False)  # baixa, media, alta, urgente
    status = Column(String(20), default="pendente", nullable=False)  # pendente, concluido, dispensado
    task_id = Column(Integer, ForeignKey('tasks.id', ondelete="CASCADE"), nullable=True)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)
    
    # Relationships
    user = relationship("User", back_populates="reminders")
    task = relationship("Task", back_populates="reminders")

class CalendarEvent(Base):
    __tablename__ = "calendar_events"
    
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    start_time = Column(DateTime(timezone=True), nullable=False)
    end_time = Column(DateTime(timezone=True), nullable=False)
    event_type = Column(String(50), default="atividade", nullable=False)  # atividade, manutencao, compromisso, lembrete, escala
    user_id = Column(Integer, ForeignKey('users.id', ondelete="CASCADE"), nullable=False)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)
    
    # Relationships
    user = relationship("User", back_populates="calendar_events")
