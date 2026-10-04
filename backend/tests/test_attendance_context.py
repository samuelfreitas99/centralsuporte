"""Contexto do atendimento (mesmo chamado OTRS / histórico do equipamento) e modelos de atendimento."""
import uuid

from fastapi.testclient import TestClient

from app.auth import create_access_token
from app.database import SessionLocal
from app.main import app
from app.models import Equipment

client = TestClient(app)
ADMIN = {"Authorization": f"Bearer {create_access_token(data={'sub': 'admin'})}"}


def equipment_id() -> int:
    db = SessionLocal()
    try:
        eq = Equipment(hostname=f"PDV-{uuid.uuid4().hex[:5]}", equipment_type="pdv", status="ativo")
        db.add(eq)
        db.commit()
        return eq.id
    finally:
        db.close()


def test_context_finds_same_ticket_and_equipment_history(monkeypatch):
    monkeypatch.setenv("OTRS_TICKET_URL", "https://otrs.local/index.pl?Action=AgentTicketZoom;TicketNumber={ticket}")
    ticket = f"2026{uuid.uuid4().int % 10**9}"
    eq = equipment_id()
    first = client.post("/attendances", json={"title": "PDV sem rede", "otrs_ticket": ticket, "equipment_id": eq, "solution": "Trocado o cabo"}, headers=ADMIN).json()
    client.post("/attendances", json={"title": "Outro", "equipment_id": eq}, headers=ADMIN)

    ctx = client.get(f"/attendances/context?otrs_ticket={ticket}&equipment_id={eq}", headers=ADMIN).json()
    assert ctx["otrs_url"].endswith(f"TicketNumber={ticket}")
    assert [a["id"] for a in ctx["same_ticket"]] == [first["id"]]
    assert len(ctx["equipment_history"]) == 2
    assert any(a["solution"] == "Trocado o cabo" for a in ctx["equipment_history"])

    # editando o próprio atendimento, ele não aparece como duplicado
    ctx = client.get(f"/attendances/context?otrs_ticket={ticket}&exclude_id={first['id']}", headers=ADMIN).json()
    assert ctx["same_ticket"] == []


def test_context_without_otrs_template_has_no_link(monkeypatch):
    monkeypatch.delenv("OTRS_TICKET_URL", raising=False)
    assert client.get("/attendances/context?otrs_ticket=123", headers=ADMIN).json()["otrs_url"] is None


def test_templates_crud_and_unique_name():
    name = f"Impressora fiscal {uuid.uuid4().hex[:4]}"
    res = client.post("/attendance-templates", json={"name": name, "title": "Impressora não imprime", "solution": "Reinstalar driver"}, headers=ADMIN)
    assert res.status_code == 201
    tpl = res.json()
    assert client.post("/attendance-templates", json={"name": name.upper()}, headers=ADMIN).status_code == 409
    assert any(t["id"] == tpl["id"] for t in client.get("/attendance-templates", headers=ADMIN).json())
    upd = client.put(f"/attendance-templates/{tpl['id']}", json={"name": name, "solution": "Novo"}, headers=ADMIN).json()
    assert upd["solution"] == "Novo"
    assert client.delete(f"/attendance-templates/{tpl['id']}", headers=ADMIN).status_code == 204
