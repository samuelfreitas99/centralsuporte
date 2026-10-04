import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database import SessionLocal
from app.initial_data import init_db_data
from app.routers import auth, users, tasks, checklists, reminders, calendar, knowledge, commands, responses, attendances, infrastructure, maintenances, attachments, search, reports, audit, automation, checklist_templates, projects, dashboard, push
from app.services.automation import start_automation_scheduler, stop_automation_scheduler

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Seed initial permissions, roles, and default admin if needed
    db = SessionLocal()
    try:
        init_db_data(db)
    finally:
        db.close()

    # Start background reactive rules scheduler
    start_automation_scheduler(interval_minutes=60)
    yield
    # Shutdown logic
    stop_automation_scheduler()

# Em produção a documentação interativa da API fica desligada (ENABLE_API_DOCS=0).
_docs_enabled = os.environ.get("ENABLE_API_DOCS", "1") == "1"

app = FastAPI(
    title="Central de Suporte API",
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/docs" if _docs_enabled else None,
    redoc_url="/redoc" if _docs_enabled else None,
    openapi_url="/openapi.json" if _docs_enabled else None,
)

app.add_middleware(
    CORSMiddleware,
    # Produção usa a mesma origem (nginx /api); CORS_ORIGINS="" desliga o acesso de outras origens.
    allow_origins=[o for o in os.environ.get("CORS_ORIGINS", "*").split(",") if o],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(users.router)
app.include_router(tasks.router)
app.include_router(checklists.router)
app.include_router(reminders.router)
app.include_router(calendar.router)
app.include_router(knowledge.router)
app.include_router(commands.router)
app.include_router(responses.router)
app.include_router(attendances.router)
app.include_router(infrastructure.router)
app.include_router(maintenances.router)
app.include_router(checklist_templates.router)
app.include_router(attachments.router)
app.include_router(search.router)
app.include_router(reports.router)
app.include_router(audit.router)
app.include_router(automation.router)
app.include_router(projects.router)
app.include_router(dashboard.router)
app.include_router(push.router)

@app.get("/health")
def health_check():
    return {"status": "ok", "message": "API is running"}

@app.get("/")
def root():
    return {"message": "Welcome to Central de Suporte API"}
