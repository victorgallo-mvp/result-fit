from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from app.config import settings
from app.database import connect_db, disconnect_db
from app.services.student_service import migrar_alunos_legados
from app.routes import auth, students, attendances, payments, financial, dashboard, avaliacoes


@asynccontextmanager
async def lifespan(app: FastAPI):
    await connect_db()
    await migrar_alunos_legados()
    yield
    await disconnect_db()


app = FastAPI(title="Personal Trainer System", version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(students.router)
app.include_router(attendances.router)
app.include_router(payments.router)
app.include_router(financial.router)
app.include_router(dashboard.router)
app.include_router(avaliacoes.router)


@app.get("/health")
async def health():
    return {"status": "ok"}
