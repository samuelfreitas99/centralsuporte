from datetime import datetime
from typing import Optional, List, Generic, TypeVar
from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

T = TypeVar("T")

class PaginatedResponse(BaseModel, Generic[T]):
    items: List[T]
    page: int
    limit: int
    total: int
    total_pages: int
    has_next: bool
    has_prev: bool


# --- Auth & Users Schemas ---

class PermissionBase(BaseModel):
    name: str
    description: Optional[str] = None

class PermissionResponse(PermissionBase):
    id: int
    model_config = ConfigDict(from_attributes=True)

class RoleBase(BaseModel):
    name: str
    description: Optional[str] = None

class RoleCreate(RoleBase):
    permission_ids: Optional[List[int]] = []

class RoleUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    permission_ids: Optional[List[int]] = None

class RoleResponse(RoleBase):
    id: int
    permissions: List[PermissionResponse] = []
    model_config = ConfigDict(from_attributes=True)

class DepartmentSimpleResponse(BaseModel):
    id: int
    name: str
    status: Optional[str] = "ativa"
    model_config = ConfigDict(from_attributes=True)

class UserSimpleResponse(BaseModel):
    id: int
    username: str
    email: str
    is_active: bool = True
    full_name: Optional[str] = None
    display_name: Optional[str] = None
    avatar_url: Optional[str] = None
    job_title: Optional[str] = None
    department_id: Optional[int] = None
    role_id: Optional[int] = None
    role: Optional[RoleResponse] = None
    model_config = ConfigDict(from_attributes=True)

class UserBase(BaseModel):
    username: str
    email: str
    is_active: bool = True
    full_name: Optional[str] = None
    display_name: Optional[str] = None
    avatar_url: Optional[str] = None
    phone: Optional[str] = None
    job_title: Optional[str] = None
    department_id: Optional[int] = None
    preferences: Optional[str] = None
    role_id: Optional[int] = None
    role_ids: Optional[List[int]] = None

class UserCreate(UserBase):
    password: str

class UserUpdate(BaseModel):
    email: Optional[str] = None
    password: Optional[str] = None
    is_active: Optional[bool] = None
    full_name: Optional[str] = None
    display_name: Optional[str] = None
    avatar_url: Optional[str] = None
    phone: Optional[str] = None
    job_title: Optional[str] = None
    department_id: Optional[int] = None
    preferences: Optional[str] = None
    role_id: Optional[int] = None
    role_ids: Optional[List[int]] = None

class UserProfileSelfUpdate(BaseModel):
    display_name: Optional[str] = None
    avatar_url: Optional[str] = None
    phone: Optional[str] = None
    preferences: Optional[str] = None

class UserResponse(BaseModel):
    id: int
    username: str
    email: str
    is_active: bool
    full_name: Optional[str] = None
    display_name: Optional[str] = None
    avatar_url: Optional[str] = None
    phone: Optional[str] = None
    job_title: Optional[str] = None
    department_id: Optional[int] = None
    department: Optional[DepartmentSimpleResponse] = None
    last_login_at: Optional[datetime] = None
    preferences: Optional[str] = None
    role_id: Optional[int] = None
    role: Optional[RoleResponse] = None
    roles: List[RoleResponse] = []
    model_config = ConfigDict(from_attributes=True)

class UserProfileResponse(BaseModel):
    id: int
    username: str
    full_name: Optional[str] = None
    display_name: Optional[str] = None
    avatar_url: Optional[str] = None
    job_title: Optional[str] = None
    department_id: Optional[int] = None
    department: Optional[DepartmentSimpleResponse] = None
    is_active: bool
    last_login_at: Optional[datetime] = None
    roles: List[RoleResponse] = []
    # Private fields: only visible for self or users with users:read/admin
    email: Optional[str] = None
    phone: Optional[str] = None
    preferences: Optional[str] = None
    model_config = ConfigDict(from_attributes=True)

class UserStatsResponse(BaseModel):
    user_id: int
    open_tasks: int = 0
    resolved_attendances: int = 0
    active_projects: int = 0
    completed_maintenances: int = 0
    authored_articles: int = 0

class LoginRequest(BaseModel):
    username: str
    password: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse

# --- Checklist & Checklist Item Schemas ---

class ChecklistItemBase(BaseModel):
    title: str
    position: int = 0
    is_completed: bool = False

