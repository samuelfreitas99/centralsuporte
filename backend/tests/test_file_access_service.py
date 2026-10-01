import pytest
import uuid
from typing import Any, Optional
from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.database import SessionLocal
from app.models import (
    Attachment,
    Attendance,
    Equipment,
    KnowledgeArticle,
    MaintenanceRecord,
    Permission,
    Project,
    Role,
    Task,
    User,
)
from app.services.file_access import (
    AccessDecision,
    AttachmentAccessRegistry,
    AttachmentAccessValidator,
    AttendanceAttachmentValidator,
    EquipmentAttachmentValidator,
    FileAccessService,
    KnowledgeAttachmentValidator,
    MaintenanceAttachmentValidator,
    ProjectAttachmentValidator,
    TaskAttachmentValidator,
    create_default_registry,
)


# --- Helper Fixtures & Setup ---

@pytest.fixture(scope="module")
def db_session():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def get_or_create_permission(db: Session, name: str) -> Permission:
    perm = db.query(Permission).filter(Permission.name == name).first()
    if not perm:
        perm = Permission(name=name, description=f"Permission {name}")
        db.add(perm)
        db.flush()
    return perm


def create_test_user(db: Session, username_prefix: str, permission_names: list[str], is_admin: bool = False, is_active: bool = True) -> User:
    uid = uuid.uuid4().hex[:8]
    username = f"{username_prefix}_{uid}"
    email = f"{username}@test.local"

    role_name = f"Role_{username}"
    role = Role(name=role_name, description="Test role")
    db.add(role)
    db.flush()

    if is_admin:
        admin_role = db.query(Role).filter(Role.name == "Administrador").first()
        if not admin_role:
            admin_role = Role(name="Administrador", description="Admin role")
            db.add(admin_role)
            db.flush()
        user = User(username=username, email=email, hashed_password="fake", is_active=is_active)
        user.roles = [admin_role]
    else:
        for p_name in permission_names:
            perm = get_or_create_permission(db, p_name)
            role.permissions.append(perm)
        user = User(username=username, email=email, hashed_password="fake", is_active=is_active)
        user.roles = [role]

    db.add(user)
    db.commit()
    db.refresh(user)
    return user


# ==============================================================================
# 1. REGISTRY TESTS
# ==============================================================================

def test_registry_register_and_get():
    """1. Registra validator e 2. Recupera validator."""
    registry = AttachmentAccessRegistry()

    class DummyValidator(AttachmentAccessValidator):
        @property
        def entity_type(self) -> str:
            return "dummy"

        def get_entity(self, db: Session, entity_id: int) -> Optional[Any]:
            return None

        def can_read(self, db: Session, user: User, entity: Any) -> bool:
            return True

        def can_upload(self, db: Session, user: User, entity: Any) -> bool:
            return True

        def can_delete(self, db: Session, user: User, entity: Any, attachment: Optional[Attachment] = None) -> bool:
            return True

    val = DummyValidator()
    registry.register(val)

    assert registry.is_supported("dummy") is True
    assert registry.get("dummy") is val
    assert "dummy" in registry.supported_types()


def test_registry_duplicate_registration_fails():
    """4. Registro duplicado é tratado corretamente com erro explícito."""
    registry = AttachmentAccessRegistry()
    val = ProjectAttachmentValidator()
    registry.register(val)

    with pytest.raises(ValueError, match="already registered"):
        registry.register(val)


def test_registry_empty_entity_type_fails():
    """Registro com entity_type vazio ou inválido falha."""
    registry = AttachmentAccessRegistry()

    class InvalidValidator(AttachmentAccessValidator):
        @property
        def entity_type(self) -> str:
            return ""

        def get_entity(self, db: Session, entity_id: int) -> Optional[Any]:
            return None

        def can_read(self, db: Session, user: User, entity: Any) -> bool:
            return False

        def can_upload(self, db: Session, user: User, entity: Any) -> bool:
            return False

        def can_delete(self, db: Session, user: User, entity: Any, attachment: Optional[Attachment] = None) -> bool:
            return False

    with pytest.raises(ValueError, match="non-empty entity_type"):
        registry.register(InvalidValidator())


def test_registry_unknown_entity_type():
    """3. entity_type desconhecido é negado por padrão."""
    registry = AttachmentAccessRegistry()
    assert registry.is_supported("unknown_entity") is False
    assert registry.get("unknown_entity") is None


