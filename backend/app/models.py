from datetime import datetime
from sqlalchemy import Column, Integer, String, Boolean, ForeignKey, Table, DateTime, Text, Float, desc
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

# Association table for many-to-many relationship between KnowledgeArticle and KnowledgeTag
article_tags = Table(
    'article_tags',
    Base.metadata,
    Column('article_id', Integer, ForeignKey('knowledge_articles.id', ondelete="CASCADE"), primary_key=True),
    Column('tag_id', Integer, ForeignKey('knowledge_tags.id', ondelete="CASCADE"), primary_key=True)
)

# Association table for many-to-many relationship between User and KnowledgeArticle (favorites)
article_favorites = Table(
    'article_favorites',
    Base.metadata,
    Column('user_id', Integer, ForeignKey('users.id', ondelete="CASCADE"), primary_key=True),
    Column('article_id', Integer, ForeignKey('knowledge_articles.id', ondelete="CASCADE"), primary_key=True),
    Column('created_at', DateTime(timezone=True), default=datetime.utcnow, nullable=False)
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

    # Relationships for Phase 5 (Knowledge)
    authored_articles = relationship("KnowledgeArticle", foreign_keys="KnowledgeArticle.author_id", back_populates="author")
    favorite_articles = relationship("KnowledgeArticle", secondary=article_favorites, back_populates="favorited_by")

    # Relationships for Phase 6 (Commands & Standard Responses)
    authored_commands = relationship("Command", foreign_keys="Command.author_id", back_populates="author")
    authored_responses = relationship("StandardResponse", foreign_keys="StandardResponse.author_id", back_populates="author")

    # Relationships for Phase 7 (Attendances)
    attendances = relationship("Attendance", foreign_keys="Attendance.technician_id", back_populates="technician")
    attendance_notes = relationship("AttendanceNote", foreign_keys="AttendanceNote.author_id", back_populates="author")

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

# --- Phase 5 (Knowledge Base) Models ---

class KnowledgeCategory(Base):
    __tablename__ = "knowledge_categories"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), unique=True, index=True, nullable=False)
    description = Column(String(255), nullable=True)
    color = Column(String(20), default="#3b82f6", nullable=False)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)
    
    # Relationships
    articles = relationship("KnowledgeArticle", back_populates="category")

class KnowledgeTag(Base):
    __tablename__ = "knowledge_tags"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(50), unique=True, index=True, nullable=False)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)
    
    # Relationships
    articles = relationship("KnowledgeArticle", secondary=article_tags, back_populates="tags")

class KnowledgeArticle(Base):
    __tablename__ = "knowledge_articles"
    
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(255), nullable=False, index=True)
    summary = Column(String(500), nullable=True)
    content = Column(Text, nullable=False)
    problem = Column(Text, nullable=True)
    solution = Column(Text, nullable=True)
    commands = Column(Text, nullable=True)
    category_id = Column(Integer, ForeignKey('knowledge_categories.id', ondelete="SET NULL"), nullable=True)
    author_id = Column(Integer, ForeignKey('users.id', ondelete="RESTRICT"), nullable=False)
    status = Column(String(20), default="rascunho", nullable=False)  # rascunho, publicado, arquivado
    visibility = Column(String(20), default="equipe", nullable=False)  # privado, equipe, todos
    views_count = Column(Integer, default=0, nullable=False)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    
    # Relationships
    category = relationship("KnowledgeCategory", back_populates="articles")
    author = relationship("User", foreign_keys=[author_id], back_populates="authored_articles")
    tags = relationship("KnowledgeTag", secondary=article_tags, back_populates="articles")
    versions = relationship("KnowledgeVersion", back_populates="article", cascade="all, delete-orphan", order_by="desc(KnowledgeVersion.version_number)")
    favorited_by = relationship("User", secondary=article_favorites, back_populates="favorite_articles")

class KnowledgeVersion(Base):
    __tablename__ = "knowledge_versions"
    
    id = Column(Integer, primary_key=True, index=True)
    article_id = Column(Integer, ForeignKey('knowledge_articles.id', ondelete="CASCADE"), nullable=False)
    version_number = Column(Integer, nullable=False)
    title = Column(String(255), nullable=False)
    content = Column(Text, nullable=False)
    change_summary = Column(String(255), nullable=True)
    editor_id = Column(Integer, ForeignKey('users.id', ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)
    
    # Relationships
    article = relationship("KnowledgeArticle", back_populates="versions")
    editor = relationship("User", foreign_keys=[editor_id])

class Command(Base):
    __tablename__ = "commands"
    
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(255), nullable=False, index=True)
    description = Column(Text, nullable=True)
    command = Column(Text, nullable=False)
    system = Column(String(50), nullable=False, default="Geral", index=True)
    category = Column(String(100), nullable=True, index=True)
    tags = Column(String(255), nullable=True)
    notes = Column(Text, nullable=True)
    warning = Column(Text, nullable=True)
    author_id = Column(Integer, ForeignKey('users.id', ondelete="RESTRICT"), nullable=False)
    visibility = Column(String(20), default="equipe", nullable=False)  # privado, equipe, todos
    copies_count = Column(Integer, default=0, nullable=False)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    
    # Relationships
    author = relationship("User", foreign_keys=[author_id], back_populates="authored_commands")

