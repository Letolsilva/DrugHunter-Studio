"""
services/molecular_dynamics.py — Acesso a dados de jobs de Dinâmica Molecular.

Responsabilidade: operações de banco. Não conhece HTTP nem usecases.
"""

from datetime import datetime
from typing import List, Optional

from sqlalchemy import and_
from sqlalchemy.orm import Session

from app.domain.models.md_job import MDJob
from app.domain.models.md_analysis_job import MdAnalysisJob


def criar_job(
    db: Session,
    user_id: int,
    molecule_id: str,
    smiles: Optional[str],
    ligand_source: str,
    consensus_job_id: Optional[int],
    ligand_filename: Optional[str],
    ligand_file_path: Optional[str],
    receptor_source: str,
    target: Optional[str],
    receptor_path: Optional[str],
    receptor_filename: Optional[str],
    params_json: str,
    base_output_path: str,
) -> MDJob:
    job = MDJob(
        user_id=user_id,
        status="pending",
        molecule_id=molecule_id,
        smiles=smiles,
        ligand_source=ligand_source,
        consensus_job_id=consensus_job_id,
        ligand_filename=ligand_filename,
        ligand_file_path=ligand_file_path,
        receptor_source=receptor_source,
        target=target,
        receptor_path=receptor_path,
        receptor_filename=receptor_filename,
        params_json=params_json,
        base_output_path=base_output_path,
    )
    db.add(job)
    db.commit()
    db.refresh(job)
    return job


def buscar_job_por_id(db: Session, job_id: int, user_id: int) -> Optional[MDJob]:
    return (
        db.query(MDJob)
        .filter(and_(MDJob.id == job_id, MDJob.user_id == user_id))
        .first()
    )


def listar_jobs_por_usuario(db: Session, user_id: int) -> List[MDJob]:
    return (
        db.query(MDJob)
        .filter(MDJob.user_id == user_id)
        .order_by(MDJob.created_at.desc())
        .all()
    )


def atualizar_output_path(db: Session, job_id: int, base_output_path: str) -> None:
    j = db.query(MDJob).filter(MDJob.id == job_id).first()
    if j:
        j.base_output_path = base_output_path
        db.commit()


def marcar_rodando(db: Session, job_id: int) -> None:
    j = db.query(MDJob).filter(MDJob.id == job_id).populate_existing().first()
    if j and j.status != "cancelled":
        j.status = "running"
        db.commit()


def marcar_concluido(db: Session, job_id: int) -> None:
    j = db.query(MDJob).filter(MDJob.id == job_id).populate_existing().first()
    if j and j.status != "cancelled":
        j.status = "done"
        j.finished_at = datetime.utcnow()
        db.commit()


def marcar_erro(db: Session, job_id: int, mensagem: str) -> None:
    j = db.query(MDJob).filter(MDJob.id == job_id).populate_existing().first()
    if j and j.status != "cancelled":
        j.status = "error"
        j.error_msg = mensagem
        j.finished_at = datetime.utcnow()
        db.commit()


def criar_analise_job(db: Session, user_id: int, md_job_id: int) -> MdAnalysisJob:
    analise = MdAnalysisJob(
        user_id=user_id,
        md_job_id=md_job_id,
        status="pending",
    )
    db.add(analise)
    db.commit()
    db.refresh(analise)
    return analise


def buscar_analise_por_md_job(db: Session, md_job_id: int, user_id: int) -> Optional[MdAnalysisJob]:
    return (
        db.query(MdAnalysisJob)
        .filter(and_(MdAnalysisJob.md_job_id == md_job_id, MdAnalysisJob.user_id == user_id))
        .order_by(MdAnalysisJob.created_at.desc())
        .first()
    )


def buscar_analise_por_id(db: Session, analise_id: int, user_id: int) -> Optional[MdAnalysisJob]:
    return (
        db.query(MdAnalysisJob)
        .filter(and_(MdAnalysisJob.id == analise_id, MdAnalysisJob.user_id == user_id))
        .first()
    )


def marcar_analise_rodando(db: Session, analise_id: int) -> None:
    a = db.query(MdAnalysisJob).filter(MdAnalysisJob.id == analise_id).populate_existing().first()
    if a and a.status != "cancelled":
        a.status = "running"
        db.commit()


def marcar_analise_concluida(db: Session, analise_id: int) -> None:
    a = db.query(MdAnalysisJob).filter(MdAnalysisJob.id == analise_id).populate_existing().first()
    if a and a.status != "cancelled":
        a.status = "done"
        a.finished_at = datetime.utcnow()
        db.commit()


def marcar_analise_erro(db: Session, analise_id: int, mensagem: str) -> None:
    a = db.query(MdAnalysisJob).filter(MdAnalysisJob.id == analise_id).populate_existing().first()
    if a and a.status != "cancelled":
        a.status = "error"
        a.error_msg = mensagem
        a.finished_at = datetime.utcnow()
        db.commit()


def deletar_job(db: Session, job_id: int, user_id: int) -> bool:
    j = (
        db.query(MDJob)
        .filter(and_(MDJob.id == job_id, MDJob.user_id == user_id))
        .first()
    )
    if not j:
        return False
    db.delete(j)
    db.commit()
    return True
