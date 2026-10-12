"""
services/redocking.py — Acesso a dados de jobs de redocking.

Responsabilidade: operações de banco. Não conhece HTTP nem usecases.
"""

from datetime import datetime
from typing import List, Optional

from sqlalchemy.orm import Session

from app.domain.models.redocking_job import RedockingJob
from app.domain.models.user_pdb_csv import UserPdbCsv


def criar_job(
    db: Session,
    user_id: int,
    target: str,
    base_input_path: str,
    base_output_path: str,
    charge_type: str,
    email_notificacao: Optional[str],
    csv_content: str,
) -> RedockingJob:
    job = RedockingJob(
        user_id=user_id,
        status="pending",
        target=target,
        base_input_path=base_input_path,
        base_output_path=base_output_path,
        charge_type=charge_type,
        email_notificacao=email_notificacao,
        csv_content=csv_content,
    )
    db.add(job)
    db.commit()
    db.refresh(job)
    return job


def atualizar_status(db: Session, job_id: int, status: str) -> None:
    job = db.query(RedockingJob).filter(RedockingJob.id == job_id).populate_existing().first()
    if job and job.status != "cancelled":
        job.status = status
        db.commit()


def marcar_finalizado(
    db: Session, job_id: int, status: str, erro_msg: Optional[str] = None
) -> None:
    job = db.query(RedockingJob).filter(RedockingJob.id == job_id).populate_existing().first()
    if job and job.status != "cancelled":
        job.status = status
        job.finalizado_em = datetime.utcnow()
        job.erro_msg = erro_msg
        db.commit()


def listar_jobs_usuario(db: Session, user_id: int) -> List[RedockingJob]:
    return (
        db.query(RedockingJob)
        .filter(RedockingJob.user_id == user_id)
        .order_by(RedockingJob.iniciado_em.desc())
        .all()
    )


def buscar_job(db: Session, job_id: int, user_id: int) -> Optional[RedockingJob]:
    return (
        db.query(RedockingJob)
        .filter(RedockingJob.id == job_id, RedockingJob.user_id == user_id)
        .first()
    )


def deletar_job(db: Session, job_id: int, user_id: int) -> bool:
    job = buscar_job(db, job_id, user_id)
    if not job:
        return False
    db.delete(job)
    db.commit()
    return True


def salvar_csv_usuario(
    db: Session,
    user_id: int,
    csv_content: Optional[str] = None,
    target: Optional[str] = None,
    base_input_path: Optional[str] = None,
) -> UserPdbCsv:
    """Cria ou atualiza o CSV do usuário (um por usuário). Atualiza apenas os campos fornecidos."""
    registro = db.query(UserPdbCsv).filter(UserPdbCsv.user_id == user_id).first()
    if registro:
        if csv_content is not None:
            registro.csv_content = csv_content
        if target is not None:
            registro.target = target
        if base_input_path is not None:
            registro.base_input_path = base_input_path
        registro.updated_at = datetime.utcnow()
    else:
        registro = UserPdbCsv(
            user_id=user_id,
            csv_content=csv_content or "",
            target=target or "",
            base_input_path=base_input_path or "",
        )
        db.add(registro)
    db.commit()
    db.refresh(registro)
    return registro


def buscar_csv_usuario(db: Session, user_id: int) -> Optional[UserPdbCsv]:
    return db.query(UserPdbCsv).filter(UserPdbCsv.user_id == user_id).first()
