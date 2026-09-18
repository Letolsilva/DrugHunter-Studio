"""
usecases/neurodock.py — Orquestração do módulo NeuroDock MAIA.

Monta paths, dispara os workers e persiste os resultados.
Não conhece HTTP nem FastAPI.
"""
import logging
import shutil
from pathlib import Path
from typing import Optional

from sqlalchemy.orm import Session

from app.domain.models import User
from app.domain.models.clustering_job import ClusteringJob
from app.domain.models.consensus_job import ConsensusJob
from app.domain.models.neurodock_model import NeuroDockModel
from app.domain.models.neurodock_prediction import NeuroDockPrediction
from app.infra.db.database import SessionLocal, get_config
from app.infra.external.neurodock_runner import run_train_worker, run_predict_worker
from app.services import neurodock as svc

logger = logging.getLogger("pdb_explorer")

_running_models: set[int] = set()
_running_predictions: set[int] = set()

# Path DH-relativo onde clustering já gravou os inputs (fingerprints + CSVs de moléculas)
_BASE_INPUT_PATH = "/resultados/maia_input"


# ── Treinamento ───────────────────────────────────────────────────────────────

def _executar_treinamento(model_id: int, n_trials: int = 20) -> None:
    db = SessionLocal()
    try:
        model = db.query(NeuroDockModel).filter(NeuroDockModel.id == model_id).first()
        if not model:
            logger.error("NeuroDockModel %s não encontrado.", model_id)
            return

        dh_dir = get_config(db, "drug_hunter_path") or ""
        python_bin = get_config(db, "python_bin") or ""

        # Remove output anterior do modelo para garantir resultado fresco
        abs_model_dir = Path(dh_dir) / model.model_output_path.lstrip("/") / model.evaluation_name
        if abs_model_dir.exists():
            shutil.rmtree(abs_model_dir)
            logger.info("Limpou model output anterior: %s", abs_model_dir)

        n_targets, n_train_mols = run_train_worker(
            python_bin=python_bin,
            dh_dir=dh_dir,
            base_input_mols=model.base_input_mols,
            base_input_fingerprints=model.base_input_fingerprints,
            base_input_consensus=model.base_input_consensus,
            model_output_path=model.model_output_path,
            history_output_path=model.history_output_path,
            input_mols=model.target,
            fingerprint_type=model.fingerprint_type,
            consensus_type=model.consensus_type,
            evaluation_name=model.evaluation_name,
            n_trials=n_trials,
        )

        svc.marcar_modelo_concluido(db, model_id, n_targets, n_train_mols)
        logger.info(
            "NeuroDock treinamento concluído: model_id=%s | alvos=%s | mols=%s",
            model_id, n_targets, n_train_mols,
        )

    except Exception as e:
        logger.exception("Erro no treinamento NeuroDock model_id=%s: %s", model_id, e)
        try:
            svc.marcar_modelo_erro(db, model_id, str(e))
        except Exception:
            pass
    finally:
        db.close()