def test_registry_default_types():
    """Verifica que o registry padrão carrega os 6 tipos esperados."""
    default_reg = create_default_registry()
    expected = {"project", "task", "maintenance", "attendance", "equipment", "knowledge"}
    assert expected.issubset(set(default_reg.supported_types()))


# ==============================================================================
# 2. SECURITY & GLOBAL ACCESS TESTS
# ==============================================================================

def test_security_inactive_user_denied(db_session):
    """Usuário inativo deve receber DENY em qualquer operação."""
    user = create_test_user(db_session, "inactive", ["attachment:read", "attachment:upload", "attachment:delete"], is_active=False)
    service = FileAccessService()

    read_dec = service.check_read_access(db_session, user, "project", 1)
    assert read_dec.allowed is False
    assert read_dec.status_code == 403
    assert "inativo" in read_dec.reason.lower()

    upload_dec = service.check_upload_access(db_session, user, "project", 1)
    assert upload_dec.allowed is False
    assert upload_dec.status_code == 403

    delete_dec = service.check_delete_access(db_session, user, "project", 1)
    assert delete_dec.allowed is False
    assert delete_dec.status_code == 403


def test_security_unauthenticated_user_denied(db_session):
    """Usuário None/não autenticado deve receber 401."""
    service = FileAccessService()
    dec = service.check_read_access(db_session, None, "project", 1)
    assert dec.allowed is False
    assert dec.status_code == 401


def test_security_missing_global_permission(db_session):
    """attachment:read / upload / delete sem permissão global → DENY."""
    user = create_test_user(db_session, "no_perms", [])
    service = FileAccessService()

    assert service.check_read_access(db_session, user, "project", 1).status_code == 403
    assert service.check_upload_access(db_session, user, "project", 1).status_code == 403
    assert service.check_delete_access(db_session, user, "project", 1).status_code == 403


def test_security_unknown_entity_type(db_session):
    """entity_type desconhecido é rejeitado com status 400."""
    user = create_test_user(db_session, "user_all_att", ["attachment:read", "attachment:upload", "attachment:delete"])
    service = FileAccessService()

    dec = service.check_read_access(db_session, user, "fictitious_entity", 1)
    assert dec.allowed is False
    assert dec.status_code == 400
    assert "não suportado" in dec.reason


def test_security_nonexistent_entity(db_session):
    """Entidade inexistente deve retornar 404."""
    user = create_test_user(db_session, "user_att_proj", ["attachment:read", "project:read"])
    service = FileAccessService()

    dec = service.check_read_access(db_session, user, "project", 99999999)
    assert dec.allowed is False
    assert dec.status_code == 404
    assert "não encontrada" in dec.reason


# ==============================================================================
# 3. PROJECT ATTACHMENT VALIDATOR TESTS
# ==============================================================================

def test_project_contextual_authorization(db_session):
    """Valida autorização contextual em Projetos."""
    owner = create_test_user(db_session, "proj_owner", ["project:read", "project:update", "attachment:read", "attachment:upload"])
    viewer = create_test_user(db_session, "proj_viewer", ["project:read", "attachment:read"])
    outsider = create_test_user(db_session, "proj_outsider", ["attachment:read", "attachment:upload"])
    admin = create_test_user(db_session, "proj_admin", [], is_admin=True)

    project = Project(
        title="Projeto Piloto Wi-Fi",
        description="Expansão APs",
        status="em_andamento",
        owner_id=owner.id,
    )
    db_session.add(project)
    db_session.commit()
    db_session.refresh(project)

    service = FileAccessService()

    # READ: viewer with project:read can read; outsider without project:read cannot
    assert service.can_read(db_session, viewer, "project", project.id) is True
    assert service.can_read(db_session, outsider, "project", project.id) is False
    assert service.can_read(db_session, admin, "project", project.id) is True

    # UPLOAD: owner with project:update can upload; viewer without project:update cannot
    assert service.can_upload(db_session, owner, "project", project.id) is True
    assert service.can_upload(db_session, viewer, "project", project.id) is False
    assert service.can_upload(db_session, admin, "project", project.id) is True

    # UPLOAD to cancelled project should be denied
    project.status = "cancelado"
    db_session.commit()
    assert service.can_upload(db_session, owner, "project", project.id) is False

    # Restore status
    project.status = "em_andamento"
    db_session.commit()


# ==============================================================================
# 4. TASK ATTACHMENT VALIDATOR TESTS
# ==============================================================================