class ChecklistItemCreate(BaseModel):
    title: str
    position: Optional[int] = 0

class ChecklistItemUpdate(BaseModel):
    title: Optional[str] = None
    position: Optional[int] = None
    is_completed: Optional[bool] = None

class ChecklistItemResponse(BaseModel):
    id: int
    checklist_id: int
    title: str
    is_completed: bool
    position: int
    completed_at: Optional[datetime] = None
    completed_by_id: Optional[int] = None
    completed_by: Optional[UserSimpleResponse] = None
    model_config = ConfigDict(from_attributes=True)

class ChecklistBase(BaseModel):
    title: str
    description: Optional[str] = None

class ChecklistCreate(ChecklistBase):
    task_id: Optional[int] = None
    maintenance_id: Optional[int] = None
    project_id: Optional[int] = None
    items: Optional[List[ChecklistItemCreate]] = None

class ChecklistUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    project_id: Optional[int] = None

class ChecklistResponse(ChecklistBase):
    id: int
    task_id: Optional[int] = None
    maintenance_id: Optional[int] = None
    project_id: Optional[int] = None
    creator_id: int
    creator: Optional[UserSimpleResponse] = None
    created_at: datetime
    items: List[ChecklistItemResponse] = []
    model_config = ConfigDict(from_attributes=True)

# --- Reminder Schemas ---

class ReminderBase(BaseModel):
    title: str
    description: Optional[str] = None
    remind_at: datetime
    priority: str = "media"
    status: str = "pendente"
    task_id: Optional[int] = None

class ReminderCreate(BaseModel):
    title: str
    description: Optional[str] = None
    remind_at: datetime
    priority: Optional[str] = "media"
    status: Optional[str] = "pendente"
    task_id: Optional[int] = None

class ReminderUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    remind_at: Optional[datetime] = None
    priority: Optional[str] = None
    status: Optional[str] = None
    task_id: Optional[int] = None

class ReminderStatusUpdate(BaseModel):
    status: str  # pendente, concluido, dispensado

class ReminderResponse(ReminderBase):
    id: int
    user_id: int
    source: str = "manual"  # manual | automacao
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)

# --- Calendar Event Schemas ---

class CalendarEventBase(BaseModel):
    title: str
    description: Optional[str] = None
    start_time: datetime
    end_time: datetime
    event_type: str = "atividade"
    project_id: Optional[int] = None

class CalendarEventCreate(CalendarEventBase):
    event_type: Optional[str] = "atividade"

class CalendarEventUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    event_type: Optional[str] = None
    project_id: Optional[int] = None

class CalendarEventResponse(CalendarEventBase):
    id: int
    user_id: int
    creator: Optional[UserSimpleResponse] = None
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)

# --- Task Schemas ---

class TaskBase(BaseModel):
    title: str
    description: Optional[str] = None
    priority: str = "media"
    status: str = "pendente"
    due_date: Optional[datetime] = None
    visibility: str = "equipe"
    category: Optional[str] = None
    otrs_reference: Optional[str] = None
    project_id: Optional[int] = None
    project_stage: Optional[str] = None

class TaskCreate(BaseModel):
    title: str
    description: Optional[str] = None
    priority: Optional[str] = "media"
    status: Optional[str] = "pendente"
    due_date: Optional[datetime] = None
    visibility: Optional[str] = "equipe"
    category: Optional[str] = None
    otrs_reference: Optional[str] = None
    assigned_user_ids: Optional[List[int]] = []
    project_id: Optional[int] = None
    project_stage: Optional[str] = None

class TaskUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    priority: Optional[str] = None
    status: Optional[str] = None
    due_date: Optional[datetime] = None
    visibility: Optional[str] = None
    category: Optional[str] = None
    otrs_reference: Optional[str] = None
    assigned_user_ids: Optional[List[int]] = None
    project_id: Optional[int] = None
    project_stage: Optional[str] = None

class TaskStatusUpdate(BaseModel):
    status: str  # pendente, em_andamento, concluida, cancelada

class TaskResponse(TaskBase):
    id: int
    creator_id: int
    creator: Optional[UserSimpleResponse] = None
    completed_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime
    assigned_users: List[UserSimpleResponse] = []
    checklists: List[ChecklistResponse] = []
    model_config = ConfigDict(from_attributes=True)

