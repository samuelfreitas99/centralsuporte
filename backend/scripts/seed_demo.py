"""
Popula um banco de DEMONSTRAÇÃO com dados realistas de suporte de varejo/farmácia.

Uso (somente em banco cujo nome termina com `_demo`):
    DATABASE_URL=postgresql://.../centralsuporte_demo python -m scripts.seed_demo

Serve para revisar telas, tirar screenshots e apresentar o sistema sem tocar no banco real.
Os dados passam pela própria API (mesmas regras de negócio da aplicação).
"""
import os
import sys
from datetime import datetime, timedelta, timezone

from sqlalchemy.engine import make_url

DB_URL = os.environ.get("DATABASE_URL", "")
if not (make_url(DB_URL).database or "").endswith("_demo"):
    sys.exit("Recusado: este script só roda em banco cujo nome termina com '_demo'.")

from fastapi.testclient import TestClient  # noqa: E402

from app.database import Base, SessionLocal, engine  # noqa: E402
from app import models  # noqa: E402,F401
from app.initial_data import init_db_data  # noqa: E402
from app.main import app  # noqa: E402

NOW = datetime.now(timezone.utc)


def iso(days: float = 0, hours: float = 0) -> str:
    return (NOW + timedelta(days=days, hours=hours)).isoformat()


