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
import os
from contextlib import asynccontextmanager
from pathlib import Path
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse
from dotenv import load_dotenv

load_dotenv()

# Suporta DOTENV_PATH para instalações .deb onde o .env fica em ~/.local/share/
_dotenv_extra = os.environ.get("DOTENV_PATH")
if _dotenv_extra:
    load_dotenv(_dotenv_extra, override=True)

from app.infra.db.database import criar_tabelas, SessionLocal, get_config
from app.routes.auth import router as auth_router
from app.routes.search import router as search_router
from app.routes.admin import router as admin_router
from app.routes.download import router as download_router
from app.routes.redocking import router as redocking_router

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("pdb_explorer")


@asynccontextmanager
async def lifespan(app: FastAPI):
    criar_tabelas()
    from pathlib import Path

    Path("pdb_files").mkdir(exist_ok=True)
    logger.info("✅ Banco de dados inicializado | pasta pdb_files/ garantida")

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
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:3000",
        "http://localhost:8080",
        "http://127.0.0.1:8080",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(Exception)
async def _handler_erro_inesperado(request: Request, exc: Exception):
    logger.exception("Erro interno não tratado: %s", exc)
    return JSONResponse(status_code=500, content={"detail": "Erro interno do servidor."})

app.include_router(auth_router)
app.include_router(search_router)
app.include_router(admin_router)
app.include_router(download_router)
app.include_router(redocking_router)


@app.get("/health")
def health():
    return {"status": "ok", "version": "4.0.0"}


# ── Frontend estático (executável) ────────────────────────────────────────────
# Serve os arquivos buildados do React quando rodando como executável.
# Em dev o Vite cuida disso separadamente — esta seção é ignorada.
_STATIC_DIR = Path(__file__).parent.parent / "static"
if _STATIC_DIR.exists():
    app.mount("/assets", StaticFiles(directory=_STATIC_DIR / "assets"), name="assets")

    # Em modo executável desabilita docs para não expor esquema da API
    app.openapi_url = None
    app.docs_url = None
    app.redoc_url = None

    @app.get("/{full_path:path}", include_in_schema=False)
    def serve_spa(full_path: str):
        """Retorna o index.html para qualquer rota não-API (SPA fallback)."""
        return FileResponse(_STATIC_DIR / "index.html")
