"""
services/consensus.py — Acesso a dados de jobs de consenso.

Responsabilidade: operações de banco. Não conhece HTTP nem usecases.
"""

from datetime import datetime
from typing import Optional

from sqlalchemy import and_
from sqlalchemy.orm import Session

from app.domain.models.consensus_job import ConsensusJob


def criar_ou_substituir(
    db: Session,
    user_id: int,
    admet_result_id: int,
    target: str,
    pdb_id: str,
    ligand_resname: str,
    ligand_resnum: int,
    chain: str,
    base_input_path: str,
    base_docking_output_path: str,
    base_selected_mols: str,
    charge_type: str,
    prepare_complex: bool,
    selected_categories: str,
) -> ConsensusJob:
    anterior = (
        db.query(ConsensusJob)
        .filter(
            and_(
                ConsensusJob.user_id == user_id,
                ConsensusJob.admet_result_id == admet_result_id,
            )
        )
        .first()
    )

    if anterior:
        anterior.status = "running"
        anterior.target = target
        anterior.pdb_id = pdb_id
        anterior.ligand_resname = ligand_resname
        anterior.ligand_resnum = ligand_resnum
        anterior.chain = chain
        anterior.base_input_path = base_input_path
        anterior.base_docking_output_path = base_docking_output_path
        anterior.base_selected_mols = base_selected_mols
        anterior.charge_type = charge_type
        anterior.prepare_complex = prepare_complex
        anterior.selected_categories = selected_categories
        anterior.mol_count = None
        anterior.result_csv_path = None
        anterior.correlation_img_path = None
        anterior.error_msg = None
        anterior.created_at = datetime.utcnow()
        anterior.finished_at = None
        db.commit()
        db.refresh(anterior)
        return anterior

    job = ConsensusJob(
        user_id=user_id,
        admet_result_id=admet_result_id,
        status="running",
        target=target,
        pdb_id=pdb_id,
        ligand_resname=ligand_resname,
        ligand_resnum=ligand_resnum,
        chain=chain,
        base_input_path=base_input_path,
        base_docking_output_path=base_docking_output_path,
        base_selected_mols=base_selected_mols,
        charge_type=charge_type,
        prepare_complex=prepare_complex,
        selected_categories=selected_categories,
    )
    db.add(job)
    db.commit()
    db.refresh(job)
    return job


def buscar_por_id(db: Session, job_id: int, user_id: int) -> Optional[ConsensusJob]:
    return (
        db.query(ConsensusJob)
        .filter(and_(ConsensusJob.id == job_id, ConsensusJob.user_id == user_id))
        .first()
    )


def buscar_por_admet(db: Session, admet_result_id: int, user_id: int) -> Optional[ConsensusJob]:
    return (
        db.query(ConsensusJob)
        .filter(
            and_(
                ConsensusJob.admet_result_id == admet_result_id,
                ConsensusJob.user_id == user_id,
            )
        )
        .order_by(ConsensusJob.id.desc())
        .first()
    )


def atualizar_mol_count(db: Session, job_id: int, mol_count: int) -> None:
    job = db.query(ConsensusJob).filter(ConsensusJob.id == job_id).first()
    if job:
        job.mol_count = mol_count
        db.commit()


def marcar_concluido(
    db: Session,
    job_id: int,
    result_csv_path: Optional[str],
    correlation_img_path: Optional[str],
) -> None:
    job = db.query(ConsensusJob).filter(ConsensusJob.id == job_id).populate_existing().first()
    if job and job.status != "cancelled":
        job.status = "done"
        job.result_csv_path = result_csv_path
        job.correlation_img_path = correlation_img_path
        job.finished_at = datetime.utcnow()
        db.commit()


def marcar_erro(db: Session, job_id: int, mensagem: str) -> None:
    job = db.query(ConsensusJob).filter(ConsensusJob.id == job_id).populate_existing().first()
    if job and job.status != "cancelled":
        job.status = "error"
        job.error_msg = mensagem
        job.finished_at = datetime.utcnow()
        db.commit()