class TaskListResponse(BaseModel):
    id: int
    title: str
    priority: str
    status: str
    due_date: Optional[datetime] = None
    visibility: str
    category: Optional[str] = None
    otrs_reference: Optional[str] = None
    project_id: Optional[int] = None
    project_stage: Optional[str] = None
    creator_id: int
    creator: Optional[UserSimpleResponse] = None
    completed_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime
    assigned_users: List[UserSimpleResponse] = []
    model_config = ConfigDict(from_attributes=True)

# --- Knowledge Base Schemas (Phase 5) ---

class KnowledgeCategoryBase(BaseModel):
    name: str
    description: Optional[str] = None
    color: Optional[str] = "#3b82f6"

class KnowledgeCategoryCreate(KnowledgeCategoryBase):
    pass

class KnowledgeCategoryUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None
    color: Optional[str] = None

class KnowledgeCategoryResponse(KnowledgeCategoryBase):
    id: int
    articles_count: Optional[int] = 0
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)

class KnowledgeTagBase(BaseModel):
    name: str

class KnowledgeTagCreate(KnowledgeTagBase):
    pass

class KnowledgeTagResponse(KnowledgeTagBase):
    id: int
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)

class KnowledgeVersionResponse(BaseModel):
    id: int
    article_id: int
    version_number: int
    title: str
    content: str
    change_summary: Optional[str] = None
    editor_id: Optional[int] = None
    editor: Optional[UserSimpleResponse] = None
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)

class KnowledgeArticleBase(BaseModel):
    title: str
    summary: Optional[str] = None
    content: str
    problem: Optional[str] = None
    solution: Optional[str] = None
    commands: Optional[str] = None
    category_id: Optional[int] = None
    status: str = "rascunho"  # rascunho, publicado, arquivado
    visibility: str = "equipe"  # privado, equipe, todos

class KnowledgeArticleCreate(BaseModel):
    title: str
    summary: Optional[str] = None
    content: str
    problem: Optional[str] = None
    solution: Optional[str] = None
    commands: Optional[str] = None
    category_id: Optional[int] = None
    status: Optional[str] = "rascunho"
    visibility: Optional[str] = "equipe"
    tag_names: Optional[List[str]] = []

class KnowledgeArticleUpdate(BaseModel):
    title: Optional[str] = None
    summary: Optional[str] = None
    content: Optional[str] = None
    problem: Optional[str] = None
    solution: Optional[str] = None
    commands: Optional[str] = None
    category_id: Optional[int] = None
    status: Optional[str] = None
    visibility: Optional[str] = None
    tag_names: Optional[List[str]] = None
    change_summary: Optional[str] = None

class KnowledgeArticleResponse(BaseModel):
    id: int
    title: str
    summary: Optional[str] = None
    content: str
    problem: Optional[str] = None
    solution: Optional[str] = None
    commands: Optional[str] = None
    category_id: Optional[int] = None
    category: Optional[KnowledgeCategoryResponse] = None
    author_id: int
    author: Optional[UserSimpleResponse] = None
    status: str
    visibility: str
    views_count: int
    created_at: datetime
    updated_at: datetime
    tags: List[KnowledgeTagResponse] = []
    versions: List[KnowledgeVersionResponse] = []
    is_favorite: Optional[bool] = False
    model_config = ConfigDict(from_attributes=True)

# --- Commands & Standard Responses Schemas (Phase 6) ---

class CommandStepBase(BaseModel):
    position: int
    title: str
    description: Optional[str] = None
    command_text: str

class CommandStepCreate(CommandStepBase):
    pass

class CommandStepResponse(CommandStepBase):
    id: int
    command_id: int
    model_config = ConfigDict(from_attributes=True)

class CommandBase(BaseModel):
    title: str
    description: Optional[str] = None
    command: Optional[str] = None # Legacy fallback
    system: str = "Geral"
    category: Optional[str] = None
    tags: Optional[str] = None
    notes: Optional[str] = None
    warning: Optional[str] = None
    visibility: str = "equipe"

class CommandCreate(CommandBase):
    steps: List[CommandStepCreate] = Field(default_factory=list)

class CommandUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    command: Optional[str] = None
    system: Optional[str] = None
    category: Optional[str] = None
    tags: Optional[str] = None
    notes: Optional[str] = None
    warning: Optional[str] = None
    visibility: Optional[str] = None
    steps: Optional[List[CommandStepCreate]] = None

