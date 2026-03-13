"""
Rotas de administração — /api/admin  (Fase 3)
Protegidas por autenticação de admin.
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel, Field

from app.db.database import get_db, get_config, set_config
from app.core.deps import get_usuario_admin
from app.models.models import SystemConfig, User
from app.services.cache import (
    stats_cache,
    limpar_proteinas_expiradas,
    proteinas_proximas_expiracao,
    listar_organismos_disponiveis,
)

router = APIRouter(prefix="/api/admin", tags=["Admin"])


# ── Schemas ───────────────────────────────────────────────────


class ConfigUpdate(BaseModel):
    valor: str = Field(..., description="Novo valor da configuração")


# ── Stats do cache ────────────────────────────────────────────


@router.get("/stats")
def get_stats(
    db: Session = Depends(get_db),
    admin: User = Depends(get_usuario_admin),
):
    """Retorna estatísticas completas do cache e banco."""
    return stats_cache(db)


# ── Configurações do sistema ──────────────────────────────────


@router.get("/config")
def listar_configs(
    db: Session = Depends(get_db),
    admin: User = Depends(get_usuario_admin),
):
    """Lista todas as configurações do sistema."""
    configs = db.query(SystemConfig).all()
    return {
        c.chave: {
            "valor": c.valor,
            "descricao": c.descricao,
            "updated_at": str(c.updated_at) if c.updated_at else None,
        }
        for c in configs
    }


@router.put("/config/{chave}")
def atualizar_config(
    chave: str,
    body: ConfigUpdate,
    db: Session = Depends(get_db),
    admin: User = Depends(get_usuario_admin),
):
    """
    Atualiza uma configuração do sistema.

    Chaves disponíveis:
    - ttl_dias           (ex: "30")
    - max_por_proteina   (ex: "50")
    - limpeza_automatica (ex: "true" ou "false")
    """
    chaves_validas = {"ttl_dias", "max_por_proteina", "limpeza_automatica"}
    if chave not in chaves_validas:
        raise HTTPException(
            status_code=400,
            detail=f"Chave inválida. Chaves válidas: {chaves_validas}",
        )

    # Validações por tipo
    if chave == "ttl_dias":
        try:
            v = int(body.valor)
            if v < 1 or v > 365:
                raise ValueError
        except ValueError:
            raise HTTPException(
                status_code=400, detail="ttl_dias deve ser um número entre 1 e 365"
            )

    if chave == "max_por_proteina":
        try:
            v = int(body.valor)
            if v < 1 or v > 500:
                raise ValueError
        except ValueError:
            raise HTTPException(
                status_code=400, detail="max_por_proteina deve ser entre 1 e 500"
            )

    if chave == "limpeza_automatica":
        if body.valor.lower() not in ("true", "false"):
            raise HTTPException(
                status_code=400, detail="limpeza_automatica deve ser 'true' ou 'false'"
            )
        body.valor = body.valor.lower()

    cfg = set_config(db, chave, body.valor)
    return {
        "chave": cfg.chave,
        "valor": cfg.valor,
        "mensagem": "Configuração atualizada.",
    }


# ── Limpeza manual de expirados ───────────────────────────────


@router.post("/cache/limpar")
def limpar_cache(
    db: Session = Depends(get_db),
    admin: User = Depends(get_usuario_admin),
):
    """Executa limpeza manual de proteínas expiradas pelo TTL."""
    return limpar_proteinas_expiradas(db)


@router.get("/cache/proximas-expirar")
def proximas_expirar(
    aviso_dias: int = 7,
    db: Session = Depends(get_db),
    admin: User = Depends(get_usuario_admin),
):
    """Lista proteínas que expirarão nos próximos N dias."""
    return {
        "aviso_dias": aviso_dias,
        "proteinas": proteinas_proximas_expiracao(db, aviso_dias),
    }


# ── Organismos no banco ───────────────────────────────────────


@router.get("/organismos")
def organismos_no_banco(
    db: Session = Depends(get_db),
    admin: User = Depends(get_usuario_admin),
):
    """Lista todos os organismos únicos presentes no cache."""
    orgs = listar_organismos_disponiveis(db)
    return {"total": len(orgs), "organismos": orgs}
