from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database import SessionLocal
from app.initial_data import init_db_data
from app.routers import auth, users, tasks, checklists, reminders, calendar, knowledge, commands, responses

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Seed initial permissions, roles, and default admin if needed
    db = SessionLocal()
    try:
        init_db_data(db)
    finally:
        db.close()
    yield
    # Shutdown logic if any

app = FastAPI(
    title="Central Operacional do Suporte Técnico API",
    version="0.1.0",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
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

@app.get("/health")
def health_check():
    return {"status": "ok", "message": "API is running"}

@app.get("/")
def root():
    return {"message": "Welcome to Central de Suporte API"}
