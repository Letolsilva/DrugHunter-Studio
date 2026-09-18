"""
routes/neurodock.py — Rotas do módulo NeuroDock MAIA (/api/neurodock)

POST /api/neurodock/treinar                         → inicia treinamento (202)
GET  /api/neurodock/by-clustering/{clustering_id}   → modelo existente para aquele clustering
DELETE /api/neurodock/by-clustering/{clustering_id} → apaga modelo + predições do clustering (cascade)
GET  /api/neurodock/model/{model_id}                → polling de status do treinamento
GET  /api/neurodock/model/{model_id}/plot           → PNG de histórico de treino (?index=0)
GET  /api/neurodock/model/{model_id}/plots/count    → quantos PNGs de histórico existem
POST /api/neurodock/model/{model_id}/predict        → inicia triagem virtual (202)
GET  /api/neurodock/prediction/{pred_id}            → polling de status da triagem
GET  /api/neurodock/prediction/{pred_id}/download/top → baixa molecules.csv (top-k)
GET  /api/neurodock/prediction/{pred_id}/download/all → baixa predictions.csv (todos)
"""
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.core.deps import get_usuario_atual
from app.domain.models import User
from app.domain.schemas.neurodock import (
    NeuroDockModelResponse,
    NeuroDockPredictionResponse,
    NeuroDockPredictRequest,
    NeuroDockTreinarRequest,
)
from app.infra.db.database import get_db, get_config
from app.services import neurodock as svc
from app.usecases import neurodock as uc

router = APIRouter(prefix="/api/neurodock", tags=["NeuroDock"])


def _model_response(m) -> NeuroDockModelResponse:
    return NeuroDockModelResponse(
        id=m.id,
        clustering_job_id=m.clustering_job_id,
        status=m.status,
        target=m.target,
        evaluation_name=m.evaluation_name,
        fingerprint_type=m.fingerprint_type,
        consensus_type=m.consensus_type,
        base_input_mols=m.base_input_mols,
        base_input_fingerprints=m.base_input_fingerprints,
        base_input_consensus=m.base_input_consensus,
        model_output_path=m.model_output_path,
        history_output_path=m.history_output_path,
        n_targets=m.n_targets,
        n_train_mols=m.n_train_mols,
        error_msg=m.error_msg,
        created_at=m.created_at,
        finished_at=m.finished_at,
    )


def _pred_response(p) -> NeuroDockPredictionResponse:
    return NeuroDockPredictionResponse(
        id=p.id,
        model_id=p.model_id,
        status=p.status,
        input_dataset=p.input_dataset,
        library_csv_path=p.library_csv_path,
        top_k=p.top_k,
        batch_size=p.batch_size,
        fingerprint_type=p.fingerprint_type,
        base_output_path=p.base_output_path,
        n_screened=p.n_screened,
        n_selected=p.n_selected,
        result_dir=p.result_dir,
        error_msg=p.error_msg,
        created_at=p.created_at,
        finished_at=p.finished_at,
    )


@router.post("/treinar", response_model=NeuroDockModelResponse, status_code=status.HTTP_202_ACCEPTED)
def treinar(
    dados: NeuroDockTreinarRequest,
    db: Session = Depends(get_db),
    usuario: User = Depends(get_usuario_atual),
):
    try:
        model = uc.uc_iniciar_treinamento(
            db=db,
            usuario=usuario,
            clustering_job_id=dados.clustering_job_id,
            evaluation_name=dados.evaluation_name,
            consensus_type=dados.consensus_type,
            model_output_path=dados.model_output_path,
            history_output_path=dados.history_output_path,
            n_trials=dados.n_trials,
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except PermissionError as e:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(e))
    return _model_response(model)


@router.get("/by-clustering/{clustering_job_id}", response_model=NeuroDockModelResponse)
def get_by_clustering(
    clustering_job_id: int,
    db: Session = Depends(get_db),
    usuario: User = Depends(get_usuario_atual),
):
    model = uc.uc_get_model_by_clustering(db, clustering_job_id, usuario)
    if model is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Nenhum modelo NeuroDock para este clustering.")
    return _model_response(model)


@router.delete("/by-clustering/{clustering_job_id}", status_code=status.HTTP_204_NO_CONTENT)
def deletar_por_clustering(
    clustering_job_id: int,
    db: Session = Depends(get_db),
    usuario: User = Depends(get_usuario_atual),
):
    """Remove modelo NeuroDock e predições de um clustering (reset de pipeline)."""
    import shutil
    modelo = svc.buscar_modelo_por_clustering(db, clustering_job_id, usuario.id)
    if modelo is None:
        return
    for path_attr in (modelo.model_output_path, modelo.history_output_path):
        if path_attr:
            p = Path(path_attr)
            if p.exists():
                shutil.rmtree(p, ignore_errors=True)
    svc.deletar_modelo(db, modelo.id, usuario.id)


@router.get("/model/{model_id}", response_model=NeuroDockModelResponse)
def get_model(
    model_id: int,
    db: Session = Depends(get_db),
    usuario: User = Depends(get_usuario_atual),
):
    model = uc.uc_get_model(db, model_id, usuario)
    if model is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Modelo NeuroDock não encontrado.")
    return _model_response(model)