class CommandResponse(CommandBase):
    id: int
    author_id: int
    author: Optional[UserSimpleResponse] = None
    copies_count: int = 0
    created_at: datetime
    updated_at: datetime
    steps: List[CommandStepResponse] = []
    model_config = ConfigDict(from_attributes=True)

class StandardResponseBase(BaseModel):
    title: str
    content: str
    category: Optional[str] = None
    audience: str = "usuario_final"
    tags: Optional[str] = None
    visibility: str = "equipe"

class StandardResponseCreate(StandardResponseBase):
    pass

class StandardResponseUpdate(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None
    category: Optional[str] = None
    audience: Optional[str] = None
    tags: Optional[str] = None
    visibility: Optional[str] = None

class StandardResponseResponse(StandardResponseBase):
    id: int
    author_id: int
    author: Optional[UserSimpleResponse] = None
    copies_count: int = 0
    created_at: datetime
    updated_at: datetime
    model_config = ConfigDict(from_attributes=True)


# --- Phase 7: Atendimentos Internos Schemas ---

class AttendanceNoteCreate(BaseModel):
    note: str

class AttendanceNoteResponse(BaseModel):
    id: int
    attendance_id: int
    author_id: int
    author: Optional[UserSimpleResponse] = None
    note: str
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)

class AttendanceBase(BaseModel):
    title: str
    otrs_ticket: Optional[str] = None
    otrs_url: Optional[str] = None
    requester_name: Optional[str] = None
    status: str = "em_andamento"
    equipment_name: Optional[str] = None
    equipment_id: Optional[int] = None
    store_department: Optional[str] = None
    problem_description: Optional[str] = None
    symptoms: Optional[str] = None
    diagnosis: Optional[str] = None
    cause: Optional[str] = None
    solution: Optional[str] = None
    commands_used: Optional[str] = None
    internal_notes: Optional[str] = None
    project_id: Optional[int] = None

class AttendanceCreate(AttendanceBase):
    technician_id: Optional[int] = None

class AttendanceUpdate(BaseModel):
    title: Optional[str] = None
    otrs_ticket: Optional[str] = None
    otrs_url: Optional[str] = None
    requester_name: Optional[str] = None
    technician_id: Optional[int] = None
    status: Optional[str] = None
    equipment_name: Optional[str] = None
    equipment_id: Optional[int] = None
    store_department: Optional[str] = None
    problem_description: Optional[str] = None
    symptoms: Optional[str] = None
    diagnosis: Optional[str] = None
    cause: Optional[str] = None
    solution: Optional[str] = None
    commands_used: Optional[str] = None
    internal_notes: Optional[str] = None
    project_id: Optional[int] = None

class AttendanceResponse(AttendanceBase):
    id: int
    technician_id: int
    technician: Optional[UserSimpleResponse] = None
    knowledge_article_id: Optional[int] = None
    notes: List[AttendanceNoteResponse] = []
    created_at: datetime
    updated_at: datetime
    model_config = ConfigDict(from_attributes=True)


# --- Phase 8: Infraestrutura (Lojas, Departamentos, Equipamentos, Licenças, Estoque) ---

class StoreBase(BaseModel):
    name: str
    code: Optional[str] = None
    address: Optional[str] = None
    phone: Optional[str] = None
    status: str = "ativa"
    notes: Optional[str] = None

    @field_validator('*', mode='before')
    @classmethod
    def empty_str_to_none(cls, v):
        if isinstance(v, str) and v.strip() == "":
            return None
        return v

class StoreCreate(StoreBase):
    pass

class StoreUpdate(BaseModel):
    name: Optional[str] = None
    code: Optional[str] = None
    address: Optional[str] = None
    phone: Optional[str] = None
    status: Optional[str] = None
    notes: Optional[str] = None

    @field_validator('*', mode='before')
    @classmethod
    def empty_str_to_none(cls, v):
        if isinstance(v, str) and v.strip() == "":
            return None
        return v

class StoreResponse(StoreBase):
    id: int
    created_at: datetime
    updated_at: datetime
    model_config = ConfigDict(from_attributes=True)


class DepartmentBase(BaseModel):
    name: str
    store_id: Optional[int] = None
    description: Optional[str] = None
    status: Optional[str] = "ativa"

class DepartmentCreate(DepartmentBase):
    pass

class DepartmentUpdate(BaseModel):
    name: Optional[str] = None
    store_id: Optional[int] = None
    description: Optional[str] = None
    status: Optional[str] = None

