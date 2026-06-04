"""
routes/redocking.py — Rotas de redocking (/api/redocking)

POST /api/redocking/iniciar   — cria job e dispara execução em background
GET  /api/redocking/jobs      — lista jobs do usuário autenticado
GET  /api/redocking/jobs/status/{job_id} — status de um job específico
"""

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.deps import get_usuario_atual
from app.domain.models import User
from app.domain.schemas.redocking import (
    IniciarRedockingRequest,
    RedockingJobListResponse,
    RedockingJobResponse,
    RedockingDefaultsResponse,
    SalvarCsvRequest,
    CsvResponse,
)
from app.infra.db.database import get_db
from app.infra.redocking_runner import executar_redocking_background
from app.usecases import redocking as uc

router = APIRouter(prefix="/api/redocking", tags=["Redocking"])


@router.post(
    "/iniciar", response_model=RedockingJobResponse, status_code=status.HTTP_201_CREATED
)
def iniciar_redocking(
    dados: IniciarRedockingRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    usuario: User = Depends(get_usuario_atual),
):
    """Cria um job de redocking e inicia a execução em background."""
    try:
        job = uc.uc_iniciar_redocking(
            db=db,
            usuario=usuario,
            target=dados.target,
            base_input_path=dados.base_input_path,
            base_output_path=dados.base_output_path,
            charge_type=dados.charge_type,
            csv_content=dados.csv_content,
        )
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc))
    background_tasks.add_task(
        executar_redocking_background,
        job_id=job.id,
        base_input_path=dados.base_input_path,
        target=dados.target,
        base_output_path=dados.base_output_path,
        charge_type=dados.charge_type,
        email_notificacao=usuario.email,
        csv_content=dados.csv_content,
    )
    return job


@router.get("/jobs", response_model=RedockingJobListResponse)
def listar_jobs(
    db: Session = Depends(get_db),
    usuario: User = Depends(get_usuario_atual),
):
    """Lista todos os jobs de redocking do usuário autenticado."""
    jobs = uc.uc_listar_jobs(db, usuario)
    return RedockingJobListResponse(jobs=jobs)


@router.get("/jobs/status/{job_id}", response_model=RedockingJobResponse)
def status_job(
    job_id: int,
    db: Session = Depends(get_db),
    usuario: User = Depends(get_usuario_atual),
):
    """Retorna o status atual de um job específico."""
    try:
        return uc.uc_status_job(db, usuario, job_id)
    except KeyError:
        raise HTTPException(status_code=404, detail=f"Job {job_id} não encontrado.")


@router.put("/csv", status_code=status.HTTP_204_NO_CONTENT)
def salvar_csv(
    dados: SalvarCsvRequest,
    db: Session = Depends(get_db),
    usuario: User = Depends(get_usuario_atual),
):
    """Salva ou atualiza o pdb_codes.csv do usuário autenticado."""
    uc.uc_salvar_csv(
        db, usuario, dados.csv_content, dados.target, dados.base_input_path
    )


@router.get("/csv", response_model=CsvResponse)
def buscar_csv(
    db: Session = Depends(get_db),
    usuario: User = Depends(get_usuario_atual),
):
    """Retorna o pdb_codes.csv mais recente do usuário. 404 se ainda não houver."""
    csv_content = uc.uc_buscar_csv(db, usuario)
    if csv_content is None:
        raise HTTPException(
            status_code=404, detail="Nenhum CSV salvo para este usuário."
        )
    from app.services.redocking import buscar_csv_usuario

    registro = buscar_csv_usuario(db, usuario.id)
    return registro


@router.get("/defaults", response_model=RedockingDefaultsResponse)
def defaults_redocking(
    db: Session = Depends(get_db),
    usuario: User = Depends(get_usuario_atual),
):
    """Retorna valores padrão para os campos de configuração do redocking."""
    return uc.uc_defaults_redocking(db, usuario)