def uc_iniciar_treinamento(
    db: Session,
    usuario: User,
    clustering_job_id: int,
    evaluation_name: str,
    consensus_type: str,
    model_output_path: str,
    history_output_path: str,
    n_trials: int = 20,
) -> NeuroDockModel:
    clustering_job = db.query(ClusteringJob).filter(ClusteringJob.id == clustering_job_id).first()
    if clustering_job is None:
        raise ValueError(f"ClusteringJob {clustering_job_id} não encontrado.")
    if clustering_job.user_id != usuario.id:
        raise PermissionError("Este job de clustering não pertence ao usuário.")
    if clustering_job.status != "done":
        raise ValueError("O clustering ainda não concluiu. Aguarde antes de treinar o modelo.")

    # Localiza o ConsensusJob correspondente (mesmo admet_result_id + user_id)
    consensus_job = (
        db.query(ConsensusJob)
        .filter(
            ConsensusJob.user_id == usuario.id,
            ConsensusJob.admet_result_id == clustering_job.admet_result_id,
            ConsensusJob.status == "done",
        )
        .first()
    )
    if consensus_job is None:
        raise ValueError(
            "Nenhum resultado de docking (consenso) concluído encontrado para este dataset. "
            "Execute o módulo de Consenso antes de treinar o NeuroDock."
        )

    # base_input_consensus = pasta onde estão <Alvo>/<Alvo>.csv dos scores de docking
    # ConsensusJob guarda base_docking_output_path (DH-relativo) — usamos como base_input_consensus
    base_input_consensus = consensus_job.base_docking_output_path

    model = svc.criar_ou_substituir_modelo(
        db=db,
        user_id=usuario.id,
        clustering_job_id=clustering_job_id,
        target=clustering_job.target,
        evaluation_name=evaluation_name,
        fingerprint_type=clustering_job.fingerprint_type,
        consensus_type=consensus_type,
        base_input_mols=_BASE_INPUT_PATH,
        base_input_fingerprints=f"{_BASE_INPUT_PATH}/Fingerprints",
        base_input_consensus=base_input_consensus,
        model_output_path=model_output_path,
        history_output_path=history_output_path,
    )

    import threading

    def _wrapper(model_id: int, _n_trials: int) -> None:
        _running_models.add(model_id)
        try:
            _executar_treinamento(model_id, _n_trials)
        finally:
            _running_models.discard(model_id)

    t = threading.Thread(target=_wrapper, args=(model.id, n_trials), daemon=True)
    t.start()

    return model


def _recover_orphaned_model(db: Session, model: NeuroDockModel) -> None:
    if model.status == "running" and model.id not in _running_models:
        logger.warning("NeuroDockModel %s está 'running' sem thread — marcando como erro.", model.id)
        svc.marcar_modelo_erro(db, model.id, "Job interrompido: o servidor foi reiniciado durante a execução.")


def uc_get_model(db: Session, model_id: int, usuario: User) -> Optional[NeuroDockModel]:
    model = svc.buscar_modelo_por_id(db, model_id, usuario.id)
    if model is not None:
        _recover_orphaned_model(db, model)
        db.refresh(model)
    return model


def uc_get_model_by_clustering(
    db: Session, clustering_job_id: int, usuario: User
) -> Optional[NeuroDockModel]:
    model = svc.buscar_modelo_por_clustering(db, clustering_job_id, usuario.id)
    if model is not None:
        _recover_orphaned_model(db, model)
        db.refresh(model)
    return model


# ── Triagem Virtual ───────────────────────────────────────────────────────────

def _executar_triagem(pred_id: int) -> None:
    db = SessionLocal()
    try:
        pred = db.query(NeuroDockPrediction).filter(NeuroDockPrediction.id == pred_id).first()
        if not pred:
            logger.error("NeuroDockPrediction %s não encontrada.", pred_id)
            return

        model = db.query(NeuroDockModel).filter(NeuroDockModel.id == pred.model_id).first()
        if not model:
            raise RuntimeError(f"NeuroDockModel {pred.model_id} não encontrado.")

        dh_dir = get_config(db, "drug_hunter_path") or ""
        python_bin = get_config(db, "python_bin") or ""

        n_screened, n_selected = run_predict_worker(
            python_bin=python_bin,
            dh_dir=dh_dir,
            library_csv_path=pred.library_csv_path,
            input_dataset=pred.input_dataset,
            model_output_path=model.model_output_path,
            evaluation_model=model.evaluation_name,
            base_output_path=pred.base_output_path,
            fingerprint_type=pred.fingerprint_type,
            top_k=pred.top_k,
            batch_size=pred.batch_size,
        )

        # DrugHunter salva direto em base_output_path/ (sem subdiretório por dataset)
        result_dir = Path(dh_dir) / pred.base_output_path.lstrip("/")

        svc.marcar_predicao_concluida(
            db, pred_id, n_screened, n_selected,
            str(result_dir) if result_dir.exists() else None,
        )
        logger.info(
            "NeuroDock triagem concluída: pred_id=%s | triadas=%s | selecionadas=%s",
            pred_id, n_screened, n_selected,
        )

    except Exception as e:
        logger.exception("Erro na triagem NeuroDock pred_id=%s: %s", pred_id, e)
        try:
            svc.marcar_predicao_erro(db, pred_id, str(e))
        except Exception:
            pass
    finally:
        db.close()


