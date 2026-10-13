"""
Infra — Configuração do banco de dados

Suporta SQLite (dev) e PostgreSQL (prod) via DATABASE_URL.
Inclui seed das configs padrão no SystemConfig.
"""

import os
from sqlalchemy import create_engine, event, text
from sqlalchemy.orm import sessionmaker
from app.domain.models import Base, SystemConfig

DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "sqlite:///./drughunter_studio.db",
    # Para PostgreSQL (produção):
    # "postgresql://user:senha@localhost:5432/drughunter_studio"
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
    {
        "chave": "drug_hunter_path",
        "valor": "",
        "descricao": "Caminho absoluto para o diretório raiz do DrugHunter",
    },
    {
        "chave": "python_bin",
        "valor": "",
        "descricao": "Interpretador Python usado para executar o DrugHunter",
    },
    {
        "chave": "chimera_path",
        "valor": "",
        "descricao": "Caminho para o diretório bin do UCSF Chimera (vazio = detecção automática)",
    },
    {
        "chave": "dock6_path",
        "valor": "",
        "descricao": "Caminho para o diretório bin do Dock6 (vazio = detecção automática)",
    },
    {
        "chave": "smtp_host",
        "valor": "",
        "descricao": "Host do servidor SMTP (ex: smtp.gmail.com)",
    },
    {
        "chave": "smtp_port",
        "valor": "587",
        "descricao": "Porta do servidor SMTP (587 para TLS, 465 para SSL)",
    },
    {
        "chave": "smtp_user",
        "valor": "",
        "descricao": "Email ou usuário para autenticar no servidor SMTP",
    },
    {
        "chave": "smtp_password",
        "valor": "",
        "descricao": "Senha SMTP (armazenada criptografada no banco de dados)",
    },
    {
        "chave": "smtp_from",
        "valor": "",
        "descricao": "Endereço remetente exibido nos emails (ex: DrugHunter Studio <email@gmail.com>)",
    },
]


def criar_tabelas():
    """Cria tabelas e popula configs padrão se ainda não existirem."""
    Base.metadata.create_all(bind=engine)
    _migrate_schema()
    _seed_configs()


def _migrate_schema():
    """Migrações incrementais de schema para bancos existentes.

    create_all() não altera tabelas já criadas. Cada bloco aqui trata uma
    coluna adicionada após o deploy inicial — idempotente, seguro rodar sempre.
    """
    with engine.connect() as conn:
        tables = {r[0] for r in conn.execute(text("SELECT name FROM sqlite_master WHERE type='table'"))}

        # md_jobs: consensus_job_id adicionado quando redocking foi renomeado para consenso
        if "md_jobs" in tables:
            cols = {row[1] for row in conn.execute(text("PRAGMA table_info(md_jobs)"))}
            if "consensus_job_id" not in cols:
                conn.execute(text("ALTER TABLE md_jobs ADD COLUMN consensus_job_id INTEGER REFERENCES consensus_jobs(id)"))
                conn.commit()

        # consensus_jobs: result_json era coluna planejada que nunca foi usada — remove dead code
        if "consensus_jobs" in tables:
            cols = {row[1] for row in conn.execute(text("PRAGMA table_info(consensus_jobs)"))}
            if "result_json" in cols:
                conn.execute(text("ALTER TABLE consensus_jobs DROP COLUMN result_json"))
                conn.commit()


def _seed_configs():
    """Insere configs padrão sem sobrescrever valores já customizados."""
    db = SessionLocal()
    try:
        for cfg in CONFIGS_PADRAO:
            existente = db.query(SystemConfig).filter_by(chave=cfg["chave"]).first()
            if not existente:
                db.add(SystemConfig(**cfg))
            elif existente.descricao != cfg["descricao"]:
                # Descrição não é editável pelo usuário — mantém texto atualizado (ex: renomeação do app)
                existente.descricao = cfg["descricao"]
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