class StandardResponse(Base):
    __tablename__ = "standard_responses"
    
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(255), nullable=False, index=True)
    content = Column(Text, nullable=False)
    category = Column(String(100), nullable=True, index=True)
    audience = Column(String(50), default="usuario_final", nullable=False, index=True)
    tags = Column(String(255), nullable=True)
    author_id = Column(Integer, ForeignKey('users.id', ondelete="RESTRICT"), nullable=False)
    visibility = Column(String(20), default="equipe", nullable=False)  # privado, equipe, todos
    copies_count = Column(Integer, default=0, nullable=False)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    
    # Relationships
    author = relationship("User", foreign_keys=[author_id], back_populates="authored_responses")


# --- Phase 7 (Atendimentos Internos) ---

class Attendance(Base):
    __tablename__ = "attendances"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(255), nullable=False, index=True)
    otrs_ticket = Column(String(64), nullable=True, index=True)
    otrs_url = Column(String(512), nullable=True)
    requester_name = Column(String(255), nullable=True)
    technician_id = Column(Integer, ForeignKey('users.id', ondelete="RESTRICT"), nullable=False, index=True)
    status = Column(String(32), default="em_andamento", nullable=False, index=True)  # em_andamento, resolvido, cancelado
    equipment_name = Column(String(255), nullable=True)
    equipment_id = Column(Integer, ForeignKey('equipment.id', ondelete="SET NULL"), nullable=True, index=True)
    store_department = Column(String(255), nullable=True)
    problem_description = Column(Text, nullable=True)
    symptoms = Column(Text, nullable=True)
    diagnosis = Column(Text, nullable=True)
    cause = Column(Text, nullable=True)
    solution = Column(Text, nullable=True)
    commands_used = Column(Text, nullable=True)
    internal_notes = Column(Text, nullable=True)
    knowledge_article_id = Column(Integer, ForeignKey('knowledge_articles.id', ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Relationships
    technician = relationship("User", foreign_keys=[technician_id], back_populates="attendances")
    knowledge_article = relationship("KnowledgeArticle", foreign_keys=[knowledge_article_id])
    equipment = relationship("Equipment", foreign_keys=[equipment_id], back_populates="attendances")
    notes = relationship("AttendanceNote", back_populates="attendance", cascade="all, delete-orphan", order_by="AttendanceNote.created_at.asc()")


class AttendanceNote(Base):
    __tablename__ = "attendance_notes"

    id = Column(Integer, primary_key=True, index=True)
    attendance_id = Column(Integer, ForeignKey('attendances.id', ondelete="CASCADE"), nullable=False, index=True)
    author_id = Column(Integer, ForeignKey('users.id', ondelete="RESTRICT"), nullable=False)
    note = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)

    # Relationships
    attendance = relationship("Attendance", back_populates="notes")
    author = relationship("User", foreign_keys=[author_id], back_populates="attendance_notes")


# --- Phase 8 (Infraestrutura: Lojas, Departamentos, Equipamentos, Licenças e Estoque) ---

class Store(Base):
    __tablename__ = "stores"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(150), nullable=False)
    code = Column(String(50), unique=True, index=True, nullable=True)  # ex: LOJA-01, MATRIZ
    address = Column(String(255), nullable=True)
    phone = Column(String(50), nullable=True)
    status = Column(String(32), default="ativa", nullable=False)  # ativa, inativa, reforma
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Relationships
    departments = relationship("Department", back_populates="store", cascade="all, delete-orphan")
    equipment = relationship("Equipment", back_populates="store")


class Department(Base):
    __tablename__ = "departments"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    store_id = Column(Integer, ForeignKey('stores.id', ondelete="SET NULL"), nullable=True, index=True)
    description = Column(String(255), nullable=True)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)

    # Relationships
    store = relationship("Store", back_populates="departments")
    equipment = relationship("Equipment", back_populates="department")


