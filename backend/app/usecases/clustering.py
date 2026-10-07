"""
usecases/clustering.py — Orquestração do Clustering MAIA.

Monta paths, dispara o worker e persiste o resultado.
Não conhece HTTP nem FastAPI.
"""
import logging
import shutil
from pathlib import Path
from typing import Optional

from sqlalchemy.orm import Session

from app.domain.models import User
from app.domain.models.admet_result import AdmetResult
from app.domain.models.chembl_job import ChemblJobItem
from app.domain.models.clustering_job import ClusteringJob
from app.infra.db.database import SessionLocal, get_config
from app.infra.external.clustering_runner import run_clustering_worker
from app.services import clustering as svc

logger = logging.getLogger("pdb_explorer")

_running_jobs: set[int] = set()


def _cascade_delete_neurodock(db, clustering_job_id: int) -> None:
    """Apaga o modelo NeuroDock (e suas predições + arquivos) vinculado a este clustering job."""
    from app.domain.models.neurodock_model import NeuroDockModel
    from app.domain.models.neurodock_prediction import NeuroDockPrediction

    neurodock = db.query(NeuroDockModel).filter(NeuroDockModel.clustering_job_id == clustering_job_id).first()
    if neurodock is None:
        return

    for pred in db.query(NeuroDockPrediction).filter(NeuroDockPrediction.model_id == neurodock.id).all():
        if pred.result_dir:
            p = Path(pred.result_dir)
            if p.exists():
                shutil.rmtree(p, ignore_errors=True)
        db.delete(pred)

    for path_attr in (neurodock.model_output_path, neurodock.history_output_path):
        if path_attr:
            p = Path(path_attr)
            if p.exists():
                shutil.rmtree(p, ignore_errors=True)

    db.delete(neurodock)
    db.commit()
    logger.info("Cascade: NeuroDockModel %s deletado (rerun clustering %s).", neurodock.id, clustering_job_id)

# Path DH-relativo onde os inputs (fingerprints + CSVs) são armazenados.
# O DH usa cwd + path[1:] para construir o path absoluto.
_BASE_INPUT_PATH = "/resultados/maia_input"


def _executar_pipeline(job_id: int) -> None:
    db = SessionLocal()
    try:
        job = db.query(ClusteringJob).filter(ClusteringJob.id == job_id).first()
        if not job:
            logger.error("ClusteringJob %s não encontrado.", job_id)
            return

        admet_result = db.query(AdmetResult).filter(AdmetResult.id == job.admet_result_id).first()
        if not admet_result:
            raise RuntimeError("Resultado ADMET não encontrado. Execute a análise ADMET antes de fazer o clustering.")

        item = db.query(ChemblJobItem).filter(ChemblJobItem.id == admet_result.chembl_job_item_id).first()
        if not item:
            raise RuntimeError("Dados ChEMBL não encontrados. O job ChEMBL associado pode ter sido removido.")

        dh_dir = get_config(db, "drug_hunter_path") or ""
        python_bin = get_config(db, "python_bin") or ""

        # CSV de moléculas (resultado do ADMET, com molecule_chembl_id e canonical_smiles)
        admet_csv = (
            Path(admet_result.base_output_path)
            / "ChEMBL"
            / item.folder_name
            / "ADMET"
            / f"{item.folder_name}.csv"
        )
        if not admet_csv.exists():
            raise RuntimeError("Arquivo de resultado ADMET não encontrado. Execute a análise ADMET antes de fazer o clustering.")

        # O DrugHunter sempre escreve em base_output_path/target (caminho fixo).
        # Após o worker concluir, movemos para um diretório com job.id para
        # evitar que reruns com parâmetros diferentes sobrescrevam resultados
        # de jobs anteriores.
        dh_result_dir = Path(dh_dir) / job.base_output_path.lstrip("/") / job.target
        job_result_dir = Path(dh_dir) / job.base_output_path.lstrip("/") / f"{job.target}_job_{job.id}"

        # Remove destino de rerun (mesmo job rodando novamente)
        if job_result_dir.exists():
            shutil.rmtree(job_result_dir)
        # Remove output temporário anterior do DH (pode ter ficado de run anterior)
        if dh_result_dir.exists():
            shutil.rmtree(dh_result_dir)
            logger.info("Limpou output temporário anterior do DH: %s", dh_result_dir)

        n_clusters, silhouette = run_clustering_worker(
            python_bin=python_bin,
            dh_dir=dh_dir,
            admet_csv_path=str(admet_csv),
            target=job.target,
            base_input_path=job.base_input_path,
            base_output_path=job.base_output_path,
            fingerprint_type=job.fingerprint_type,
            max_mols=job.max_mols,
        )

        # Move o output do DH para o diretório isolado do job
        if dh_result_dir.exists():
            shutil.move(str(dh_result_dir), str(job_result_dir))
            logger.info("Moveu resultado de clustering: %s → %s", dh_result_dir, job_result_dir)
            result_dir = job_result_dir
        else:
            result_dir = dh_result_dir  # fallback (não deveria ocorrer)

        # O DrugHunter falha silenciosamente quando n_samples < n_clusters tentado.
        # Detectamos isso pelo resultado nulo e marcamos como erro com mensagem clara.
        if n_clusters is None:
            mol_count = job.max_mols or "todas as"
            raise RuntimeError(
                f"O clustering não produziu resultados. "
                f"O DrugHunter tentou mais clusters do que o número de moléculas disponíveis ({mol_count}). "
                f"Aumente o limite de moléculas (mínimo recomendado: 20) ou remova o filtro."
            )

        # Caminho do CSV de resultado
        result_csv = result_dir / "data" / f"{job.fingerprint_type}_{job.target}.csv"

        svc.marcar_concluido(
            db=db,
            job_id=job_id,
            n_clusters=n_clusters,
            silhouette_score=silhouette,
            result_dir=str(result_dir) if result_dir.exists() else None,
            result_csv_path=str(result_csv) if result_csv.exists() else None,
        )
        logger.info("Clustering concluído: job_id=%s | clusters=%s | silhouette=%s", job_id, n_clusters, silhouette)

    except Exception as e:
        logger.exception("Erro no pipeline de clustering job_id=%s: %s", job_id, e)
        try:
            svc.marcar_erro(db, job_id, str(e))
        except Exception:
            pass
    finally:
        db.close()