class DepartmentResponse(DepartmentBase):
    id: int
    store: Optional[StoreResponse] = None
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)


class TechnicalLocationBase(BaseModel):
    name: str
    location_type: str
    store_id: int
    department_id: Optional[int] = None
    description: Optional[str] = None
    notes: Optional[str] = None
    status: Optional[str] = "ativa"

class TechnicalLocationCreate(TechnicalLocationBase):
    pass

class TechnicalLocationUpdate(BaseModel):
    name: Optional[str] = None
    location_type: Optional[str] = None
    store_id: Optional[int] = None
    department_id: Optional[int] = None
    description: Optional[str] = None
    notes: Optional[str] = None
    status: Optional[str] = None

class TechnicalLocationResponse(TechnicalLocationBase):
    id: int
    store: Optional[StoreResponse] = None
    department: Optional[DepartmentResponse] = None
    created_at: datetime
    updated_at: datetime
    model_config = ConfigDict(from_attributes=True)


class EquipmentHistoryCreate(BaseModel):
    event_type: str
    description: str

class EquipmentHistoryResponse(BaseModel):
    id: int
    equipment_id: int
    user_id: Optional[int] = None
    user: Optional[UserSimpleResponse] = None
    event_type: str
    description: str
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)


class EquipmentBase(BaseModel):
    patrimony: Optional[str] = None
    hostname: Optional[str] = None
    equipment_type: str
    brand: Optional[str] = None
    model: Optional[str] = None
    serial_number: Optional[str] = None
    ip_address: Optional[str] = None
    mac_address: Optional[str] = None
    operating_system: Optional[str] = None
    store_id: Optional[int] = None
    department_id: Optional[int] = None
    technical_location_id: Optional[int] = None
    assigned_user: Optional[str] = None
    status: str = "ativo"
    notes: Optional[str] = None

    @field_validator('*', mode='before')
    @classmethod
    def empty_str_to_none(cls, v):
        if isinstance(v, str) and v.strip() == "":
            return None
        return v

class EquipmentCreate(EquipmentBase):
    pass

class EquipmentUpdate(BaseModel):
    patrimony: Optional[str] = None
    hostname: Optional[str] = None
    equipment_type: Optional[str] = None
    brand: Optional[str] = None
    model: Optional[str] = None
    serial_number: Optional[str] = None
    ip_address: Optional[str] = None
    mac_address: Optional[str] = None
    operating_system: Optional[str] = None
    store_id: Optional[int] = None
    department_id: Optional[int] = None
    technical_location_id: Optional[int] = None
    assigned_user: Optional[str] = None
    status: Optional[str] = None
    notes: Optional[str] = None

    @field_validator('*', mode='before')
    @classmethod
    def empty_str_to_none(cls, v):
        if isinstance(v, str) and v.strip() == "":
            return None
        return v

class EquipmentListResponse(EquipmentBase):
    """Item de listagem: sem o histórico técnico (que pode ter centenas de eventos por equipamento)."""
    id: int
    store: Optional[StoreResponse] = None
    department: Optional[DepartmentResponse] = None
    technical_location: Optional[TechnicalLocationResponse] = None
    created_at: datetime
    updated_at: datetime
    model_config = ConfigDict(from_attributes=True)

class EquipmentResponse(EquipmentListResponse):
    history: List[EquipmentHistoryResponse] = []


class LicenseAssignmentCreate(BaseModel):
    equipment_id: Optional[int] = None
    assigned_to: str
    notes: Optional[str] = None

class LicenseAssignmentResponse(BaseModel):
    id: int
    license_id: int
    equipment_id: Optional[int] = None
    assigned_to: str
    notes: Optional[str] = None
    assigned_at: datetime
    model_config = ConfigDict(from_attributes=True)


class LicenseBase(BaseModel):
    name: str
    license_type: str = "perpetua"
    vendor: Optional[str] = None
    license_key: Optional[str] = None
    account_email: Optional[str] = None
    total_seats: int = 1
    cost: Optional[float] = None
    expiration_date: Optional[datetime] = None
    status: str = "ativa"
    notes: Optional[str] = None

class LicenseCreate(LicenseBase):
    pass

