"""
usecases/admin.py — Orquestração das operações administrativas.

Valida regras de negócio (chaves válidas, limites),
delega persistência para o service. Não conhece HTTP.
"""

from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.services import admin as service

CHAVES_VALIDAS = {"ttl_dias", "max_por_proteina", "limpeza_automatica"}


def uc_stats(db: Session) -> dict:
    return service.stats_cache(db)


def uc_listar_configs(db: Session) -> dict:
    return service.listar_configs(db)


def uc_atualizar_config(db: Session, chave: str, valor: str) -> dict:
    """Valida e atualiza uma configuração do sistema."""
    if chave not in CHAVES_VALIDAS:
        raise HTTPException(
            status_code=400,
            detail=f"Chave inválida. Chaves válidas: {CHAVES_VALIDAS}",
        )
    if chave == "ttl_dias":
        try:
            v = int(valor)
            if v < 1 or v > 365:
                raise ValueError
        except ValueError:
            raise HTTPException(
                status_code=400, detail="ttl_dias deve ser um número entre 1 e 365"
            )

    if chave == "max_por_proteina":
        try:
            v = int(valor)
            if v < 1 or v > 500:
                raise ValueError
        except ValueError:
            raise HTTPException(
                status_code=400, detail="max_por_proteina deve ser entre 1 e 500"
            )

    if chave == "limpeza_automatica":
        if valor.lower() not in ("true", "false"):
            raise HTTPException(
                status_code=400, detail="limpeza_automatica deve ser 'true' ou 'false'"
            )
        valor = valor.lower()

    cfg = service.atualizar_config(db, chave, valor)
    return {
        "chave": cfg.chave,
        "valor": cfg.valor,
        "mensagem": "Configuração atualizada.",
    }


def uc_limpar_cache(db: Session) -> dict:
    return service.limpar_proteinas_expiradas(db)


def uc_proximas_expirar(db: Session, aviso_dias: int) -> dict:
    return {
        "aviso_dias": aviso_dias,
        "proteinas": service.proteinas_proximas_expiracao(db, aviso_dias),
    }


def uc_organismos(db: Session) -> dict:
    orgs = service.listar_organismos(db)
    return {"total": len(orgs), "organismos": orgs}
