"""
routes/chembl.py — Rotas do módulo ChEMBL (/api/chembl)

POST /api/chembl/run       → StreamingResponse SSE (execução do grupo)
GET  /api/chembl/jobs      → histórico de jobs do usuário
POST /api/chembl/analise   → BackgroundTask de análise molecular
"""

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, status
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.core.deps import get_usuario_atual, get_usuario_opcional
from app.domain.models import User
from app.domain.schemas.chembl import (
    ChemblRunRequest,
    ChemblAnalysisRequest,
    ChemblJobListResponse,
    ChemblJobResponse,
    ChemblMoleculesListResponse,
    ChemblAnalysisStatusResponse,
    ChemblNetworksResponse,
)
from app.infra.db.database import get_db
from app.usecases import chembl as uc

router = APIRouter(prefix="/api/chembl", tags=["ChEMBL"])


@router.post("/run", response_model=ChemblJobResponse)
async def run_grupo(
    dados: ChemblRunRequest,
    db: Session = Depends(get_db),
    usuario: User = Depends(get_usuario_atual),
):
    """
    Cria o job e dispara a execução em background.
    Retorna o job imediatamente; o cliente faz polling via GET /jobs/{id}.
    """
    if not dados.items:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="O grupo deve ter ao menos um alvo.",
        )
    job = await uc.uc_iniciar_grupo(db, dados, usuario)
    return ChemblJobResponse.model_validate(job)


@router.get("/jobs", response_model=ChemblJobListResponse)
def listar_jobs(
    db: Session = Depends(get_db),
    usuario: User = Depends(get_usuario_atual),
):
    """Retorna o histórico de jobs ChEMBL do usuário autenticado."""
    jobs = uc.uc_listar_jobs(db, usuario.id)
    return ChemblJobListResponse(
        jobs=[ChemblJobResponse.model_validate(j) for j in jobs]
    )


@router.post("/analise", status_code=status.HTTP_202_ACCEPTED)
def iniciar_analise(
    dados: ChemblAnalysisRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    usuario: User = Depends(get_usuario_atual),
):
    """Dispara análise de fingerprints e similaridade em background."""
    background_tasks.add_task(uc.uc_iniciar_analise, dados, usuario, db)
    return {"msg": "Análise iniciada em background."}


@router.get("/jobs/{job_id}", response_model=ChemblJobResponse)
def get_job(
    job_id: int,
    db: Session = Depends(get_db),
    usuario: User = Depends(get_usuario_atual),
):
    """Retorna um job específico do usuário autenticado."""
    job = uc.uc_get_job(db, job_id, usuario.id)
    if not job:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job não encontrado.")

    if job.status == "running":
        uc._recover_orphaned_job(db, job)

    response = ChemblJobResponse.model_validate(job)
    for item in response.items:
        if item.status == "running":
            item.current_step = uc._infer_step(job.base_output_path, item.folder_name)
    return response


@router.get("/jobs/{job_id}/molecules", response_model=ChemblMoleculesListResponse)
def listar_moleculas(
    job_id: int,
    page: int = 1,
    per_page: int = 50,
    db: Session = Depends(get_db),
    usuario: User = Depends(get_usuario_atual),
):
    """Retorna as moléculas coletadas para um job, lendo os CSVs de bioatividades."""
    result = uc.uc_listar_moleculas(db, job_id, usuario.id, page=page, per_page=per_page)
    if result is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job não encontrado.")
    return result


@router.get("/jobs/{job_id}/analysis-status", response_model=ChemblAnalysisStatusResponse)
def analise_status(
    job_id: int,
    db: Session = Depends(get_db),
    usuario: User = Depends(get_usuario_atual),
):
    """Retorna o status da análise molecular para um job."""
    result = uc.uc_analise_status(db, job_id, usuario.id)
    if result is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job não encontrado.")
    return result


@router.get("/jobs/{job_id}/networks", response_model=ChemblNetworksResponse)
def get_networks(
    job_id: int,
    db: Session = Depends(get_db),
    usuario: User = Depends(get_usuario_atual),
):
    """Retorna metadados das redes de similaridade (scaffold, MCC, bins) de um job."""
    result = uc.uc_get_networks(db, job_id, usuario.id)
    if result is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job não encontrado.")
    return result


@router.get("/jobs/{job_id}/plot/{filename}")
def get_plot(
    job_id: int,
    filename: str,
    db: Session = Depends(get_db),
    usuario: User | None = Depends(get_usuario_opcional),
):
    """Serve o PNG de análise de rede. Aceita token via header ou ?token= (img src)."""
    if usuario is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token inválido.")
    plot_path = uc.uc_get_plot(db, job_id, usuario.id, filename)
    if plot_path is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Plot não encontrado.")
    return FileResponse(str(plot_path), media_type="image/png")


@router.delete("/jobs/{job_id}", status_code=status.HTTP_204_NO_CONTENT)
def deletar_job(
    job_id: int,
    db: Session = Depends(get_db),
    usuario: User = Depends(get_usuario_atual),
):
    """Remove um job ChEMBL do histórico do usuário."""
    deleted = uc.uc_deletar_job(db, job_id, usuario.id)
    if not deleted:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job não encontrado.")