@router.get("/model/{model_id}/config")
def get_model_config(
    model_id: int,
    db: Session = Depends(get_db),
    usuario: User = Depends(get_usuario_atual),
):
    """Retorna o JSON de hiperparâmetros escolhidos pelo Optuna para este modelo."""
    import json as _json
    model = uc.uc_get_model(db, model_id, usuario)
    if model is None or model.status != "done":
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Modelo não encontrado ou ainda em execução.")

    dh_dir = get_config(db, "drug_hunter_path") or ""
    model_dir = Path(dh_dir) / model.model_output_path.lstrip("/")
    json_dir = model_dir.parent / "json"
    json_file = json_dir / f"{model.evaluation_name}.json"

    if not json_file.exists():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Arquivo de configuração não encontrado.")

    return _json.loads(json_file.read_text(encoding="utf-8"))


@router.get("/model/{model_id}/plots/count")
def get_plots_count(
    model_id: int,
    db: Session = Depends(get_db),
    usuario: User = Depends(get_usuario_atual),
):
    """Retorna quantos PNGs de histórico de treino existem."""
    model = uc.uc_get_model(db, model_id, usuario)
    if model is None or model.status != "done":
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Modelo não encontrado ou ainda em execução.")

    dh_dir = get_config(db, "drug_hunter_path") or ""
    history_dir = Path(dh_dir) / model.history_output_path.lstrip("/")
    pngs = sorted(history_dir.glob("*.png")) if history_dir.exists() else []
    return {"count": len(pngs), "files": [p.name for p in pngs]}


@router.get("/model/{model_id}/plot")
def get_history_plot(
    model_id: int,
    index: int = Query(0, ge=0),
    db: Session = Depends(get_db),
    usuario: User = Depends(get_usuario_atual),
):
    """Serve o PNG de histórico de treino pelo índice (0, 1, 2...)."""
    model = uc.uc_get_model(db, model_id, usuario)
    if model is None or model.status != "done":
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Modelo não encontrado ou ainda em execução.")

    dh_dir = get_config(db, "drug_hunter_path") or ""
    history_dir = Path(dh_dir) / model.history_output_path.lstrip("/")
    pngs = sorted(history_dir.glob("*.png")) if history_dir.exists() else []

    if not pngs:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Gráficos de treinamento não encontrados.")
    if index >= len(pngs):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Índice {index} fora do intervalo (total: {len(pngs)}).")

    return FileResponse(str(pngs[index]), media_type="image/png")


@router.get("/model/{model_id}/prediction/latest", response_model=NeuroDockPredictionResponse)
def get_latest_prediction(
    model_id: int,
    db: Session = Depends(get_db),
    usuario: User = Depends(get_usuario_atual),
):
    """Retorna a triagem mais recente de um modelo (ou 404 se nenhuma existir)."""
    preds = uc.uc_listar_predicoes(db, model_id, usuario)
    if not preds:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Nenhuma triagem encontrada para este modelo.")
    return _pred_response(preds[0])


@router.post("/model/{model_id}/predict", response_model=NeuroDockPredictionResponse, status_code=status.HTTP_202_ACCEPTED)
def iniciar_triagem(
    model_id: int,
    dados: NeuroDockPredictRequest,
    db: Session = Depends(get_db),
    usuario: User = Depends(get_usuario_atual),
):
    try:
        pred = uc.uc_iniciar_triagem(
            db=db,
            usuario=usuario,
            model_id=model_id,
            library_csv_path=dados.library_csv_path,
            input_dataset=dados.input_dataset,
            top_k=dados.top_k,
            batch_size=dados.batch_size,
            base_output_path=dados.base_output_path,
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except PermissionError as e:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(e))
    return _pred_response(pred)


@router.get("/prediction/{pred_id}", response_model=NeuroDockPredictionResponse)
def get_prediction(
    pred_id: int,
    db: Session = Depends(get_db),
    usuario: User = Depends(get_usuario_atual),
):
    pred = uc.uc_get_prediction(db, pred_id, usuario)
    if pred is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Triagem não encontrada.")
    return _pred_response(pred)


@router.get("/prediction/{pred_id}/download/top")
def download_top(
    pred_id: int,
    db: Session = Depends(get_db),
    usuario: User = Depends(get_usuario_atual),
):
    """Baixa molecules.csv (top-k moléculas selecionadas)."""
    pred = uc.uc_get_prediction(db, pred_id, usuario)
    if pred is None or pred.status != "done":
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Triagem não encontrada ou ainda em execução.")
    if not pred.result_dir:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Diretório de resultado não disponível.")
    csv = Path(pred.result_dir) / "molecules.csv"
    if not csv.exists():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Arquivo molecules.csv não encontrado.")
    return FileResponse(str(csv), media_type="text/csv", filename=f"{pred.input_dataset}_top{pred.top_k}.csv")


@router.get("/prediction/{pred_id}/download/all")
def download_all(
    pred_id: int,
    db: Session = Depends(get_db),
    usuario: User = Depends(get_usuario_atual),
):
    """Baixa predictions.csv (todas as moléculas com scores)."""
    pred = uc.uc_get_prediction(db, pred_id, usuario)
    if pred is None or pred.status != "done":
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Triagem não encontrada ou ainda em execução.")
    if not pred.result_dir:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Diretório de resultado não disponível.")
    csv = Path(pred.result_dir) / "consensus.csv"
    if not csv.exists():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Arquivo consensus.csv não encontrado.")
    return FileResponse(str(csv), media_type="text/csv", filename=f"{pred.input_dataset}_predictions.csv")