class LicenseUpdate(BaseModel):
    name: Optional[str] = None
    license_type: Optional[str] = None
    vendor: Optional[str] = None
    license_key: Optional[str] = None
    account_email: Optional[str] = None
    total_seats: Optional[int] = None
    cost: Optional[float] = None
    expiration_date: Optional[datetime] = None
    status: Optional[str] = None
    notes: Optional[str] = None

class LicenseResponse(LicenseBase):
    id: int
    assignments: List[LicenseAssignmentResponse] = []
    used_seats: int = 0
    created_at: datetime
    updated_at: datetime
    model_config = ConfigDict(from_attributes=True)


class StockMovementCreate(BaseModel):
    movement_type: str
    quantity: int
    store_id: Optional[int] = None
    attendance_id: Optional[int] = None
    project_id: Optional[int] = None
    reason: Optional[str] = None

class StockMovementUpdate(BaseModel):
    project_id: Optional[int] = None

class StockMovementResponse(BaseModel):
    id: int
    stock_item_id: int
    user_id: Optional[int] = None
    user: Optional[UserSimpleResponse] = None
    movement_type: str
    quantity: int
    store_id: Optional[int] = None
    attendance_id: Optional[int] = None
    project_id: Optional[int] = None
    reason: Optional[str] = None
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)


class StockItemBase(BaseModel):
    name: str
    category: str = "perifericos"
    part_number: Optional[str] = None
    current_quantity: int = 0
    min_quantity: int = 2
    unit: str = "unidade"
    location: Optional[str] = None
    notes: Optional[str] = None

class StockItemCreate(StockItemBase):
    pass

class StockItemUpdate(BaseModel):
    name: Optional[str] = None
    category: Optional[str] = None
    part_number: Optional[str] = None
    min_quantity: Optional[int] = None
    unit: Optional[str] = None
    location: Optional[str] = None
    notes: Optional[str] = None

class StockItemResponse(StockItemBase):
    id: int
    is_low_stock: bool = False
    movements: List[StockMovementResponse] = []
    created_at: datetime
    updated_at: datetime
    model_config = ConfigDict(from_attributes=True)


# --- Maintenance Schemas (Phase 9) ---

class MaintenanceRecordBase(BaseModel):
    title: str
    equipment_id: Optional[int] = None
    equipment_ids: Optional[List[int]] = None
    store_id: Optional[int] = None
    department_id: Optional[int] = None
    technical_location_id: Optional[int] = None
    attendance_id: Optional[int] = None
    technician_id: Optional[int] = None
    maintenance_type: str = "preventiva"  # preventiva, corretiva, substituicao, atualizacao, configuracao, instalacao, outro
    status: str = "agendada"  # agendada, em_andamento, concluida, cancelada
    priority: str = "media"  # baixa, media, alta, urgente
    scheduled_date: Optional[datetime] = None
    performed_date: Optional[datetime] = None
    description: Optional[str] = None
    diagnosis: Optional[str] = None
    procedure_performed: Optional[str] = None
    parts_used: Optional[str] = None
    otrs_ticket: Optional[str] = None
    result: Optional[str] = None  # sucesso, parcial, falha
    cost: Optional[float] = None
    internal_notes: Optional[str] = None
    project_id: Optional[int] = None

    @field_validator('*', mode='before')
    @classmethod
    def empty_str_to_none(cls, v):
        if isinstance(v, str) and v.strip() == "":
            return None
        return v

class ChecklistTemplateItemBase(BaseModel):
    title: str
    position: int = 0

class ChecklistTemplateItemCreate(ChecklistTemplateItemBase):
    pass

class ChecklistTemplateItemResponse(ChecklistTemplateItemBase):
    id: int
    template_id: int
    model_config = ConfigDict(from_attributes=True)

class ChecklistTemplateBase(BaseModel):
    name: str
    description: Optional[str] = None
    maintenance_type: str = "preventiva"
    is_active: bool = True

class ChecklistTemplateCreate(ChecklistTemplateBase):
    items: Optional[List[ChecklistTemplateItemCreate]] = None

class ChecklistTemplateUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    maintenance_type: Optional[str] = None
    is_active: Optional[bool] = None
    items: Optional[List[ChecklistTemplateItemCreate]] = None

class ChecklistTemplateResponse(ChecklistTemplateBase):
    id: int
    items: List[ChecklistTemplateItemResponse] = []
    created_at: datetime
    updated_at: datetime
    model_config = ConfigDict(from_attributes=True)

