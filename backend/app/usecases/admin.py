"""
usecases/admin.py — Orquestração das operações administrativas.

Valida regras de negócio (chaves válidas, limites),
delega persistência para o service. Não conhece HTTP.
"""

from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.services import admin as service
from app.infra.db.database import get_config

CHAVES_VALIDAS = {
    "ttl_dias",
    "max_por_proteina",
    "limpeza_automatica",
    "drug_hunter_path",
    "python_bin",
    "smtp_host",
    "smtp_port",
    "smtp_user",
    "smtp_password",
    "smtp_from",
}


def uc_stats(db: Session) -> dict:
    return service.stats_cache(db)


def uc_listar_configs(db: Session) -> dict:
    return service.listar_configs(db)


def uc_atualizar_config(db: Session, chave: str, valor: str) -> dict:
    """Valida e atualiza uma configuração do sistema."""
    if chave not in CHAVES_VALIDAS:
        raise HTTPException(
            status_code=400,
            detail=f"Chave inválida. Chaves válidas: {sorted(CHAVES_VALIDAS)}",
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

    if chave == "drug_hunter_path":
        valor = valor.strip()

    if chave == "python_bin":
        valor = valor.strip()
        if not valor:
            raise HTTPException(
                status_code=400, detail="python_bin não pode ser vazio"
            )

    if chave == "smtp_port":
        try:
            v = int(valor)
            if v < 1 or v > 65535:
                raise ValueError
        except ValueError:
            raise HTTPException(
                status_code=400, detail="smtp_port deve ser um número entre 1 e 65535"
            )

    if chave == "smtp_password":
        valor = valor.strip()
        if not valor:
            # Senha em branco → manter a existente sem sobrescrever
            existente = get_config(db, "smtp_password", "")
            sentinela = "__set__" if existente else ""
            return {"chave": chave, "valor": sentinela, "mensagem": "Senha mantida sem alteração."}
        from app.infra.crypto import encrypt_value
        valor = encrypt_value(valor)

    cfg = service.atualizar_config(db, chave, valor)

    # Para smtp_password retorna sentinela, nunca o valor criptografado
    valor_retorno = "__set__" if chave == "smtp_password" else cfg.valor
    return {
        "chave": cfg.chave,
        "valor": valor_retorno,
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


def uc_listar_usuarios(db: Session) -> dict:
    return service.listar_usuarios(db)


def uc_set_admin(
    db: Session, usuario_id: int, is_admin: bool, current_user_id: int
) -> dict:
    try:
        return service.set_admin_usuario(db, usuario_id, is_admin, current_user_id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except KeyError as e:
        raise HTTPException(status_code=404, detail=str(e))
