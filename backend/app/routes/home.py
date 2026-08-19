"""
routes/home.py — Status do ambiente e atividade recente para a home page.
"""

import os
from pathlib import Path

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.infra.db.database import get_db, get_config
from app.core.deps import get_usuario_atual
from app.domain.models import User
from app.domain.models.search import Search
from app.domain.models.redocking_job import RedockingJob
from app.infra.email_sender import _DEFAULT_HOST, _DEFAULT_USER, _default_password

router = APIRouter(prefix="/api/home", tags=["Home"])


def _config_ok(db: Session, key: str) -> bool:
    val = get_config(db, key)
    return bool(val and val.strip())


def _path_exists(db: Session, key: str) -> bool:
    val = get_config(db, key)
    return bool(val and Path(val.strip()).exists())


def _smtp_ok(db: Session) -> bool:
    """Espelha a lógica de email_sender._get_smtp_config(): banco → env var → padrão embutido."""
    host = get_config(db, "smtp_host") or os.getenv("SMTP_HOST") or _DEFAULT_HOST
    user = get_config(db, "smtp_user") or os.getenv("SMTP_USER") or _DEFAULT_USER
    password_enc = get_config(db, "smtp_password", "")
    password = bool(password_enc) or bool(os.getenv("SMTP_PASSWORD")) or bool(_default_password())
    return bool(host and user and password)


@router.get("/status")
def get_status(
    db: Session = Depends(get_db),
    usuario: User = Depends(get_usuario_atual),
):
    """Retorna status do ambiente e atividade recente do usuário."""

    # ── Status do ambiente ──────────────────────────────────────────────────
    dh_ok = _path_exists(db, "drug_hunter_path")
    python_ok = _config_ok(db, "python_bin")
    smtp_ok = _smtp_ok(db)

    # ── Atividade recente ───────────────────────────────────────────────────
    ultima_busca = (
        db.query(Search)
        .filter(Search.user_id == usuario.id)
        .order_by(Search.criado_em.desc())
        .first()
    )

    ultimo_redocking = (
        db.query(RedockingJob)
        .filter(RedockingJob.user_id == usuario.id)
        .order_by(RedockingJob.iniciado_em.desc())
        .first()
    )

    return {
        "ambiente": {
            "drug_hunter": dh_ok,
            "python": python_ok,
            "smtp": smtp_ok,
        },
        "atividade": {
            "ultima_busca_pdb": {
                "query": ultima_busca.proteina_query if ultima_busca else None,
                "data": ultima_busca.criado_em.isoformat() if ultima_busca else None,
                "total": ultima_busca.total_resultados if ultima_busca else None,
            },
            "ultimo_chembl": None,
            "ultimo_redocking": {
                "target": ultimo_redocking.target if ultimo_redocking else None,
                "status": ultimo_redocking.status if ultimo_redocking else None,
                "data": ultimo_redocking.iniciado_em.isoformat() if ultimo_redocking else None,
            },
        },
    }