def test_task_contextual_authorization(db_session):
    """Valida autorização contextual em Tarefas (visibilidade privada vs equipe)."""
    creator = create_test_user(db_session, "task_creator", ["tasks:read", "tasks:write", "attachment:read", "attachment:upload", "attachment:delete"])
    assigned = create_test_user(db_session, "task_assigned", ["tasks:read", "tasks:write", "attachment:read", "attachment:upload"])
    colleague = create_test_user(db_session, "task_colleague", ["tasks:read", "tasks:write", "attachment:read", "attachment:upload"])
    admin = create_test_user(db_session, "task_admin", [], is_admin=True)

    # 1. Private task
    private_task = Task(
        title="Tarefa Confidencial Diretoria",
        creator_id=creator.id,
        visibility="privado",
        status="pendente",
    )
    private_task.assigned_users = [assigned]
    db_session.add(private_task)
    db_session.commit()
    db_session.refresh(private_task)

    service = FileAccessService()

    # READ private task: creator and assigned CAN read; colleague CANNOT
    assert service.can_read(db_session, creator, "task", private_task.id) is True
    assert service.can_read(db_session, assigned, "task", private_task.id) is True
    assert service.can_read(db_session, colleague, "task", private_task.id) is False
    assert service.can_read(db_session, admin, "task", private_task.id) is True

    # UPLOAD private task: creator and assigned CAN upload; colleague CANNOT
    assert service.can_upload(db_session, creator, "task", private_task.id) is True
    assert service.can_upload(db_session, assigned, "task", private_task.id) is True
    assert service.can_upload(db_session, colleague, "task", private_task.id) is False
    assert service.can_upload(db_session, admin, "task", private_task.id) is True

    # 2. Public task ("equipe"): colleague CAN read
    public_task = Task(
        title="Troca de Toner CPD",
        creator_id=creator.id,
        visibility="equipe",
        status="pendente",
    )
    db_session.add(public_task)
    db_session.commit()
    db_session.refresh(public_task)

    assert service.can_read(db_session, colleague, "task", public_task.id) is True


# ==============================================================================
# 5. MAINTENANCE ATTACHMENT VALIDATOR TESTS
# ==============================================================================

def test_maintenance_contextual_authorization(db_session):
    """Valida autorização contextual em Manutenções."""
    tech = create_test_user(db_session, "maint_tech", ["maintenance:read", "maintenance:write", "attachment:read", "attachment:upload", "attachment:delete"])
    other_user = create_test_user(db_session, "maint_other", ["maintenance:read", "attachment:read"])
    admin = create_test_user(db_session, "maint_admin", [], is_admin=True)

    maint = MaintenanceRecord(
        title="Manutenção Preventiva Nobreak",
        maintenance_type="preventiva",
        status="em_andamento",
        technician_id=tech.id,
    )
    db_session.add(maint)
    db_session.commit()
    db_session.refresh(maint)

    service = FileAccessService()

    assert service.can_read(db_session, other_user, "maintenance", maint.id) is True
    assert service.can_upload(db_session, tech, "maintenance", maint.id) is True
    assert service.can_upload(db_session, other_user, "maintenance", maint.id) is False
    assert service.can_upload(db_session, admin, "maintenance", maint.id) is True

    # Cancelled maintenance rejects upload
    maint.status = "cancelada"
    db_session.commit()
    assert service.can_upload(db_session, tech, "maintenance", maint.id) is False


# ==============================================================================
# 6. ATTENDANCE ATTACHMENT VALIDATOR TESTS
# ==============================================================================

def test_attendance_contextual_authorization(db_session):
    """Valida autorização contextual em Atendimentos."""
    responsible_tech = create_test_user(db_session, "att_resp", ["attendance:read", "attendance:write", "attachment:read", "attachment:upload", "attachment:delete"])
    other_tech = create_test_user(db_session, "att_other", ["attendance:read", "attendance:write", "attachment:read", "attachment:upload"])
    admin = create_test_user(db_session, "att_admin", [], is_admin=True)

    attendance = Attendance(
        title="Queda de link fibra",
        status="em_andamento",
        technician_id=responsible_tech.id,
    )
    db_session.add(attendance)
    db_session.commit()
    db_session.refresh(attendance)

    service = FileAccessService()

    # Both can read
    assert service.can_read(db_session, responsible_tech, "attendance", attendance.id) is True
    assert service.can_read(db_session, other_tech, "attendance", attendance.id) is True

    # Only responsible tech or admin can upload
    assert service.can_upload(db_session, responsible_tech, "attendance", attendance.id) is True
    assert service.can_upload(db_session, other_tech, "attendance", attendance.id) is False
    assert service.can_upload(db_session, admin, "attendance", attendance.id) is True


