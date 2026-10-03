"""
Configuração global do pytest — ISOLAMENTO DO BANCO DE TESTES.

Este arquivo é carregado pelo pytest antes de qualquer módulo de teste e
antes de `app.database` ser importado. Ele redireciona DATABASE_URL para um
banco exclusivo de testes (`centralsuporte_test`), recriado do zero a cada
execução, e redireciona UPLOAD_DIR para um diretório temporário.

NUNCA remova este arquivo: sem ele, os testes escrevem no banco real da
aplicação (foi assim até 2026-10-03 e o banco principal ficou poluído com
centenas de usuários, tarefas e lembretes de teste).
"""
import os
import tempfile

from sqlalchemy import create_engine, text
from sqlalchemy.engine import make_url

_main_url = make_url(
    os.environ.get(
        "DATABASE_URL",
        "postgresql://suporte:suporte_password@localhost:5432/centralsuporte_db",
    )
)
_test_url = make_url(os.environ["TEST_DATABASE_URL"]) if os.environ.get("TEST_DATABASE_URL") else _main_url.set(
    database="centralsuporte_test"
)

if not (_test_url.database or "").endswith("_test"):
    raise RuntimeError(
        f"Banco de testes inválido: '{_test_url.database}'. O nome deve terminar com '_test' "
        "para evitar que a suíte apague ou suje o banco real."
    )

os.environ["DATABASE_URL"] = _test_url.render_as_string(hide_password=False)
os.environ["UPLOAD_DIR"] = tempfile.mkdtemp(prefix="centralsuporte_test_uploads_")


def _recreate_test_database() -> None:
    admin_engine = create_engine(_test_url.set(database="postgres"), isolation_level="AUTOCOMMIT")
    with admin_engine.connect() as conn:
        exists = conn.execute(
            text("SELECT 1 FROM pg_database WHERE datname = :name"), {"name": _test_url.database}
        ).scalar()
        if not exists:
            conn.execute(text(f'CREATE DATABASE "{_test_url.database}"'))
    admin_engine.dispose()

    # Importado só agora para que app.database já use a DATABASE_URL de teste.
    from app.database import engine, SessionLocal, Base
    from app import models  # noqa: F401  (registra todas as tabelas no metadata)
    from app.initial_data import init_db_data

    with engine.begin() as conn:
        conn.execute(text("DROP SCHEMA public CASCADE"))
        conn.execute(text("CREATE SCHEMA public"))
    Base.metadata.create_all(bind=engine)

    db = SessionLocal()
    try:
        init_db_data(db)  # permissões, perfis padrão e usuário admin/admin123
    finally:
        db.close()


def pytest_sessionstart(session):
    _recreate_test_database()
