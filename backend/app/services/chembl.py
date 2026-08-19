"""
services/chembl.py — Operações de banco para jobs ChEMBL.

Responsabilidade: persistência. Não conhece HTTP, SSE nem DrugHunter.
"""

from datetime import datetime
from typing import List, Optional

from sqlalchemy.orm import Session, joinedload

from app.domain.models.chembl_job import ChemblJob, ChemblJobItem


def criar_job(db: Session, user_id: Optional[int], base_output_path: str) -> ChemblJob:
    job = ChemblJob(
        user_id=user_id,
        status="pending",
        base_output_path=base_output_path,
    )
    db.add(job)
    db.commit()
    db.refresh(job)
    return job


def criar_item(
    db: Session,
    job_id: int,
    target_name: str,
    folder_name: str,
    target_filters: str,
    bioact_filters: str,
    mol_filters: str,
    sim_filters: str,
) -> ChemblJobItem:
    item = ChemblJobItem(
        job_id=job_id,
        target_name=target_name,
        folder_name=folder_name,
        status="pending",
        target_filters=target_filters,
        bioact_filters=bioact_filters,
        mol_filters=mol_filters,
        sim_filters=sim_filters,
    )
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


def atualizar_status_item(
    db: Session,
    item_id: int,
    status: str,
    molecules_count: Optional[int] = None,
    error_msg: Optional[str] = None,
) -> None:
    item = db.query(ChemblJobItem).filter(ChemblJobItem.id == item_id).first()
    if not item:
        return
    item.status = status
    if status == "running" and item.started_at is None:
        item.started_at = datetime.utcnow()
    if status in ("done", "error"):
        item.finished_at = datetime.utcnow()
    if molecules_count is not None:
        item.molecules_count = molecules_count
    if error_msg is not None:
        item.error_msg = error_msg
    db.commit()


def atualizar_status_job(db: Session, job_id: int, status: str) -> None:
    job = db.query(ChemblJob).filter(ChemblJob.id == job_id).first()
    if not job:
        return
    job.status = status
    db.commit()


def marcar_job_finalizado(
    db: Session, job_id: int, status: str, error_msg: Optional[str] = None
) -> None:
    job = db.query(ChemblJob).filter(ChemblJob.id == job_id).first()
    if not job:
        return
    job.status = status
    job.finished_at = datetime.utcnow()
    if error_msg is not None:
        job.error_msg = error_msg
    db.commit()


def listar_jobs_usuario(
    db: Session, user_id: int, limit: int = 50
) -> List[ChemblJob]:
    return (
        db.query(ChemblJob)
        .options(joinedload(ChemblJob.items))
        .filter(ChemblJob.user_id == user_id)
        .order_by(ChemblJob.created_at.desc())
        .limit(limit)
        .all()
    )


def get_job_by_id(db: Session, job_id: int, user_id: int) -> Optional["ChemblJob"]:
    return (
        db.query(ChemblJob)
        .options(joinedload(ChemblJob.items))
        .filter(ChemblJob.id == job_id, ChemblJob.user_id == user_id)
        .first()
    )


def deletar_job(db: Session, job_id: int, user_id: int) -> bool:
    job = (
        db.query(ChemblJob)
        .filter(ChemblJob.id == job_id, ChemblJob.user_id == user_id)
        .first()
    )
    if not job:
        return False
    db.delete(job)
    db.commit()
    return True