class Equipment(Base):
    __tablename__ = "equipment"

    id = Column(Integer, primary_key=True, index=True)
    patrimony = Column(String(100), unique=True, index=True, nullable=True)
    hostname = Column(String(150), index=True, nullable=True)
    equipment_type = Column(String(50), nullable=False, index=True)  # computador, notebook, pdv, impressora, switch, access_point, roteador, firewall, servidor, monitor, nobreak, outro
    brand = Column(String(100), nullable=True)
    model = Column(String(100), nullable=True)
    serial_number = Column(String(100), index=True, nullable=True)
    ip_address = Column(String(45), index=True, nullable=True)
    mac_address = Column(String(30), index=True, nullable=True)
    operating_system = Column(String(100), nullable=True)
    store_id = Column(Integer, ForeignKey('stores.id', ondelete="SET NULL"), nullable=True, index=True)
    department_id = Column(Integer, ForeignKey('departments.id', ondelete="SET NULL"), nullable=True, index=True)
    assigned_user = Column(String(150), nullable=True)
    status = Column(String(32), default="ativo", nullable=False, index=True)  # ativo, em_manutencao, reserva, descartado
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Relationships
    store = relationship("Store", back_populates="equipment")
    department = relationship("Department", back_populates="equipment")
    history = relationship("EquipmentHistory", back_populates="equipment", cascade="all, delete-orphan", order_by="EquipmentHistory.created_at.desc()")
    attendances = relationship("Attendance", back_populates="equipment")
    license_assignments = relationship("LicenseAssignment", back_populates="equipment")


class EquipmentHistory(Base):
    __tablename__ = "equipment_history"

    id = Column(Integer, primary_key=True, index=True)
    equipment_id = Column(Integer, ForeignKey('equipment.id', ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(Integer, ForeignKey('users.id', ondelete="SET NULL"), nullable=True)
    event_type = Column(String(50), nullable=False)  # alteracao_ip, alteracao_mac, mudanca_localizacao, troca_peca, manutencao, atendimento, observacao
    description = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)

    # Relationships
    equipment = relationship("Equipment", back_populates="history")
    user = relationship("User")


class License(Base):
    __tablename__ = "licenses"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(150), nullable=False)
    license_type = Column(String(50), nullable=False, default="perpetua")  # perpetua, saas, volume, oem, open_source
    vendor = Column(String(100), nullable=True)
    license_key = Column(String(255), nullable=True)
    total_seats = Column(Integer, default=1, nullable=False)
    cost = Column(Float, nullable=True)
    expiration_date = Column(DateTime(timezone=True), nullable=True)
    status = Column(String(32), default="ativa", nullable=False)  # ativa, vencida, cancelada
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Relationships
    assignments = relationship("LicenseAssignment", back_populates="license", cascade="all, delete-orphan")


class LicenseAssignment(Base):
    __tablename__ = "license_assignments"

    id = Column(Integer, primary_key=True, index=True)
    license_id = Column(Integer, ForeignKey('licenses.id', ondelete="CASCADE"), nullable=False, index=True)
    equipment_id = Column(Integer, ForeignKey('equipment.id', ondelete="SET NULL"), nullable=True, index=True)
    assigned_to = Column(String(150), nullable=False)
    notes = Column(Text, nullable=True)
    assigned_at = Column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)

    # Relationships
    license = relationship("License", back_populates="assignments")
    equipment = relationship("Equipment", back_populates="license_assignments")


class StockItem(Base):
    __tablename__ = "stock_items"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(150), nullable=False, index=True)
    category = Column(String(50), nullable=False, default="perifericos")  # perifericos, suprimentos, redes, pecas, cabos, outros
    part_number = Column(String(100), nullable=True)
    current_quantity = Column(Integer, default=0, nullable=False)
    min_quantity = Column(Integer, default=2, nullable=False)
    unit = Column(String(30), default="unidade", nullable=False)  # unidade, metro, caixa, kit
    location = Column(String(150), nullable=True)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Relationships
    movements = relationship("StockMovement", back_populates="stock_item", cascade="all, delete-orphan", order_by="StockMovement.created_at.desc()")


class StockMovement(Base):
    __tablename__ = "stock_movements"

    id = Column(Integer, primary_key=True, index=True)
    stock_item_id = Column(Integer, ForeignKey('stock_items.id', ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(Integer, ForeignKey('users.id', ondelete="SET NULL"), nullable=True)
    movement_type = Column(String(32), nullable=False)  # entrada, saida, transferencia, baixa, devolucao
    quantity = Column(Integer, nullable=False)
    store_id = Column(Integer, ForeignKey('stores.id', ondelete="SET NULL"), nullable=True)
    attendance_id = Column(Integer, ForeignKey('attendances.id', ondelete="SET NULL"), nullable=True)
    reason = Column(String(255), nullable=True)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)

    # Relationships
    stock_item = relationship("StockItem", back_populates="movements")
    user = relationship("User")
    store = relationship("Store")
    attendance = relationship("Attendance")