# ==============================================================================
# 7. EQUIPMENT ATTACHMENT VALIDATOR TESTS
# ==============================================================================

def test_equipment_contextual_authorization(db_session):
    """Valida autorização contextual em Equipamentos (ativo vs descartado)."""
    tech = create_test_user(db_session, "eq_tech", ["equipment:read", "equipment:write", "attachment:read", "attachment:upload", "attachment:delete"])
    admin = create_test_user(db_session, "eq_admin", [], is_admin=True)

    eq = Equipment(
        patrimony=f"PAT-{uuid.uuid4().hex[:6]}",
        equipment_type="desktop",
        brand="Dell",
        model="OptiPlex 7090",
        status="ativo",
    )
    db_session.add(eq)
    db_session.commit()
    db_session.refresh(eq)

    service = FileAccessService()

    assert service.can_read(db_session, tech, "equipment", eq.id) is True
    assert service.can_upload(db_session, tech, "equipment", eq.id) is True

    # Discarded equipment denies access to regular technicians
    eq.status = "descartado"
    db_session.commit()

    assert service.can_read(db_session, tech, "equipment", eq.id) is False
    assert service.can_upload(db_session, tech, "equipment", eq.id) is False
    assert service.can_read(db_session, admin, "equipment", eq.id) is True
    assert service.can_upload(db_session, admin, "equipment", eq.id) is True


# ==============================================================================
# 8. KNOWLEDGE ATTACHMENT VALIDATOR TESTS
# ==============================================================================

def test_knowledge_contextual_authorization(db_session):
    """Valida autorização contextual em Base de Conhecimento (publicado vs rascunho)."""
    author = create_test_user(db_session, "kb_author", ["knowledge:read", "knowledge:write", "attachment:read", "attachment:upload", "attachment:delete"])
    other_reader = create_test_user(db_session, "kb_reader", ["knowledge:read", "knowledge:write", "attachment:read", "attachment:upload"])
    admin = create_test_user(db_session, "kb_admin", [], is_admin=True)

    # 1. Draft article
    draft = KnowledgeArticle(
        title="Procedimento de Backup Rascunho",
        content="Instrucoes em elaboracao",
        status="rascunho",
        author_id=author.id,
    )
    db_session.add(draft)
    db_session.commit()
    db_session.refresh(draft)

    service = FileAccessService()

    # Draft: only author and admin can read/upload
    assert service.can_read(db_session, author, "knowledge", draft.id) is True
    assert service.can_read(db_session, other_reader, "knowledge", draft.id) is False
    assert service.can_read(db_session, admin, "knowledge", draft.id) is True

    assert service.can_upload(db_session, author, "knowledge", draft.id) is True
    assert service.can_upload(db_session, other_reader, "knowledge", draft.id) is False
    assert service.can_upload(db_session, admin, "knowledge", draft.id) is True

    # 2. Published article: anyone with knowledge:read can read
    published = KnowledgeArticle(
        title="Manual de Configuração VPN",
        content="Passo a passo VPN",
        status="publicado",
        author_id=author.id,
    )
    db_session.add(published)
    db_session.commit()
    db_session.refresh(published)

    assert service.can_read(db_session, other_reader, "knowledge", published.id) is True
    # But only author can attach to their article
    assert service.can_upload(db_session, other_reader, "knowledge", published.id) is False


# ==============================================================================
# 9. ENFORCE HELPERS & DELETE RULES TESTS
# ==============================================================================

def test_ensure_access_helpers_raise_http_exceptions(db_session):
    """ensure_read_access e ensure_upload_access disparam HTTPException apropriada."""
    outsider = create_test_user(db_session, "ensure_outsider", ["attachment:read"])
    service = FileAccessService()

    with pytest.raises(HTTPException) as exc_info:
        service.ensure_read_access(db_session, outsider, "project", 99999999)
    assert exc_info.value.status_code == 404

    with pytest.raises(HTTPException) as exc_info:
        service.ensure_upload_access(db_session, outsider, "project", 99999999)
    assert exc_info.value.status_code == 403
