"""
routes/clustering.py — Rotas do módulo de Clustering MAIA (/api/clustering)

POST   /api/clustering/iniciar              → inicia job de clustering (202)
GET    /api/clustering/by-admet/{id}        → job existente para aquele ADMET
DELETE /api/clustering/by-admet/{id}        → apaga clustering + neurodock do ADMET (cascade/reset)
GET    /api/clustering/{job_id}             → polling de status + metadados
DELETE /api/clustering/{job_id}             → apaga job de clustering
GET    /api/clustering/{job_id}/plot        → serve o PNG t-SNE (FileResponse)
GET    /api/clustering/{job_id}/centroid/{cluster_id} → serve PNG do centroide do cluster N
GET    /api/clustering/{job_id}/download    → baixa o CSV com labels de cluster
"""
import glob
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.core.deps import get_usuario_atual
from app.domain.models import User
from app.domain.schemas.clustering import ClusteringIniciarRequest, ClusteringJobResponse
from app.services import clustering as svc
from app.services import neurodock as svc_neurodock
from app.infra.db.database import get_db
from app.usecases import clustering as uc

router = APIRouter(prefix="/api/clustering", tags=["Clustering"])


def _to_response(job) -> ClusteringJobResponse:
    return ClusteringJobResponse(
        id=job.id,
        admet_result_id=job.admet_result_id,
        status=job.status,
        target=job.target,
        fingerprint_type=job.fingerprint_type,
        base_input_path=job.base_input_path,
        base_output_path=job.base_output_path,
        max_mols=job.max_mols,
        n_clusters=job.n_clusters,
        silhouette_score=job.silhouette_score,
        result_csv_path=job.result_csv_path,
        error_msg=job.error_msg,
        created_at=job.created_at,
        finished_at=job.finished_at,
    )


@router.post("/iniciar", response_model=ClusteringJobResponse, status_code=status.HTTP_202_ACCEPTED)
def iniciar_clustering(
    dados: ClusteringIniciarRequest,
    db: Session = Depends(get_db),
    usuario: User = Depends(get_usuario_atual),
):
    try:
        job = uc.uc_iniciar_clustering(
            db=db,
            usuario=usuario,
            admet_result_id=dados.admet_result_id,
            fingerprint_type=dados.fingerprint_type,
            base_output_path=dados.base_output_path,
            max_mols=dados.max_mols,
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except PermissionError as e:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(e))
    return _to_response(job)


@router.get("/by-admet/{admet_result_id}", response_model=ClusteringJobResponse)
def get_by_admet(
    admet_result_id: int,
    db: Session = Depends(get_db),
    usuario: User = Depends(get_usuario_atual),
):
    job = uc.uc_get_job_by_admet(db, admet_result_id, usuario)
    if job is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Nenhum job de clustering para este resultado ADMET.")
    return _to_response(job)


@router.delete("/by-admet/{admet_result_id}", status_code=status.HTTP_204_NO_CONTENT)
def deletar_por_admet(
    admet_result_id: int,
    db: Session = Depends(get_db),
    usuario: User = Depends(get_usuario_atual),
):
    """Remove clustering + neurodock de um ADMET (reset de pipeline ao re-rodar consenso)."""
    import shutil
    jobs = svc.listar_por_admet(db, admet_result_id, usuario.id)
    for job in jobs:
        modelo = svc_neurodock.buscar_modelo_por_clustering(db, job.id, usuario.id)
        if modelo:
            for path_attr in (modelo.model_output_path, modelo.history_output_path):
                if path_attr:
                    p = Path(path_attr)
                    if p.exists():
                        shutil.rmtree(p, ignore_errors=True)
            svc_neurodock.deletar_modelo(db, modelo.id, usuario.id)
        if job.result_dir:
            result_path = Path(job.result_dir)
            if result_path.exists():
                shutil.rmtree(result_path, ignore_errors=True)
        svc.deletar(db, job.id, usuario.id)


@router.get("/{job_id}", response_model=ClusteringJobResponse)
def get_job(
    job_id: int,
    db: Session = Depends(get_db),
    usuario: User = Depends(get_usuario_atual),
):
    job = uc.uc_get_job(db, job_id, usuario)
    if job is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job de clustering não encontrado.")
    return _to_response(job)