def uc_iniciar_triagem(
    db: Session,
    usuario: User,
    model_id: int,
    library_csv_path: str,
    input_dataset: str,
    top_k: int,
    batch_size: int,
    base_output_path: str,
) -> NeuroDockPrediction:
    model = svc.buscar_modelo_por_id(db, model_id, usuario.id)
    if model is None:
        raise ValueError(f"Modelo NeuroDock {model_id} não encontrado.")
    if model.status != "done":
        raise ValueError("O modelo ainda não foi treinado. Aguarde o treinamento concluir.")

    from pathlib import Path as _Path
    lib_path = _Path(library_csv_path)
    if not lib_path.exists():
        raise ValueError(f"Arquivo CSV da biblioteca não encontrado: {library_csv_path}")

    # Valida colunas obrigatórias do CSV
    try:
        import csv as _csv
        with open(str(lib_path), newline="", encoding="utf-8") as f:
            reader = _csv.reader(f)
            header = [h.strip().lower() for h in next(reader, [])]
        # DrugHunter aceita 'smiles' ou 'smile' (renomeia 'smile' → 'smiles' internamente).
        # 'canonical_smiles' NÃO é reconhecido — use 'smiles'.
        smiles_cols = {"smiles", "smile"}
        if not smiles_cols.intersection(header):
            raise ValueError(
                "O CSV da biblioteca não contém coluna de SMILES válida. "
                "Use 'smiles' ou 'smile' como nome da coluna."
            )
        # DrugHunter exige um ID de molécula: 'molecule_chembl_id' ou 'zinc_id'.
        id_cols = {"molecule_chembl_id", "zinc_id"}
        if not id_cols.intersection(header):
            raise ValueError(
                "O CSV da biblioteca não contém coluna de ID. "
                "Use 'molecule_chembl_id' ou 'zinc_id' como nome da coluna."
            )
    except ValueError:
        raise
    except Exception as exc:
        raise ValueError(f"Não foi possível ler o cabeçalho do CSV: {exc}")

    pred = svc.criar_predicao(
        db=db,
        user_id=usuario.id,
        model_id=model_id,
        input_dataset=input_dataset,
        library_csv_path=library_csv_path,
        fingerprint_type=model.fingerprint_type,
        top_k=top_k,
        batch_size=batch_size,
        base_output_path=base_output_path,
    )

    import threading

    def _wrapper(pred_id: int) -> None:
        _running_predictions.add(pred_id)
        try:
            _executar_triagem(pred_id)
        finally:
            _running_predictions.discard(pred_id)

    t = threading.Thread(target=_wrapper, args=(pred.id,), daemon=True)
    t.start()

    return pred


def _recover_orphaned_prediction(db: Session, pred: NeuroDockPrediction) -> None:
    if pred.status == "running" and pred.id not in _running_predictions:
        logger.warning("NeuroDockPrediction %s está 'running' sem thread — marcando como erro.", pred.id)
        svc.marcar_predicao_erro(db, pred.id, "Job interrompido: o servidor foi reiniciado durante a execução.")


def uc_get_prediction(
    db: Session, pred_id: int, usuario: User
) -> Optional[NeuroDockPrediction]:
    pred = svc.buscar_predicao_por_id(db, pred_id, usuario.id)
    if pred is not None:
        _recover_orphaned_prediction(db, pred)
        db.refresh(pred)
    return pred


def uc_listar_predicoes(
    db: Session, model_id: int, usuario: User
) -> list[NeuroDockPrediction]:
    return svc.listar_predicoes_por_modelo(db, model_id, usuario.id)
