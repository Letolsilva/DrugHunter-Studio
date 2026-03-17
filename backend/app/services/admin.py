"""
services/admin.py — Acesso a dados de cache, TTL e configurações do sistema.

Responsabilidade: operações de banco. Não conhece HTTP.
"""

from datetime import datetime, timedelta
from typing import List
from sqlalchemy.orm import Session

from app.domain.models import Protein, Search, SearchResult, SystemConfig, User
from app.infra.db.database import get_config, set_config

TTL_PADRAO = 30


def _ttl_dias(db: Session) -> int:
    try:
        return int(get_config(db, "ttl_dias", str(TTL_PADRAO)))
    except (ValueError, TypeError):
        return TTL_PADRAO


def stats_cache(db: Session) -> dict:
    """Retorna estatísticas completas do cache e banco."""
    total_proteinas = db.query(Protein).count()
    total_usuarios = db.query(User).count()
    total_buscas = db.query(Search).count()

    ttl = _ttl_dias(db)
    limite = datetime.utcnow() - timedelta(days=ttl)
    expiradas = db.query(Protein).filter(Protein.ultima_consulta < limite).count()

    mais_consultadas = (
        db.query(Protein).order_by(Protein.total_consultas.desc()).limit(5).all()
    )

    return {
        "total_proteinas_cache": total_proteinas,
        "total_usuarios": total_usuarios,
        "total_buscas": total_buscas,
        "proteinas_expiradas": expiradas,
        "ttl_dias": ttl,
        "mais_consultadas": [
            {
                "pdb_id": p.pdb_id,
                "proteina_buscada": p.proteina_buscada,
                "total_consultas": p.total_consultas,
                "ultima_consulta": str(p.ultima_consulta),
            }
            for p in mais_consultadas
        ],
    }


def listar_configs(db: Session) -> dict:
    configs = db.query(SystemConfig).all()
    return {
        c.chave: {
            "valor": c.valor,
            "descricao": c.descricao,
            "updated_at": str(c.updated_at) if c.updated_at else None,
        }
        for c in configs
    }


def atualizar_config(db: Session, chave: str, valor: str) -> SystemConfig:
    return set_config(db, chave, valor)


def limpar_proteinas_expiradas(db: Session) -> dict:
    """Remove proteínas não consultadas há mais de ttl_dias."""
    ttl = _ttl_dias(db)
    limite = datetime.utcnow() - timedelta(days=ttl)

    expiradas = db.query(Protein).filter(Protein.ultima_consulta < limite).all()
    removidas = []
    for p in expiradas:
        removidas.append(
            {"pdb_id": p.pdb_id, "ultima_consulta": str(p.ultima_consulta)}
        )
        db.query(SearchResult).filter(SearchResult.protein_id == p.id).delete()
        db.delete(p)

    db.commit()
    return {"removidas": len(removidas), "ttl_dias": ttl, "proteinas": removidas}


def proteinas_proximas_expiracao(db: Session, aviso_dias: int = 7) -> List[dict]:
    """Lista proteínas que expirarão nos próximos N dias."""
    ttl = _ttl_dias(db)
    agora = datetime.utcnow()
    limite_expiracao = agora - timedelta(days=ttl - aviso_dias)

    proximas = (
        db.query(Protein)
        .filter(Protein.ultima_consulta < limite_expiracao)
        .order_by(Protein.ultima_consulta)
        .all()
    )
    return [
        {
            "pdb_id": p.pdb_id,
            "proteina_buscada": p.proteina_buscada,
            "ultima_consulta": str(p.ultima_consulta),
            "dias_restantes": max(0, ttl - (agora - p.ultima_consulta).days),
        }
        for p in proximas
    ]


def listar_organismos(db: Session) -> List[str]:
    from app.services.search import listar_organismos_disponiveis

    return listar_organismos_disponiveis(db)