@router.get("/{job_id}/plot")
def get_tsne_plot(
    job_id: int,
    db: Session = Depends(get_db),
    usuario: User = Depends(get_usuario_atual),
):
    """Serve o PNG do scatter t-SNE gerado pelo DrugHunter."""
    job = uc.uc_get_job(db, job_id, usuario)
    if job is None or job.status != "done":
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job não encontrado ou ainda em execução.")
    if not job.result_dir:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Diretório de resultado não disponível.")
    plots_dir = Path(job.result_dir) / "plots"
    pngs = list(plots_dir.glob("*.png")) if plots_dir.exists() else []
    if not pngs:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Gráfico t-SNE não encontrado.")
    return FileResponse(str(pngs[0]), media_type="image/png")


@router.get("/{job_id}/centroid/{cluster_id}")
def get_centroid_image(
    job_id: int,
    cluster_id: int,
    db: Session = Depends(get_db),
    usuario: User = Depends(get_usuario_atual),
):
    """Serve o PNG do centroide (MCS) do cluster N."""
    job = uc.uc_get_job(db, job_id, usuario)
    if job is None or job.status != "done":
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job não encontrado ou ainda em execução.")
    if not job.result_dir:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Diretório de resultado não disponível.")
    centroids_dir = Path(job.result_dir) / "centroids"
    pattern = str(centroids_dir / f"*_c{cluster_id}.png")
    matches = glob.glob(pattern)
    if not matches:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Centroide do cluster {cluster_id} não encontrado.")
    return FileResponse(matches[0], media_type="image/png")


@router.delete("/{job_id}", status_code=status.HTTP_204_NO_CONTENT)
def deletar_clustering(
    job_id: int,
    db: Session = Depends(get_db),
    usuario: User = Depends(get_usuario_atual),
):
    """Remove job de clustering + NeuroDock downstream + arquivos em disco."""
    import shutil
    job = svc.buscar_por_id(db, job_id, usuario.id)
    if job is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job não encontrado.")
    # Cascata NeuroDock (FK é SET NULL, precisa ser explícito)
    modelo = svc_neurodock.buscar_modelo_por_clustering(db, job.id, usuario.id)
    if modelo:
        for path_attr in (modelo.model_output_path, modelo.history_output_path):
            if path_attr:
                p = Path(path_attr)
                if p.exists():
                    shutil.rmtree(p, ignore_errors=True)
        svc_neurodock.deletar_modelo(db, modelo.id, usuario.id)
    if job.result_dir:
        result_path = Path(job.result_dir)
        if result_path.exists():
            shutil.rmtree(result_path, ignore_errors=True)
    svc.deletar(db, job_id, usuario.id)


@router.get("/{job_id}/tsne-data")
def get_tsne_data(
    job_id: int,
    db: Session = Depends(get_db),
    usuario: User = Depends(get_usuario_atual),
):
    """Retorna coordenadas t-SNE como JSON para visualização interativa no frontend."""
    from fastapi.responses import JSONResponse
    import json as _json

    job = uc.uc_get_job(db, job_id, usuario)
    if job is None or job.status != "done":
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job não encontrado ou ainda em execução.")
    if not job.result_dir:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Diretório de resultado não disponível.")
    tsne_path = Path(job.result_dir) / "data" / "tsne_data.json"
    if not tsne_path.exists():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Dados t-SNE não disponíveis.")
    return JSONResponse(content=_json.loads(tsne_path.read_text()))


@router.get("/{job_id}/download")
def download_csv(
    job_id: int,
    db: Session = Depends(get_db),
    usuario: User = Depends(get_usuario_atual),
):
    """Download do CSV de clustering (molecule_chembl_id, canonical_smiles, label)."""
    job = uc.uc_get_job(db, job_id, usuario)
    if job is None or job.status != "done":
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job não encontrado ou ainda em execução.")
    if not job.result_csv_path or not Path(job.result_csv_path).exists():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Arquivo CSV não disponível.")
    path = Path(job.result_csv_path)
    return FileResponse(str(path), media_type="text/csv", filename=path.name)
