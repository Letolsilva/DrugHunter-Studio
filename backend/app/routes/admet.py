"""
routes/admet.py — Rotas do módulo ADMET (/api/admet)

POST /api/admet/run                         → inicia análise ADMET para um item ChEMBL
GET  /api/admet/results/{id}               → status + contadores do resultado
GET  /api/admet/results/by-item/{item_id}  → resultado pelo item ChEMBL
GET  /api/admet/results/{id}/molecules     → moléculas paginadas (com filtros opcionais)
GET  /api/admet/results/{id}/download/{tipo} → download CSV
"""

from typing import Optional

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, status
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.core.deps import get_usuario_atual
from app.domain.models import User
from app.domain.models.chembl_job import ChemblJobItem
from app.domain.schemas.admet import AdmetRunRequest, AdmetResultResponse, AdmetMoleculesListResponse, AdmetResultSummary
from app.services import admet as svc
from app.infra.db.database import get_db
from app.usecases import admet as uc

router = APIRouter(prefix="/api/admet", tags=["ADMET"])


def _to_response(db: Session, result) -> AdmetResultResponse:
    """Constrói AdmetResultResponse incluindo o nome do alvo (folder_name do ChemblJobItem)."""
    target: Optional[str] = None
    if result.chembl_job_item_id:
        item = db.get(ChemblJobItem, result.chembl_job_item_id)
        if item:
            target = item.folder_name
    data = AdmetResultResponse.model_validate(result)
    data.target = target
    return data


@router.get("/results/list", response_model=list[AdmetResultSummary])
def listar_resultados(
    db: Session = Depends(get_db),
    usuario: User = Depends(get_usuario_atual),
):
    """Lista todos os resultados ADMET (done) do usuário, com alvo quando disponível."""
    results = svc.listar_por_usuario(db, usuario.id)
    summaries = []
    for r in results:
        target: Optional[str] = None
        if r.chembl_job_item_id:
            item = db.get(ChemblJobItem, r.chembl_job_item_id)
            if item:
                target = item.folder_name
        summaries.append(AdmetResultSummary(
            id=r.id,
            status=r.status,
            total_molecules=r.total_molecules,
            target=target,
            created_at=r.created_at,
        ))
    return summaries


@router.post("/run", response_model=AdmetResultResponse, status_code=status.HTTP_202_ACCEPTED)
def iniciar_admet(
    dados: AdmetRunRequest,
    db: Session = Depends(get_db),
    usuario: User = Depends(get_usuario_atual),
):
    """
    Inicia análise ADMET para um item ChEMBL já concluído.
    Retorna imediatamente (status=running); use GET /results/{id} para polling.
    Re-rodar sobrescreve o resultado anterior.
    """
    try:
        result = uc.uc_iniciar_admet(db, usuario, dados.chembl_job_item_id)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except PermissionError as e:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(e))
    return _to_response(db, result)


@router.get("/results/by-item/{item_id}", response_model=AdmetResultResponse)
def get_result_by_item(
    item_id: int,
    db: Session = Depends(get_db),
    usuario: User = Depends(get_usuario_atual),
):
    """Verifica se já existe resultado ADMET para um item ChEMBL (antes de rodar)."""
    result = uc.uc_get_result_by_item(db, item_id, usuario)
    if result is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Nenhum resultado ADMET para este item.")
    return _to_response(db, result)


@router.get("/results/{result_id}", response_model=AdmetResultResponse)
def get_result(
    result_id: int,
    db: Session = Depends(get_db),
    usuario: User = Depends(get_usuario_atual),
):
    """Retorna status e contadores do resultado ADMET."""
    result = uc.uc_get_result(db, result_id, usuario)
    if result is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Resultado não encontrado.")
    return _to_response(db, result)


@router.get("/results/{result_id}/molecules")
def listar_moleculas(
    result_id: int,
    page: int = 1,
    per_page: int = 50,
    bbb: Optional[str] = None,
    hia: Optional[str] = None,
    db: Session = Depends(get_db),
    usuario: User = Depends(get_usuario_atual),
):
    """
    Retorna moléculas do resultado paginadas.
    Filtros opcionais: ?bbb=BBB%2B, ?hia=HIA%2B
    """
    data = uc.uc_listar_moleculas(db, result_id, usuario, page, per_page, bbb, hia)
    if data is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Resultado não encontrado ou ainda em execução.")
    return data


@router.get("/results/{result_id}/download/{tipo}")
def download_csv(
    result_id: int,
    tipo: str,
    db: Session = Depends(get_db),
    usuario: User = Depends(get_usuario_atual),
):
    """
    Download dos arquivos CSV do resultado.
    tipo: all | bbb_plus | bbb_minus | hia_plus | toxic
    """
    tipos_validos = {"all", "bbb_plus", "bbb_minus", "hia_plus", "toxic"}
    if tipo not in tipos_validos:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Tipo inválido. Use: {', '.join(tipos_validos)}",
        )

    path = uc.uc_get_download_path(db, result_id, usuario, tipo)
    if path is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Arquivo não encontrado.")

    return FileResponse(
        str(path),
        media_type="text/csv",
        filename=path.name,
    )
