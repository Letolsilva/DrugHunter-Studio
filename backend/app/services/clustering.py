"""
services/clustering.py — Acesso a dados de jobs de clustering MAIA.

Responsabilidade: operações de banco. Não conhece HTTP nem usecases.
"""

from datetime import datetime
from typing import Optional

from sqlalchemy import and_
from sqlalchemy.orm import Session

from app.domain.models.clustering_job import ClusteringJob


def criar_ou_substituir(
    db: Session,
    user_id: int,
    admet_result_id: int,
    target: str,
    fingerprint_type: str,
    base_input_path: str,
    base_output_path: str,
    max_mols: Optional[int] = None,
) -> ClusteringJob:
    # Mesmos parâmetros = rerun do mesmo job (sobrescreve).
    # Parâmetros diferentes = novo job isolado (histórico separado).
    anterior = (
        db.query(ClusteringJob)
        .filter(
            and_(
                ClusteringJob.user_id == user_id,
                ClusteringJob.admet_result_id == admet_result_id,
                ClusteringJob.fingerprint_type == fingerprint_type,
                ClusteringJob.max_mols == max_mols,
            )
        )
        .first()
    )

    if anterior:
        anterior.status = "running"
        anterior.target = target
        anterior.base_input_path = base_input_path
        anterior.base_output_path = base_output_path
        anterior.n_clusters = None
        anterior.silhouette_score = None
        anterior.result_dir = None
        anterior.result_csv_path = None
        anterior.error_msg = None
        anterior.created_at = datetime.utcnow()
        anterior.finished_at = None
        db.commit()
        db.refresh(anterior)
        return anterior

    job = ClusteringJob(
        user_id=user_id,
        admet_result_id=admet_result_id,
        status="running",
        target=target,
        fingerprint_type=fingerprint_type,
        base_input_path=base_input_path,
        base_output_path=base_output_path,
        max_mols=max_mols,
    )
    db.add(job)
    db.commit()
    db.refresh(job)
    return job


def buscar_por_id(db: Session, job_id: int, user_id: int) -> Optional[ClusteringJob]:
    return (
        db.query(ClusteringJob)
        .filter(and_(ClusteringJob.id == job_id, ClusteringJob.user_id == user_id))
        .first()
    )


def buscar_por_admet(db: Session, admet_result_id: int, user_id: int) -> Optional[ClusteringJob]:
    return (
        db.query(ClusteringJob)
        .filter(
            and_(
                ClusteringJob.admet_result_id == admet_result_id,
                ClusteringJob.user_id == user_id,
            )
        )
        .order_by(ClusteringJob.id.desc())
        .first()
    )


def listar_por_admet(db: Session, admet_result_id: int, user_id: int) -> list[ClusteringJob]:
    return (
        db.query(ClusteringJob)
        .filter(
            and_(
                ClusteringJob.admet_result_id == admet_result_id,
                ClusteringJob.user_id == user_id,
            )
        )
        .all()
    )


def marcar_concluido(
    db: Session,
    job_id: int,
    n_clusters: Optional[int],
    silhouette_score: Optional[float],
    result_dir: Optional[str],
    result_csv_path: Optional[str],
) -> None:
    job = db.query(ClusteringJob).filter(ClusteringJob.id == job_id).first()
    if job:
        job.status = "done"
        job.n_clusters = n_clusters
        job.silhouette_score = silhouette_score
        job.result_dir = result_dir
        job.result_csv_path = result_csv_path
        job.finished_at = datetime.utcnow()
        db.commit()


def listar_por_usuario(db: Session, user_id: int):
    return (
        db.query(ClusteringJob)
        .filter(ClusteringJob.user_id == user_id)
        .order_by(ClusteringJob.created_at.desc())
        .all()
    )


def deletar(db: Session, job_id: int, user_id: int) -> bool:
    job = (
        db.query(ClusteringJob)
        .filter(and_(ClusteringJob.id == job_id, ClusteringJob.user_id == user_id))
        .first()
    )
    if not job:
        return False
    db.delete(job)
    db.commit()
    return True


def marcar_erro(db: Session, job_id: int, mensagem: str) -> None:
    job = db.query(ClusteringJob).filter(ClusteringJob.id == job_id).first()
    if job:
        job.status = "error"
        job.error_msg = mensagem
        job.finished_at = datetime.utcnow()
        db.commit()