def main() -> None:
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    init_db_data(db)
    roles = {r.name: r.id for r in db.query(models.Role).all()}
    db.close()

    client = TestClient(app)

    def login(username: str, password: str) -> dict:
        token = client.post("/auth/login", json={"username": username, "password": password}).json()["access_token"]
        return {"Authorization": f"Bearer {token}"}

    admin = login("admin", "admin123")

    def post(path: str, payload: dict, headers: dict | None = None) -> dict:
        res = client.post(path, json=payload, headers=headers or admin)
        if res.status_code >= 300:
            raise RuntimeError(f"{path}: {res.status_code} {res.text}")
        return res.json() if res.content else {}

    # --- Equipe ---
    people = {}
    for username, name, role, job in [
        ("carlos", "Carlos Mendes", "Técnico", "Técnico de Suporte N1"),
        ("ana", "Ana Paula Souza", "Técnico", "Técnica de Suporte N2"),
        ("marcos", "Marcos Lima", "Gestor", "Coordenador de TI"),
        ("julia", "Júlia Rocha", "Consulta", "Analista Administrativa"),
    ]:
        people[username] = post(
            "/users",
            {
                "username": username,
                "email": f"{username}@exemplo.local",
                "password": "demo12345",
                "full_name": name,
                "display_name": name.split()[0],
                "job_title": job,
                "role_ids": [roles[role]],
            },
        )
    carlos = login("carlos", "demo12345")
    ana = login("ana", "demo12345")

    # --- Lojas, departamentos e equipamentos ---
    stores = {}
    for code, name in [("MTZ", "Matriz"), ("L01", "Loja 01 - Centro"), ("L02", "Loja 02 - Shopping"), ("L03", "Loja 03 - Bairro Novo"), ("CD", "Centro de Distribuição")]:
        stores[code] = post("/infrastructure/stores", {"name": name, "code": code, "phone": "(31) 3333-0000"})
    depts = {}
    for code in ("L01", "L02", "L03"):
        for dname in ("Frente de caixa", "Farmácia", "Gerência"):
            depts[(code, dname)] = post("/infrastructure/departments", {"name": dname, "store_id": stores[code]["id"]})
    depts[("MTZ", "CPD")] = post("/infrastructure/departments", {"name": "CPD", "store_id": stores["MTZ"]["id"]})
    depts[("MTZ", "Administrativo")] = post("/infrastructure/departments", {"name": "Administrativo", "store_id": stores["MTZ"]["id"]})

    eq = {}

    def equipment(key, etype, hostname, store, dept, ip, brand, model, status="ativo", user=None):
        eq[key] = post(
            "/infrastructure/equipment",
            {
                "equipment_type": etype,
                "hostname": hostname,
                "patrimony": f"PAT-{1000 + len(eq)}",
                "store_id": stores[store]["id"],
                "department_id": depts[(store, dept)]["id"],
                "ip_address": ip,
                "brand": brand,
                "model": model,
                "status": status,
                "assigned_user": user,
                "operating_system": "Windows 10 Pro" if etype in ("computador", "notebook") else None,
            },
        )

    for i, store in enumerate(("L01", "L02", "L03"), start=1):
        for pdv in (1, 2, 3):
            equipment(f"{store}-PDV{pdv}", "computador", f"{store}-PDV0{pdv}", store, "Frente de caixa", f"10.0.{i}.{10 + pdv}", "Bematech", "RC-8400")
        equipment(f"{store}-IMP", "impressora", f"{store}-IMP-FISCAL", store, "Frente de caixa", f"10.0.{i}.30", "Epson", "TM-T20X")
        equipment(f"{store}-GER", "computador", f"{store}-GERENCIA", store, "Gerência", f"10.0.{i}.50", "Dell", "OptiPlex 3080", user="Gerente da loja")
    eq["L02-PDV2"] = client.put(
        f"/infrastructure/equipment/{eq['L02-PDV2']['id']}", json={"equipment_type": "computador", "status": "em_manutencao"}, headers=admin
    ).json()
    equipment("SRV", "servidor", "SRV-ERP-01", "MTZ", "CPD", "10.0.0.5", "Dell", "PowerEdge T140")
    equipment("SW", "switch", "SW-CORE-MTZ", "MTZ", "CPD", "10.0.0.2", "HPE", "Aruba 2930F")
    equipment("FW", "roteador", "FW-MTZ", "MTZ", "CPD", "10.0.0.1", "Fortinet", "FortiGate 60F")
    equipment("NB1", "notebook", "NB-SUPORTE-01", "MTZ", "Administrativo", "10.0.0.101", "Lenovo", "ThinkPad E14", user="Carlos Mendes")

    # --- Conhecimento ---
    cats = {}
    for name, color in [("Frente de caixa", "#3b82f6"), ("Impressoras", "#f59e0b"), ("Redes", "#10b981"), ("Servidores", "#8b5cf6"), ("Windows", "#0ea5e9")]:
        cats[name] = post("/knowledge/categories", {"name": name, "color": color})
    articles = [
        ("PDV travado na tela de venda", "Frente de caixa", ["pdv", "caixa"], "PDV não responde durante a venda.",
         "Encerrar o processo do PDV pelo Gerenciador de Tarefas e reabrir. Se persistir, reiniciar o serviço do banco local.",
         "taskkill /IM pdv.exe /F\nnet stop MSSQL$PDV\nnet start MSSQL$PDV"),
        ("Impressora fiscal não imprime cupom", "Impressoras", ["impressora", "cupom", "epson"], "Venda finaliza mas o cupom não sai.",
         "Verificar papel e tampa; reiniciar o spooler; conferir a porta COM/USB configurada no PDV.", "net stop spooler\nnet start spooler"),
        ("Loja sem internet: checklist rápido", "Redes", ["rede", "link", "4g"], "Loja sem acesso ao sistema central.",
         "Conferir luzes do modem, reiniciar o roteador, ativar o link 4G de contingência e abrir chamado na operadora.", "ping 8.8.8.8\ntracert 10.0.0.5"),
        ("Liberar espaço no servidor ERP", "Servidores", ["servidor", "disco"], "Alerta de disco acima de 90%.",
         "Limpar logs antigos do ERP e a pasta de backups locais com mais de 30 dias.", None),
        ("Configurar leitor de código de barras", "Frente de caixa", ["leitor", "honeywell"], "Leitor lê mas não envia o código.",
         "Escanear o código de configuração 'USB Keyboard' do manual e o sufixo 'Enter'.", None),
        ("Mapear unidade de rede da gerência", "Windows", ["windows", "rede"], "Gerência sem acesso à pasta compartilhada.",
         "Mapear \\\\SRV-ERP-01\\gerencia com o usuário da loja.", "net use G: \\\\SRV-ERP-01\\gerencia /persistent:yes"),
    ]
    art_ids = []
    for title, cat, tags, problem, solution, commands in articles:
        art_ids.append(post(
            "/knowledge/articles",
            {"title": title, "summary": problem, "content": f"## Problema\n{problem}\n\n## Solução\n{solution}",
             "problem": problem, "solution": solution, "commands": commands, "category_id": cats[cat]["id"],
             "status": "publicado", "tag_names": tags},
            ana,
        )["id"])
    post("/knowledge/articles", {"title": "Rascunho: atualização do TEF", "content": "Em elaboração.", "category_id": cats["Frente de caixa"]["id"]}, carlos)

    # --- Comandos e respostas padrão ---
    commands = [
        ("Reiniciar spooler de impressão", "Windows", "impressoras", [("Parar", "net stop spooler"), ("Limpar fila", "del /Q %systemroot%\\System32\\spool\\PRINTERS\\*"), ("Iniciar", "net start spooler")], None),
        ("Testar conectividade da loja", "Windows", "redes", [("Gateway", "ping 10.0.1.1"), ("Servidor ERP", "ping 10.0.0.5"), ("Internet", "ping 8.8.8.8")], None),
        ("Liberar IP e renovar", "Windows", "redes", [("Liberar", "ipconfig /release"), ("Renovar", "ipconfig /renew"), ("DNS", "ipconfig /flushdns")], None),
        ("Status das portas do switch", "HPE Aruba", "redes", [("Interfaces", "show interfaces brief"), ("VLANs", "show vlans")], None),
        ("Reiniciar serviço do banco do PDV", "Windows", "pdv", [("Parar", "net stop MSSQL$PDV"), ("Iniciar", "net start MSSQL$PDV")], "Só execute com o caixa fechado: vendas em andamento são perdidas."),
    ]
    for title, system, category, steps, warning in commands:
        post("/commands", {"title": title, "system": system, "category": category, "warning": warning,
                           "steps": [{"position": i + 1, "title": t, "command_text": c} for i, (t, c) in enumerate(steps)]}, ana)
    for title, content, audience in [
        ("Chamado recebido", "Olá! Recebemos seu chamado e um técnico já está analisando. Retornamos em breve.", "usuario_final"),
        ("Aguardando operadora", "O problema está no link da operadora. Já abrimos protocolo e acompanhamos a normalização.", "usuario_final"),
        ("Solicitação de peça", "Precisamos da reposição do item abaixo para concluir o atendimento.", "fornecedor"),
    ]:
        post("/responses", {"title": title, "content": content, "audience": audience, "category": "geral"}, ana)

    # --- Atendimentos ---
    attendances = [
        ("PDV 02 travando na finalização", "L02-PDV2", "2026100300012", "em_andamento", carlos,
         "Caixa trava ao finalizar venda com cartão.", "Erro de comunicação com o TEF.", None, None),
        ("Impressora fiscal sem imprimir", "L01-IMP", "2026100200034", "resolvido", carlos,
         "Cupom não sai após a venda.", "Spooler parado.", "Spooler reiniciado e fila limpa.", "net stop spooler\nnet start spooler"),
        ("Loja 03 sem internet", "L03-GER", "2026100100087", "resolvido", ana,
         "Loja sem acesso ao ERP desde a abertura.", "Queda do link principal.", "Link 4G ativado; operadora normalizou às 11h.", "ping 8.8.8.8"),
        ("Leitor não lê código de barras", "L01-PDV1", None, "resolvido", carlos,
         "Leitor acende mas não envia código.", "Configuração resetada.", "Leitor reconfigurado para USB Keyboard.", None),
        ("Gerência sem acesso à pasta", "L02-GER", "2026093000021", "em_andamento", ana,
         "Pasta da gerência não aparece.", None, None, None),
        ("Servidor ERP lento", "SRV", "2026092900045", "resolvido", ana,
         "Sistema lento em todas as lojas.", "Disco com 96% de uso.", "Logs antigos removidos; uso caiu para 61%.", None),
    ]
    att_ids = []
    for title, eqk, otrs, status, who, problem, diag, sol, cmds in attendances:
        att = post("/attendances", {
            "title": title, "equipment_id": eq[eqk]["id"], "otrs_ticket": otrs,
            "otrs_url": f"https://otrs.exemplo.local/index.pl?Action=AgentTicketZoom;TicketNumber={otrs}" if otrs else None,
            "status": status, "problem_description": problem, "diagnosis": diag, "solution": sol, "commands_used": cmds,
            "requester_name": "Gerente da loja",
        }, who)
        att_ids.append(att["id"])
    post(f"/attendances/{att_ids[0]}/notes", {"note": "Testado com outro pinpad: mesmo erro. Aguardando técnico do TEF."}, carlos)

    # --- Projeto ---
    project = post("/projects/", {"title": "Abertura da Loja 04", "description": "Infraestrutura completa da nova loja.",
                                  "status": "em_andamento", "start_date": iso(-10), "expected_end_date": iso(20)}, admin)

    # --- Tarefas ---
    ids = {k: v["id"] for k, v in people.items()}
    tasks = [
        ("Instalar PDVs da Loja 04", "alta", "em_andamento", 5, [ids["carlos"]], project["id"]),
        ("Passar cabeamento do rack da Loja 04", "media", "pendente", 8, [ids["ana"]], project["id"]),
        ("Trocar nobreak do CPD", "urgente", "pendente", -1, [ids["ana"]], None),
        ("Atualizar antivírus das gerências", "media", "pendente", -3, [ids["carlos"]], None),
        ("Inventário de impressoras fiscais", "baixa", "pendente", 12, [], None),
        ("Revisar backups do ERP", "alta", "concluida", -2, [ids["ana"]], None),
    ]
    for title, prio, status, due, assignees, proj in tasks:
        post("/tasks", {"title": title, "priority": prio, "status": status, "due_date": iso(due),
                        "assigned_user_ids": assignees, "project_id": proj, "category": "Infraestrutura"}, admin)

    # --- Manutenções ---
    for title, keys, mtype, status, days in [
        ("Limpeza preventiva dos PDVs - Loja 01", ["L01-PDV1", "L01-PDV2", "L01-PDV3"], "preventiva", "agendada", 0),
        ("Troca de fonte do PDV 02", ["L02-PDV2"], "corretiva", "em_andamento", -1),
        ("Atualização de firmware do switch", ["SW"], "atualizacao", "agendada", 4),
        ("Revisão do servidor ERP", ["SRV"], "preventiva", "concluida", -15),
    ]:
        post("/maintenances", {"title": title, "equipment_ids": [eq[k]["id"] for k in keys], "maintenance_type": mtype,
                               "status": status, "scheduled_date": iso(days, 3),
                               "checklist_title": "Checklist", "checklist_items": ["Desligar e limpar", "Testar funcionamento"]}, carlos)

    # --- Licenças e estoque ---
    post("/infrastructure/licenses", {"name": "Microsoft 365 Business", "license_type": "saas", "vendor": "Microsoft", "total_seats": 15, "expiration_date": iso(12)})
    post("/infrastructure/licenses", {"name": "Antivírus corporativo", "license_type": "saas", "vendor": "ESET", "total_seats": 30, "expiration_date": iso(180)})
    for name, cat, qty, minq in [("Bobina térmica 80mm", "suprimentos", 3, 20), ("Mouse USB", "perifericos", 8, 5), ("Teclado USB", "perifericos", 1, 4), ("Cabo de rede Cat6 (m)", "cabos", 150, 50)]:
        post("/infrastructure/stock/items", {"name": name, "category": cat, "current_quantity": qty, "min_quantity": minq, "location": "CPD - Matriz"})

    # --- Agenda e lembretes ---
    post("/calendar/events", {"title": "Visita técnica Loja 04", "start_time": iso(2, 2), "end_time": iso(2, 5), "event_type": "visita", "project_id": project["id"]}, admin)
    post("/reminders", {"title": "Ligar para a operadora sobre o link da Loja 03", "remind_at": iso(0, 2), "priority": "alta"}, admin)
    post("/reminders", {"title": "Conferir backup de sexta", "remind_at": iso(1), "priority": "media"}, admin)

    print("Demo pronta: admin/admin123, carlos|ana|marcos|julia / demo12345")


if __name__ == "__main__":
    main()
