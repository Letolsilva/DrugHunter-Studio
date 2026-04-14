"""
usecases/redocking.py — Orquestração dos casos de uso de redocking.

Não importa fastapi, Request ou Response.
"""

from typing import List

from sqlalchemy.orm import Session

from app.domain.models import User, RedockingJob
from app.infra.storage.storage_service import PDB_FILES_DIR
from app.services import redocking as svc


def uc_iniciar_redocking(
    db: Session,
    usuario: User,
    target: str,
    base_input_path: str,
    base_output_path: str,
    charge_type: str,
    csv_content: str,
) -> RedockingJob:
    config_existente = svc.buscar_csv_usuario(db, usuario.id)
    if (
        config_existente
        and config_existente.target
        and config_existente.target != target
    ):
        raise ValueError(
            f"O CSV foi importado para o alvo '{config_existente.target}'. "
            "Para usar um alvo diferente, importe um novo CSV com o alvo correto."
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
    svc.salvar_csv_usuario(db, usuario.id, target=target, base_input_path=base_input_path)
    return job


def uc_listar_jobs(db: Session, usuario: User) -> List[RedockingJob]:
    return svc.listar_jobs_usuario(db, usuario.id)


def uc_status_job(db: Session, usuario: User, job_id: int) -> RedockingJob:
    job = svc.buscar_job(db, job_id, usuario.id)
    if not job:
        raise KeyError(f"Job {job_id} não encontrado.")
    return job


def uc_salvar_csv(db: Session, usuario: User, csv_content: str, target: str = "", base_input_path: str = "") -> None:
    svc.salvar_csv_usuario(db, usuario.id, csv_content=csv_content, target=target or None, base_input_path=base_input_path or None)


def uc_buscar_csv(db: Session, usuario: User) -> str | None:
    registro = svc.buscar_csv_usuario(db, usuario.id)
    return registro.csv_content if registro else None


def uc_defaults_redocking(db: Session, usuario: User) -> dict:
    """Retorna o caminho da pasta de PDBs e o último alvo terapêutico usado."""
    registro = svc.buscar_csv_usuario(db, usuario.id)
    stored_target = (registro.target or None) if registro else None
    stored_base_input = (
        registro.base_input_path if registro and registro.base_input_path
        else str(PDB_FILES_DIR.resolve())
    )
    return {
        "base_input_path": stored_base_input,
        "last_target": stored_target,
    }
