"""
Infra — Configuração do banco de dados

Suporta SQLite (dev) e PostgreSQL (prod) via DATABASE_URL.
Inclui seed das configs padrão no SystemConfig.
"""

import os
from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker
from app.domain.models import Base, SystemConfig

DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "sqlite:///./pdb_explorer.db",
    # Para PostgreSQL (produção):
    # "postgresql://user:senha@localhost:5432/pdb_explorer"
)

# ── Engine ────────────────────────────────────────────────────

connect_args = {}
if DATABASE_URL.startswith("sqlite"):
    connect_args = {"check_same_thread": False}

engine = create_engine(DATABASE_URL, connect_args=connect_args)

# WAL mode no SQLite — melhor concorrência com múltiplos leitores
if DATABASE_URL.startswith("sqlite"):

    @event.listens_for(engine, "connect")
    def set_sqlite_pragma(dbapi_conn, connection_record):
        cursor = dbapi_conn.cursor()
        cursor.execute("PRAGMA journal_mode=WAL")
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.close()


SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def get_db():
    """Dependency FastAPI — injeta sessão do banco nas rotas."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# ── Seed de configs padrão ────────────────────────────────────

CONFIGS_PADRAO = [
    {
        "chave": "ttl_dias",
        "valor": "30",
        "descricao": "Dias sem consulta para uma proteína ser marcada como expirada",
    },
    {
        "chave": "max_por_proteina",
        "valor": "50",
        "descricao": "Número máximo de estruturas retornadas por proteína buscada",
    },
    {
        "chave": "limpeza_automatica",
        "valor": "true",
        "descricao": "Executar limpeza de TTL automaticamente ao iniciar o servidor",
    },
]


def criar_tabelas():
    """Cria tabelas e popula configs padrão se ainda não existirem."""
    Base.metadata.create_all(bind=engine)
    _seed_configs()


def _seed_configs():
    """Insere configs padrão sem sobrescrever valores já customizados."""
    db = SessionLocal()
    try:
        for cfg in CONFIGS_PADRAO:
            existente = db.query(SystemConfig).filter_by(chave=cfg["chave"]).first()
            if not existente:
                db.add(SystemConfig(**cfg))
        db.commit()
    finally:
        db.close()


def get_config(db, chave: str, fallback=None):
    """Lê uma configuração do banco. Retorna fallback se não existir."""
    cfg = db.query(SystemConfig).filter_by(chave=chave).first()
    return cfg.valor if cfg else fallback


def set_config(db, chave: str, valor: str):
    """Atualiza ou cria uma configuração no banco."""
    cfg = db.query(SystemConfig).filter_by(chave=chave).first()
    if cfg:
        cfg.valor = valor
    else:
        cfg = SystemConfig(chave=chave, valor=valor)
        db.add(cfg)
    db.commit()
    db.refresh(cfg)
    return cfg
