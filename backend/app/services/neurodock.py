"""
services/neurodock.py — Acesso a dados de jobs NeuroDock MAIA.

Responsabilidade: operações de banco. Não conhece HTTP nem usecases.
"""

from datetime import datetime
from typing import Optional

from sqlalchemy import and_
from sqlalchemy.orm import Session

from app.domain.models.neurodock_model import NeuroDockModel
from app.domain.models.neurodock_prediction import NeuroDockPrediction


# ── NeuroDockModel ────────────────────────────────────────────────────────────

def criar_ou_substituir_modelo(
    db: Session,
    user_id: int,
    clustering_job_id: int,
    target: str,
    evaluation_name: str,
    fingerprint_type: str,
    consensus_type: str,
    base_input_mols: str,
    base_input_fingerprints: str,
    base_input_consensus: str,
    model_output_path: str,
    history_output_path: str,
) -> NeuroDockModel:
    anterior = (
        db.query(NeuroDockModel)
        .filter(
            and_(
                NeuroDockModel.user_id == user_id,
                NeuroDockModel.clustering_job_id == clustering_job_id,
            )
        )
        .first()
    )

    if anterior:
        anterior.status = "running"
        anterior.target = target
        anterior.evaluation_name = evaluation_name
        anterior.fingerprint_type = fingerprint_type
        anterior.consensus_type = consensus_type
        anterior.base_input_mols = base_input_mols
        anterior.base_input_fingerprints = base_input_fingerprints
        anterior.base_input_consensus = base_input_consensus
        anterior.model_output_path = model_output_path
        anterior.history_output_path = history_output_path
        anterior.n_targets = None
        anterior.n_train_mols = None
        anterior.error_msg = None
        anterior.created_at = datetime.utcnow()
        anterior.finished_at = None
        db.commit()
        db.refresh(anterior)
        return anterior

    modelo = NeuroDockModel(
        user_id=user_id,
        clustering_job_id=clustering_job_id,
        status="running",
        target=target,
        evaluation_name=evaluation_name,
        fingerprint_type=fingerprint_type,
        consensus_type=consensus_type,
        base_input_mols=base_input_mols,
        base_input_fingerprints=base_input_fingerprints,
        base_input_consensus=base_input_consensus,
        model_output_path=model_output_path,
        history_output_path=history_output_path,
    )
    db.add(modelo)
    db.commit()
    db.refresh(modelo)
    return modelo


def buscar_modelo_por_id(db: Session, model_id: int, user_id: int) -> Optional[NeuroDockModel]:
    return (
        db.query(NeuroDockModel)
        .filter(and_(NeuroDockModel.id == model_id, NeuroDockModel.user_id == user_id))
        .first()
    )


def buscar_modelo_por_clustering(
    db: Session, clustering_job_id: int, user_id: int
) -> Optional[NeuroDockModel]:
    return (
        db.query(NeuroDockModel)
        .filter(
            and_(
                NeuroDockModel.clustering_job_id == clustering_job_id,
                NeuroDockModel.user_id == user_id,
            )
        )
        .order_by(NeuroDockModel.id.desc())
        .first()
    )


def marcar_modelo_concluido(
    db: Session,
    model_id: int,
    n_targets: Optional[int],
    n_train_mols: Optional[int],
) -> None:
    m = db.query(NeuroDockModel).filter(NeuroDockModel.id == model_id).first()
    if m:
        m.status = "done"
        m.n_targets = n_targets
        m.n_train_mols = n_train_mols
        m.finished_at = datetime.utcnow()
        db.commit()


def marcar_modelo_erro(db: Session, model_id: int, mensagem: str) -> None:
    m = db.query(NeuroDockModel).filter(NeuroDockModel.id == model_id).first()
    if m:
        m.status = "error"
        m.error_msg = mensagem
        m.finished_at = datetime.utcnow()
        db.commit()


# ── NeuroDockPrediction ───────────────────────────────────────────────────────

def criar_predicao(
    db: Session,
    user_id: int,
    model_id: int,
    input_dataset: str,
    library_csv_path: str,
    fingerprint_type: str,
    top_k: int,
    batch_size: int,
    base_output_path: str,
) -> NeuroDockPrediction:
    pred = NeuroDockPrediction(
        user_id=user_id,
        model_id=model_id,
        status="running",
        input_dataset=input_dataset,
        library_csv_path=library_csv_path,
        fingerprint_type=fingerprint_type,
        top_k=top_k,
        batch_size=batch_size,
        base_output_path=base_output_path,
    )
    db.add(pred)
    # Cada triagem grava em <base_output_path>/<pred_id>: o DrugHunter não cria subpasta
    # por dataset, então sem isso triagens no mesmo caminho se sobrescrevem.
    db.flush()
    pred.base_output_path = f"{base_output_path.rstrip('/')}/{pred.id}"
    db.commit()
    db.refresh(pred)
    return pred


def buscar_predicao_por_id(
    db: Session, pred_id: int, user_id: int
) -> Optional[NeuroDockPrediction]:
    return (
        db.query(NeuroDockPrediction)
        .filter(
            and_(NeuroDockPrediction.id == pred_id, NeuroDockPrediction.user_id == user_id)
        )
        .first()
    )


def listar_modelos_por_usuario(db: Session, user_id: int):
    return (
        db.query(NeuroDockModel)
        .filter(NeuroDockModel.user_id == user_id)
        .order_by(NeuroDockModel.created_at.desc())
        .all()
    )


def listar_predicoes_por_modelo(
    db: Session, model_id: int, user_id: int
) -> list[NeuroDockPrediction]:
    return (
        db.query(NeuroDockPrediction)
        .filter(
            and_(
                NeuroDockPrediction.model_id == model_id,
                NeuroDockPrediction.user_id == user_id,
            )
        )
        .order_by(NeuroDockPrediction.created_at.desc())
        .all()
    )


def marcar_predicao_concluida(
    db: Session,
    pred_id: int,
    n_screened: Optional[int],
    n_selected: Optional[int],
    result_dir: Optional[str],
) -> None:
    p = db.query(NeuroDockPrediction).filter(NeuroDockPrediction.id == pred_id).first()
    if p:
        p.status = "done"
        p.n_screened = n_screened
        p.n_selected = n_selected
        p.result_dir = result_dir
        p.finished_at = datetime.utcnow()
        db.commit()


def marcar_predicao_erro(db: Session, pred_id: int, mensagem: str) -> None:
    p = db.query(NeuroDockPrediction).filter(NeuroDockPrediction.id == pred_id).first()
    if p:
        p.status = "error"
        p.error_msg = mensagem
        p.finished_at = datetime.utcnow()
        db.commit()


def deletar_modelo(db: Session, model_id: int, user_id: int) -> bool:
    modelo = (
        db.query(NeuroDockModel)
        .filter(and_(NeuroDockModel.id == model_id, NeuroDockModel.user_id == user_id))
        .first()
    )
    if not modelo:
        return False
    db.delete(modelo)
    db.commit()
    return True
