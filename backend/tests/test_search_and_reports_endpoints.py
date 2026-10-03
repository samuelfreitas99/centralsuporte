import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.database import Base, engine, SessionLocal
from app.models import (
    User,
    Role,
    KnowledgeArticle,
    KnowledgeCategory,
    Command,
    Attendance,
    Equipment,
    MaintenanceRecord,
    Store,
)
from app.auth import get_password_hash, create_access_token

client = TestClient(app)


@pytest.fixture(scope="module", autouse=True)
def setup_search_and_reports_data():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    # User
    role = db.query(Role).filter(Role.name == "Administrador").first()
    user = db.query(User).filter(User.username == "search_admin").first()
    if not user:
        user = User(
            username="search_admin",
            email="search_admin@centralsuporte.local",
            hashed_password=get_password_hash("admin123"),
            is_active=True,
            role_id=role.id if role else None,
        )
        db.add(user)
        db.flush()

    # Store
    store = db.query(Store).filter(Store.name == "Loja Busca 01").first()
    if not store:
        store = Store(name="Loja Busca 01", code="LB-01")
        db.add(store)
        db.flush()

    # Equipment
    eq = db.query(Equipment).filter(Equipment.hostname == "SW-CORE-SEARCH").first()
    if not eq:
        eq = Equipment(
            hostname="SW-CORE-SEARCH",
            patrimony="PAT-SEARCH-01",
            equipment_type="switch",
            ip_address="10.10.10.1",
            store_id=store.id,
            status="ativo",
        )
        db.add(eq)
        db.flush()

    # Category & Article
    cat = db.query(KnowledgeCategory).filter(KnowledgeCategory.name == "Redes Search").first()
    if not cat:
        cat = KnowledgeCategory(name="Redes Search", description="Cat Search")
        db.add(cat)
        db.flush()

    art = db.query(KnowledgeArticle).filter(KnowledgeArticle.title == "Procedimento Switch HP Core").first()
    if not art:
        art = KnowledgeArticle(
            title="Procedimento Switch HP Core",
            summary="Manual para reset do Switch HP Core",
            content="Instruções completas para configuração de VLAN no switch core",
            category_id=cat.id,
            author_id=user.id,
            status="publicado",
        )
        db.add(art)

    # Command
    cmd = db.query(Command).filter(Command.command == "display ip interface switch").first()
    if not cmd:
        cmd = Command(
            title="Status Interfaces Switch",
            command="display ip interface switch",
            description="Exibe interfaces e status do switch",
            category="redes",
            author_id=user.id,
        )
        db.add(cmd)

    # Attendance
    att = db.query(Attendance).filter(Attendance.title == "Queda de portas no switch core").first()
    if not att:
        att = Attendance(
            title="Queda de portas no switch core",
            otrs_ticket="2026092410009999",
            problem_description="Portas 1 a 4 com instabilidade no switch",
            solution="Troca do patch cord e reinicialização",
            technician_id=user.id,
            equipment_id=eq.id,
            status="resolvido",
        )
        db.add(att)

    # Maintenance
    maint = db.query(MaintenanceRecord).filter(MaintenanceRecord.title == "Revisão Preventiva Switch Core").first()
    if not maint:
        maint = MaintenanceRecord(
            title="Revisão Preventiva Switch Core",
            equipment_id=eq.id,
            store_id=store.id,
            technician_id=user.id,
            maintenance_type="preventiva",
            status="concluida",
            cost=120.0,
            description="Inspeção dos módulos de fibra e limpeza do switch",
            procedure_performed="Limpeza efetuada com sucesso",
            result="sucesso",
        )
        db.add(maint)

    db.commit()
    db.close()


def get_token():
    return create_access_token(data={"sub": "search_admin"})


def test_global_search_unified_and_filtered():
    token = get_token()
    headers = {"Authorization": f"Bearer {token}"}

    # 1. Search term 'switch' across all entities
    res = client.get("/search/global", params={"q": "switch"}, headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert data["query"] == "switch"
    assert data["total_results"] >= 4

    types = {item["entity_type"] for item in data["results"]}
    assert "knowledge" in types
    assert "command" in types
    assert "attendance" in types
    assert "equipment" in types

    # 2. Filter by entity_type='equipment'
    res_eq = client.get(
        "/search/global", params={"q": "switch", "entity_type": "equipment"}, headers=headers
    )
    assert res_eq.status_code == 200
    data_eq = res_eq.json()
    assert all(item["entity_type"] == "equipment" for item in data_eq["results"])
    assert any(item["title"] == "SW-CORE-SEARCH" for item in data_eq["results"])


def test_operational_reports_summary():
    token = get_token()
    headers = {"Authorization": f"Bearer {token}"}

    res = client.get("/reports/summary", params={"days": 30}, headers=headers)
    assert res.status_code == 200
    report = res.json()

    assert report["period_days"] == 30
    assert report["attendances_total"] >= 1
    assert report["attendances_resolved"] >= 1
    assert report["resolution_rate"] > 0
    assert report["maintenances_total"] >= 1
    assert report["maintenances_preventive"] >= 1
    assert report["maintenances_total_cost"] >= 120.0

    # Recurrent equipment ranking
    assert len(report["recurrent_equipment"]) >= 1
    hostnames = {eq["hostname"] for eq in report["recurrent_equipment"]}
    assert "SW-CORE-SEARCH" in hostnames
    matching_eq = next(eq for eq in report["recurrent_equipment"] if eq["hostname"] == "SW-CORE-SEARCH")
    assert matching_eq["total_incidents"] >= 2

    # Top technicians
    assert len(report["top_technicians"]) >= 1
    assert any(t["username"] == "search_admin" for t in report["top_technicians"])


def test_operational_reports_csv_export():
    token = get_token()
    headers = {"Authorization": f"Bearer {token}"}

    res = client.get("/reports/export", params={"days": 30}, headers=headers)
    assert res.status_code == 200
    assert "text/csv" in res.headers.get("content-type", "")
    assert "attachment" in res.headers.get("content-disposition", "")
    content = res.text
    assert "Chamado OTRS" in content
    assert "Queda de portas no switch core" in content


def test_global_search_finds_multi_step_command_by_title_and_step():
    """Comandos multi-passo não usam a coluna legada `command`; a busca deve achar por título e passos."""
    headers = {"Authorization": f"Bearer {get_token()}"}
    created = client.post(
        "/commands",
        json={
            "title": "Reiniciar spooler remoto",
            "category": "windows",
            "steps": [{"position": 1, "title": "Parar", "command_text": "net stop spooler-xyz123"}],
        },
        headers=headers,
    )
    assert created.status_code in (200, 201), created.text
    cmd_id = created.json()["id"]

    for term in ("spooler remoto", "spooler-xyz123"):
        res = client.get(f"/search/global?q={term}&entity_type=command", headers=headers)
        assert res.status_code == 200
        hits = [r for r in res.json()["results"] if r["entity_type"] == "command"]
        assert any(r["id"] == cmd_id for r in hits), term
        hit = next(r for r in hits if r["id"] == cmd_id)
        assert hit["snippet"] == "net stop spooler-xyz123"
