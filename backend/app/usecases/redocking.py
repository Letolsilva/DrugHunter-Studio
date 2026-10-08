"""
usecases/redocking.py — Orquestração dos casos de uso de redocking.

Não importa fastapi, Request ou Response.
"""

import logging
import os
from pathlib import Path
from typing import List

from sqlalchemy.orm import Session

from app.domain.models import User, RedockingJob
from app.domain.utils.normalizacao import normalizar_target
from app.services import redocking as svc

logger = logging.getLogger("drughunter_studio")


def uc_deletar_job(db: Session, job_id: int, user_id: int) -> bool:
    return svc.deletar_job(db, job_id, user_id)


def uc_iniciar_redocking(
    db: Session,
    usuario: User,
    target: str,
    base_input_path: str,
    base_output_path: str,
    charge_type: str,
    csv_content: str,
) -> RedockingJob:
    target = normalizar_target(target)
    if not target:
        raise ValueError(
            "O nome do alvo ficou vazio após a normalização. "
            "Use apenas letras, números, hífen ou underscore."
        )

    job = svc.criar_job(
        db=db,
        user_id=usuario.id,
        target=target,
        base_input_path=base_input_path,
        base_output_path=base_output_path,
        charge_type=charge_type,
        email_notificacao=usuario.email,
        csv_content=csv_content,
    )
    # Atualiza target e base_input_path na configuração salva
    svc.salvar_csv_usuario(
        db, usuario.id, target=target, base_input_path=base_input_path
    )
    return job


def uc_listar_jobs(db: Session, usuario: User) -> List[RedockingJob]:
    return svc.listar_jobs_usuario(db, usuario.id)


def uc_status_job(db: Session, usuario: User, job_id: int) -> RedockingJob:
    job = svc.buscar_job(db, job_id, usuario.id)
    if not job:
        raise KeyError(f"Job {job_id} não encontrado.")
    return job


def uc_salvar_csv(
    db: Session,
    usuario: User,
    csv_content: str,
    target: str = "",
    base_input_path: str = "",
) -> None:
    target_norm = normalizar_target(target) if target else None
    svc.salvar_csv_usuario(
        db,
        usuario.id,
        csv_content=csv_content,
        target=target_norm or None,
        base_input_path=base_input_path or None,
    )


def uc_buscar_csv(db: Session, usuario: User) -> str | None:
    registro = svc.buscar_csv_usuario(db, usuario.id)
    return registro.csv_content if registro else None


_DEFAULT_BASE_INPUT = "/datasets/PDB"
_DEFAULT_BASE_OUTPUT = "/resultados/redocking"
_DEFAULT_CHARGE_TYPE = "am1"


def _codigos_do_csv(csv_content: str) -> list[str]:
    """Extrai a lista de PDB_CODEs únicos do CSV armazenado (ignora cabeçalho)."""
    vistos: set[str] = set()
    codigos: list[str] = []
    for linha in csv_content.splitlines():
        linha = linha.strip()
        if not linha or linha.upper().startswith("PDB_CODE"):
            continue
        codigo = linha.split(",")[0].strip()
        if codigo and codigo not in vistos:
            vistos.add(codigo)
            codigos.append(codigo)
    return codigos


def _drug_hunter_path(db: Session) -> str:
    from app.infra.db.database import get_config
    return get_config(db, "drug_hunter_path") or os.environ.get("DRUG_HUNTER_PATH", "")


def uc_prontidao(
    db: Session,
    usuario: User,
    target: str,
    base_input_path: str,
) -> dict:
    """Verifica se os .pdb de cada PDB_CODE estão presentes na pasta do alvo."""
    from app.infra.pdb_preparador import resolver_pasta_alvo, verificar_pdb

    target = normalizar_target(target)
    if not target:
        raise ValueError("Nome do alvo inválido após normalização.")

    dh_path = _drug_hunter_path(db)
    if not dh_path:
        raise EnvironmentError("Caminho do DrugHunter não configurado.")

    pasta = resolver_pasta_alvo(dh_path, base_input_path, target)
    registro = svc.buscar_csv_usuario(db, usuario.id)
    codigos = _codigos_do_csv(registro.csv_content) if registro and registro.csv_content else []

    itens = []
    for codigo in codigos:
        st = verificar_pdb(pasta, codigo)
        itens.append({
            "codigo": codigo,
            "presente": st["presente"],
            "formato_ok": st["formato_ok"],
            "origem": "pasta" if st["presente"] else None,
        })

    prontos = sum(1 for i in itens if i["presente"] and i["formato_ok"])
    return {"pasta": str(pasta), "itens": itens, "prontos": prontos, "total": len(itens)}


def uc_preparar_dados(
    db: Session,
    usuario: User,
    target: str,
    base_input_path: str,
) -> dict:
    """Baixa/copia os .pdb faltantes para a pasta do alvo e (re)escreve pdb_codes.csv."""
    from app.infra.pdb_preparador import resolver_pasta_alvo, preparar_codigo
    from app.infra.storage.storage_service import PDB_FILES_DIR

    target = normalizar_target(target)
    if not target:
        raise ValueError("Nome do alvo inválido após normalização.")

    dh_path = _drug_hunter_path(db)
    if not dh_path:
        raise EnvironmentError("Caminho do DrugHunter não configurado.")

    pasta = resolver_pasta_alvo(dh_path, base_input_path, target)
    registro = svc.buscar_csv_usuario(db, usuario.id)
    codigos = _codigos_do_csv(registro.csv_content) if registro and registro.csv_content else []

    itens = []
    for codigo in codigos:
        resultado = preparar_codigo(pasta, codigo, pdb_files_dir=PDB_FILES_DIR)
        itens.append({"codigo": codigo, **resultado})

    # (Re)escreve pdb_codes.csv na pasta do alvo para o DrugHunter encontrar
    if codigos and registro and registro.csv_content:
        try:
            pasta.mkdir(parents=True, exist_ok=True)
            (pasta / "pdb_codes.csv").write_text(registro.csv_content, encoding="utf-8")
        except Exception as exc:
            logger.warning("Falha ao escrever pdb_codes.csv em %s: %s", pasta, exc)

    prontos = sum(1 for i in itens if i["presente"] and i["formato_ok"])
    return {"pasta": str(pasta), "itens": itens, "prontos": prontos, "total": len(itens)}


def uc_defaults_redocking(db: Session, usuario: User) -> dict:
    """Retorna defaults para a tela de Redocking."""
    registro = svc.buscar_csv_usuario(db, usuario.id)
    stored_target = (registro.target or None) if registro else None
    stored_base_input = (
        registro.base_input_path
        if registro and registro.base_input_path
        else _DEFAULT_BASE_INPUT
    )
    return {
        "base_input_path": stored_base_input,
        "base_output_path": _DEFAULT_BASE_OUTPUT,
        "charge_type": _DEFAULT_CHARGE_TYPE,
        "last_target": stored_target,
    }
