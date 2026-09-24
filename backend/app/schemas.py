from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, ConfigDict

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

class RoleResponse(RoleBase):
    id: int
    permissions: List[PermissionResponse] = []
    model_config = ConfigDict(from_attributes=True)

class UserSimpleResponse(BaseModel):
    id: int
    username: str
    email: str
    is_active: bool = True
    role_id: Optional[int] = None
    model_config = ConfigDict(from_attributes=True)

class UserBase(BaseModel):
    username: str
    email: str
    is_active: bool = True
    role_id: Optional[int] = None

class UserCreate(UserBase):
    password: str

class UserUpdate(BaseModel):
    email: Optional[str] = None
    password: Optional[str] = None
    role_id: Optional[int] = None
    is_active: Optional[bool] = None

class UserResponse(BaseModel):
    id: int
    username: str
    email: str
    is_active: bool
    role_id: Optional[int] = None
    role: Optional[RoleResponse] = None
    model_config = ConfigDict(from_attributes=True)

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
    items: Optional[List[ChecklistItemCreate]] = None

class ChecklistUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None

class ChecklistResponse(ChecklistBase):
    id: int
    task_id: Optional[int] = None
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
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)

# --- Calendar Event Schemas ---

class CalendarEventBase(BaseModel):
    title: str
    description: Optional[str] = None
    start_time: datetime
    end_time: datetime
    event_type: str = "atividade"

class CalendarEventCreate(CalendarEventBase):
    event_type: Optional[str] = "atividade"

class CalendarEventUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    event_type: Optional[str] = None

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

# --- Knowledge Base Schemas (Phase 5) ---

class KnowledgeCategoryBase(BaseModel):
    name: str
    description: Optional[str] = None
    color: Optional[str] = "#3b82f6"

class KnowledgeCategoryCreate(KnowledgeCategoryBase):
    pass

class KnowledgeCategoryResponse(KnowledgeCategoryBase):
    id: int
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