class MaintenanceRecordCreate(MaintenanceRecordBase):
    checklist_title: Optional[str] = None
    checklist_items: Optional[List[str]] = None
    checklist_template_id: Optional[int] = None

    @model_validator(mode='after')
    def validate_equipments(self):
        if not self.equipment_id and (not self.equipment_ids or len(self.equipment_ids) == 0):
            raise ValueError("Pelo menos um equipamento deve ser informado (equipment_id ou equipment_ids).")
        if self.equipment_ids and not self.equipment_id:
            self.equipment_id = self.equipment_ids[0]
        elif self.equipment_id and not self.equipment_ids:
            self.equipment_ids = [self.equipment_id]
        return self

class MaintenanceRecordUpdate(BaseModel):
    title: Optional[str] = None
    equipment_id: Optional[int] = None
    equipment_ids: Optional[List[int]] = None
    store_id: Optional[int] = None
    department_id: Optional[int] = None
    technical_location_id: Optional[int] = None
    attendance_id: Optional[int] = None
    technician_id: Optional[int] = None
    maintenance_type: Optional[str] = None
    status: Optional[str] = None
    priority: Optional[str] = None
    scheduled_date: Optional[datetime] = None
    performed_date: Optional[datetime] = None
    description: Optional[str] = None
    diagnosis: Optional[str] = None
    procedure_performed: Optional[str] = None
    parts_used: Optional[str] = None
    otrs_ticket: Optional[str] = None
    result: Optional[str] = None
    cost: Optional[float] = None
    internal_notes: Optional[str] = None
    project_id: Optional[int] = None

    @field_validator('*', mode='before')
    @classmethod
    def empty_str_to_none(cls, v):
        if isinstance(v, str) and v.strip() == "":
            return None
        return v

class MaintenanceRecordStatusUpdate(BaseModel):
    status: str
    result: Optional[str] = None
    procedure_performed: Optional[str] = None
    performed_date: Optional[datetime] = None

class MaintenanceRecordResponse(MaintenanceRecordBase):
    id: int
    equipment: Optional[EquipmentListResponse] = None
    equipments: List[EquipmentListResponse] = []
    store: Optional[StoreResponse] = None
    department: Optional[DepartmentResponse] = None
    technical_location: Optional[TechnicalLocationResponse] = None
    attendance: Optional[AttendanceResponse] = None
    technician: Optional[UserSimpleResponse] = None
    checklists: List[ChecklistResponse] = []
    created_at: datetime
    updated_at: datetime
    model_config = ConfigDict(from_attributes=True)

class MaintenanceSummaryMetrics(BaseModel):
    total: int = 0
    agendadas: int = 0
    em_andamento: int = 0
    concluidas: int = 0
    preventivas: int = 0
    corretivas: int = 0
    model_config = ConfigDict(from_attributes=True)


# --- Attachment Schemas (Phase 10) ---

class AttachmentBase(BaseModel):
    original_filename: str
    entity_type: Optional[str] = None
    entity_id: Optional[int] = None
    description: Optional[str] = None

class AttachmentResponse(AttachmentBase):
    id: int
    stored_filename: str
    file_size: int
    mime_type: str
    file_hash: Optional[str] = None
    uploader_id: Optional[int] = None
    uploader: Optional[UserSimpleResponse] = None
    created_at: datetime
    deleted_at: Optional[datetime] = None
    model_config = ConfigDict(from_attributes=True)


# --- Search & Reports Schemas (Phase 11) ---

class SearchResultItem(BaseModel):
    id: int
    entity_type: str  # 'knowledge', 'command', 'attendance', 'equipment', 'maintenance', 'task'
    title: str
    snippet: str
    badge: Optional[str] = None
    created_at: Optional[datetime] = None
    url_tab: str
    metadata: dict = {}

class GlobalSearchResponse(BaseModel):
    query: str
    total_results: int
    results: List[SearchResultItem]

class RecurrentEquipmentIssue(BaseModel):
    equipment_id: int
    hostname: Optional[str] = None
    patrimony: Optional[str] = None
    store_name: Optional[str] = None
    total_incidents: int
    attendances_count: int
    maintenances_count: int

class TechnicianPerformanceMetric(BaseModel):
    technician_id: int
    username: str
    attendances_count: int
    maintenances_count: int
    total_actions: int

