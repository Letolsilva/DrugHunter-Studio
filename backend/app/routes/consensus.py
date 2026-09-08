"""
routes/consensus.py — Rotas do módulo de Docking de Consenso (/api/consensus)

POST /api/consensus/iniciar                       → inicia job de consenso
GET  /api/consensus/redocking-jobs                → lista redocking jobs para pré-preenchimento
GET  /api/consensus/by-admet/{admet_result_id}    → job pelo resultado ADMET
GET  /api/consensus/{job_id}                      → status + resultado
GET  /api/consensus/{job_id}/correlation          → imagem PNG de correlação
GET  /api/consensus/{job_id}/download             → download do CSV de consenso
"""

import pandas as pd
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import FileResponse
from pathlib import Path
from sqlalchemy.orm import Session

from app.core.deps import get_usuario_atual
from app.domain.models import User
from app.domain.schemas.consensus import (
    ConsensusIniciarRequest,
    ConsensusJobResponse,
    ConsensusRedockingJobItem,
    ConsensusRedockingJobsResponse,
)
from app.infra.db.database import get_db
from app.usecases import consensus as uc

router = APIRouter(prefix="/api/consensus", tags=["Consensus"])


def _to_response(job) -> ConsensusJobResponse:
    # Lê o CSV do disco em vez de usar o JSON armazenado no banco.
    result_json = None
    if job.result_csv_path and Path(job.result_csv_path).exists():
        try:
            df = pd.read_csv(job.result_csv_path)
            result_json = df.to_json(orient="records", force_ascii=False)
        except Exception:
            pass

    return ConsensusJobResponse(
        id=job.id,
        admet_result_id=job.admet_result_id,
        status=job.status,
        target=job.target,
        pdb_id=job.pdb_id,
        ligand_resname=job.ligand_resname,
        ligand_resnum=job.ligand_resnum,
        chain=job.chain,
        charge_type=job.charge_type,
        prepare_complex=job.prepare_complex,
        selected_categories=job.selected_categories,
        base_input_path=job.base_input_path,
        base_docking_output_path=job.base_docking_output_path,
        base_selected_mols=job.base_selected_mols,
        mol_count=job.mol_count,
        result_json=result_json,
        has_correlation=bool(job.correlation_img_path),
        error_msg=job.error_msg,
        created_at=job.created_at,
        finished_at=job.finished_at,
    )


@router.post("/iniciar", response_model=ConsensusJobResponse, status_code=status.HTTP_202_ACCEPTED)
def iniciar_consensus(
    dados: ConsensusIniciarRequest,
    db: Session = Depends(get_db),
    usuario: User = Depends(get_usuario_atual),
):
    """
    Inicia o docking de consenso para um resultado ADMET.
    Retorna imediatamente (status=running); use GET /{job_id} para polling.
    Re-rodar sobrescreve o job anterior.
    """
    try:
        job = uc.uc_iniciar_consensus(
            db=db,
            usuario=usuario,
            admet_result_id=dados.admet_result_id,
            selected_categories=list(dados.selected_categories),
            pdb_id=dados.pdb_id,
            ligand_resname=dados.ligand_resname,
            ligand_resnum=dados.ligand_resnum,
            chain=dados.chain,
            base_input_path=dados.base_input_path,
            base_docking_output_path=dados.base_docking_output_path,
            charge_type=dados.charge_type,
            prepare_complex=dados.prepare_complex,
            max_mols=dados.max_mols,
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except PermissionError as e:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(e))
    return _to_response(job)


@router.get("/redocking-jobs", response_model=ConsensusRedockingJobsResponse)
def listar_redocking_jobs(
    db: Session = Depends(get_db),
    usuario: User = Depends(get_usuario_atual),
):
    """Retorna os jobs de redocking do usuário para pré-preencher o formulário de consenso."""
    jobs = uc.uc_listar_redocking_jobs(db, usuario)
    items = [
        ConsensusRedockingJobItem(
            id=j.id,
            target=j.target,
            base_input_path=j.base_input_path,
            base_output_path=j.base_output_path,
            charge_type=j.charge_type,
            csv_content=j.csv_content or "",
            status=j.status,
            iniciado_em=j.iniciado_em,
        )
        for j in jobs
        if j.csv_content
    ]
    return ConsensusRedockingJobsResponse(jobs=items)


@router.get("/by-admet/{admet_result_id}", response_model=ConsensusJobResponse)
def get_by_admet(
    admet_result_id: int,
    db: Session = Depends(get_db),
    usuario: User = Depends(get_usuario_atual),
):
    """Retorna o job de consenso associado a um resultado ADMET, se existir."""
    job = uc.uc_get_job_by_admet(db, admet_result_id, usuario)
    if job is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Nenhum job de consenso para este resultado ADMET.")
    return _to_response(job)


@router.get("/{job_id}", response_model=ConsensusJobResponse)
def get_job(
    job_id: int,
    db: Session = Depends(get_db),
    usuario: User = Depends(get_usuario_atual),
):
    """Retorna status e resultado do job de consenso."""
    job = uc.uc_get_job(db, job_id, usuario)
    if job is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job de consenso não encontrado.")
    return _to_response(job)


@router.get("/{job_id}/correlation")
def get_correlation_image(
    job_id: int,
    db: Session = Depends(get_db),
    usuario: User = Depends(get_usuario_atual),
):
    """Retorna a imagem PNG de correlação Vina × Dock6 gerada pelo DrugHunter."""
    job = uc.uc_get_job(db, job_id, usuario)
    if job is None or job.status != "done":
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job não encontrado ou ainda em execução.")
    if not job.correlation_img_path or not Path(job.correlation_img_path).exists():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Imagem de correlação não disponível.")
    return FileResponse(str(job.correlation_img_path), media_type="image/png")


@router.get("/{job_id}/download")
def download_csv(
    job_id: int,
    db: Session = Depends(get_db),
    usuario: User = Depends(get_usuario_atual),
):
    """Download do CSV de consenso gerado pelo DrugHunter."""
    job = uc.uc_get_job(db, job_id, usuario)
    if job is None or job.status != "done":
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job não encontrado ou ainda em execução.")
    if not job.result_csv_path or not Path(job.result_csv_path).exists():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Arquivo CSV não disponível.")
    path = Path(job.result_csv_path)
    return FileResponse(str(path), media_type="text/csv", filename=path.name)