def uc_iniciar_clustering(
    db: Session,
    usuario: User,
    admet_result_id: int,
    fingerprint_type: str,
    base_output_path: str,
    max_mols: Optional[int] = None,
) -> ClusteringJob:
    admet_result = db.query(AdmetResult).filter(AdmetResult.id == admet_result_id).first()
    if admet_result is None:
        raise ValueError(f"AdmetResult {admet_result_id} não encontrado.")
    if admet_result.user_id != usuario.id:
        raise PermissionError("Este resultado ADMET não pertence ao usuário.")
    if admet_result.status != "done":
        raise ValueError("O resultado ADMET ainda não concluiu. Aguarde antes de rodar o clustering.")

    if max_mols is not None and max_mols < 20:
        raise ValueError(
            f"O limite de moléculas ({max_mols}) é muito pequeno. "
            "O DrugHunter precisa de pelo menos 20 moléculas para calcular o número ideal de clusters."
        )

    item = db.query(ChemblJobItem).filter(ChemblJobItem.id == admet_result.chembl_job_item_id).first()
    if item is None:
        raise ValueError("ChemblJobItem associado não encontrado.")

    job = svc.criar_ou_substituir(
        db=db,
        user_id=usuario.id,
        admet_result_id=admet_result_id,
        target=item.folder_name,
        fingerprint_type=fingerprint_type,
        base_input_path=_BASE_INPUT_PATH,
        base_output_path=base_output_path,
        max_mols=max_mols,
    )

    # Cascade: NeuroDock vinculado a este clustering deve ser apagado antes do rerun,
    # pois foi treinado com os resultados anteriores e seria inválido após nova execução.
    _cascade_delete_neurodock(db, job.id)

    import threading

    def _pipeline_wrapper(job_id: int) -> None:
        _running_jobs.add(job_id)
        try:
            _executar_pipeline(job_id)
        finally:
            _running_jobs.discard(job_id)

    t = threading.Thread(target=_pipeline_wrapper, args=(job.id,), daemon=True)
    t.start()

    return job


def _recover_orphaned_job(db: Session, job: ClusteringJob) -> None:
    if job.status == "running" and job.id not in _running_jobs:
        logger.warning("ClusteringJob %s está 'running' sem thread ativa — marcando como erro.", job.id)
        svc.marcar_erro(db, job.id, "Job interrompido: o servidor foi reiniciado durante a execução.")


def uc_get_job(db: Session, job_id: int, usuario: User) -> Optional[ClusteringJob]:
    job = svc.buscar_por_id(db, job_id, usuario.id)
    if job is not None:
        _recover_orphaned_job(db, job)
        db.refresh(job)
    return job


def uc_get_job_by_admet(
    db: Session, admet_result_id: int, usuario: User
) -> Optional[ClusteringJob]:
    job = svc.buscar_por_admet(db, admet_result_id, usuario.id)
    if job is not None:
        _recover_orphaned_job(db, job)
        db.refresh(job)
    return job