class OperationalSummaryReport(BaseModel):
    period_days: int
    attendances_total: int
    attendances_resolved: int
    attendances_in_progress: int
    resolution_rate: float
    maintenances_total: int
    maintenances_preventive: int
    maintenances_corrective: int
    maintenances_total_cost: float
    recurrent_equipment: List[RecurrentEquipmentIssue]
    top_technicians: List[TechnicianPerformanceMetric]


# --- Audit Logs Schemas (Phase 12) ---

class AuditLogItem(BaseModel):
    id: int
    user_id: Optional[int] = None
    username: Optional[str] = None
    action: str
    entity_type: str
    entity_id: Optional[int] = None
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None
    details: Optional[str] = None
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)


class AuditLogListResponse(BaseModel):
    total: int
    page: int
    limit: int
    results: List[AuditLogItem]


# --- Automation Schemas (Phase 13) ---

class AutomationRuleItem(BaseModel):
    id: str
    name: str
    description: str
    category: str
    frequency: str
    is_active: bool


class AutomationTriggerResponse(BaseModel):
    executed_at: str
    tasks_evaluated: int
    task_reminders_created: int
    maintenances_evaluated: int
    maintenance_reminders_created: int
    equipment_alerts_created: int
    total_created: int
    error: Optional[str] = None


class AutomationStatusResponse(BaseModel):
    status: str
    interval_minutes: int
    last_run_at: Optional[str] = None
    run_count: int
    last_stats: dict = {}
    active_rules_count: int





# --- Project Schemas (Phase 10.1) ---

class ProjectBase(BaseModel):
    title: str
    description: Optional[str] = None
    status: str = "planejado"
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    expected_end_date: Optional[datetime] = None
    store_id: Optional[int] = None
    
    @field_validator('*', mode='before')
    @classmethod
    def empty_str_to_none(cls, v):
        if isinstance(v, str) and v.strip() == "":
            return None
        return v

class ProjectCreate(ProjectBase):
    pass

class ProjectUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    expected_end_date: Optional[datetime] = None
    store_id: Optional[int] = None
    owner_id: Optional[int] = None

class ProjectResponse(ProjectBase):
    id: int
    owner_id: int
    owner: Optional[UserSimpleResponse] = None
    store: Optional[StoreResponse] = None
    created_at: datetime
    updated_at: datetime
    model_config = ConfigDict(from_attributes=True)

class ProjectNoteBase(BaseModel):
    note: str

class ProjectNoteCreate(ProjectNoteBase):
    pass

class ProjectNoteResponse(ProjectNoteBase):
    id: int
    project_id: int
    author_id: int
    author: Optional[UserSimpleResponse] = None
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)

class ProjectTimelineEvent(BaseModel):
    id: int
    type: str # 'note', 'audit'
    title: str
    description: str
    author: Optional[UserSimpleResponse] = None
    created_at: datetime
    metadata: dict = {}

class ProjectSummaryResponse(BaseModel):
    total_tasks: int = 0
    completed_tasks: int = 0
    pending_tasks: int = 0
    progress_percentage: float = 0.0
    total_equipment: int = 0
    total_maintenances: int = 0
    total_attendances: int = 0
    total_events: int = 0
    total_stock_movements: int = 0


# --- Dashboard (Início) ---

class DashboardTaskCounts(BaseModel):
    pending: int
    in_progress: int
    overdue: int
    urgent: int
    assigned_to_me: int

class DashboardAttendanceCounts(BaseModel):
    open: int
    mine_open: int
    today: int

class DashboardMaintenanceCounts(BaseModel):
    today: int
    overdue: int
    next_7_days: int

class DashboardLowStockItem(BaseModel):
    id: int
    name: str
    current_quantity: int
    min_quantity: int
    unit: str

class DashboardExpiringLicense(BaseModel):
    id: int
    name: str
    expiration_date: datetime
    days_left: int

class DashboardSummaryResponse(BaseModel):
    """Seções ausentes (null) = usuário sem permissão para o módulo."""
    generated_at: datetime
    tasks: Optional[DashboardTaskCounts] = None
    attendances: Optional[DashboardAttendanceCounts] = None
    maintenances: Optional[DashboardMaintenanceCounts] = None
    low_stock_total: Optional[int] = None
    low_stock: Optional[List[DashboardLowStockItem]] = None
    expiring_licenses_total: Optional[int] = None
    expiring_licenses: Optional[List[DashboardExpiringLicense]] = None
    reminders_pending: int = 0
    knowledge_published: Optional[int] = None
