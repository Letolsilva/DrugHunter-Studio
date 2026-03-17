"""
PDB Explorer API — FastAPI app principal

Arquitetura Hexagonal:
  core/          → segurança e dependencies de injeção
  domain/        → modelos ORM e schemas Pydantic
  infra/db/      → banco de dados (engine, sessão, configs)
  infra/external/→ adapter externo (RCSB scraper)
  infra/         → scheduler de limpeza TTL
  modules/auth/  → routes → use_cases → service  (autenticação)
  modules/search/→ routes → use_cases → service  (busca de proteínas)
  modules/admin/ → routes → use_cases → service  (administração)
"""

import logging
import asyncio
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.infra.db.database import criar_tabelas, SessionLocal, get_config
from app.routes.auth import router as auth_router
from app.routes.search import router as search_router
from app.routes.admin import router as admin_router

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("pdb_explorer")


@asynccontextmanager
async def lifespan(app: FastAPI):
    criar_tabelas()
    logger.info("✅ Banco de dados inicializado")

    db = SessionLocal()
    try:
        ttl = get_config(db, "ttl_dias", "30")
        limpeza = get_config(db, "limpeza_automatica", "true")
        logger.info(f"⚙️  TTL: {ttl} dias | Limpeza automática: {limpeza}")
    finally:
        db.close()

    from app.infra.scheduler import tarefa_limpeza_ttl

    task = asyncio.create_task(tarefa_limpeza_ttl())
    logger.info("🕐 Scheduler de limpeza TTL iniciado")

    yield
    task.cancel()
    logger.info("👋 API encerrando")


app = FastAPI(
    title="PDB Explorer API",
    description="API para busca e análise de estruturas proteicas do RCSB PDB",
    version="4.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000", "*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(search_router)
app.include_router(admin_router)


@app.get("/health")
def health():
    return {"status": "ok", "version": "4.0.0"}
