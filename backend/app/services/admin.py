"""
services/admin.py — Acesso a dados de cache, TTL, configurações e usuários.

Responsabilidade: operações de banco. Não conhece HTTP.
"""

import os
from datetime import datetime, timedelta
from typing import List
from sqlalchemy.orm import Session

from app.domain.models import Protein, Search, SearchResult, SystemConfig, User
from app.infra.db.database import get_config, set_config

TTL_PADRAO = 30

# Mapa chave → variável de ambiente para fallback de SMTP
_SMTP_ENV = {
    "smtp_host": "SMTP_HOST",
    "smtp_port": "SMTP_PORT",
    "smtp_user": "SMTP_USER",
    "smtp_password": "SMTP_PASSWORD",
    "smtp_from": "SMTP_FROM",
}


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
    """Retorna lista de configs; SMTP usa env vars como fallback."""
    configs = db.query(SystemConfig).all()
    resultado = []
    for c in configs:
        valor = c.valor
        if c.chave in _SMTP_ENV:
            if c.chave == "smtp_password":
                # Nunca expõe a senha — retorna sentinela se configurada
                tem_db = bool(valor)
                tem_env = bool(os.getenv("SMTP_PASSWORD"))
                valor = "__set__" if (tem_db or tem_env) else ""
            elif not valor:
                # Fallback para env var nos demais campos SMTP
                valor = os.getenv(_SMTP_ENV[c.chave], "")
        resultado.append({"chave": c.chave, "valor": valor, "descricao": c.descricao})
    return {"configs": resultado}


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


def listar_usuarios(db: Session) -> dict:
    """Retorna todos os usuários cadastrados."""
    usuarios = db.query(User).order_by(User.created_at).all()
    return {
        "usuarios": [
            {
                "id": u.id,
                "email": u.email,
                "username": u.username,
                "is_admin": u.is_admin,
                "created_at": str(u.created_at),
            }
            for u in usuarios
        ]
    }


def set_admin_usuario(
    db: Session, usuario_id: int, is_admin: bool, current_user_id: int
) -> dict:
    """Altera permissão de admin de um usuário. Impede auto-alteração."""
    if usuario_id == current_user_id:
        raise ValueError("Não é possível alterar sua própria permissão de administrador.")
    usuario = db.query(User).filter(User.id == usuario_id).first()
    if not usuario:
        raise KeyError("Usuário não encontrado.")
    usuario.is_admin = is_admin
    db.commit()
    db.refresh(usuario)
    return {
        "id": usuario.id,
        "email": usuario.email,
        "username": usuario.username,
        "is_admin": usuario.is_admin,
    }
