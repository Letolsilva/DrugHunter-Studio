"""
usecases/chembl.py — Orquestração dos casos de uso ChEMBL.

Coordena o criação de jobs no banco, execução via runner e listagem do histórico.
Não conhece HTTP nem FastAPI — expõe generators e funções simples.
"""

import asyncio
import json
import logging
import shutil
from pathlib import Path
from typing import Optional

from sqlalchemy.orm import Session

from app.domain.models import User
from app.domain.models.chembl_job import ChemblJob
from app.domain.schemas.chembl import ChemblRunRequest, ChemblAnalysisRequest
from app.infra.db.database import get_config, SessionLocal
from app.infra.external.chembl_runner import run_chembl_group
from app.services import chembl as svc

logger = logging.getLogger("pdb_explorer")


def _resolve_path(dh_dir: str, stored_path: str) -> Path:
    """Resolve stored_path relativo ao dh_dir, com fallback para caminhos absolutos legados.

    Registros novos armazenam apenas o sufixo relativo (ex: /resultados/chembl).
    Registros antigos têm o caminho absoluto completo — se ainda existir, usa diretamente.
    """
    p = Path(stored_path)
    if p.is_absolute() and p.exists():
        return p
    return Path(dh_dir) / stored_path.lstrip("/")


def _infer_step(base_output_path: str, folder_name: str, dh_dir: str = "") -> str:
    """Infere a etapa atual de um item 'running' a partir do filesystem."""
    from pathlib import Path
    base = _resolve_path(dh_dir, base_output_path) / "ChEMBL" / folder_name
    def has_csv(d: Path) -> bool:
        return d.is_dir() and any(d.glob("*.csv"))
    if has_csv(base / "similares"):
        return "similares"
    if has_csv(base / "moleculas"):
        return "moleculas"
    if has_csv(base / "bioatividades"):
        return "moleculas"
    if has_csv(base / "targets"):
        return "bioatividades"
    return "targets"


def _count_bioact_molecules(base_output_path: str, folder_name: str, dh_dir: str = "") -> int:
    """Conta moléculas únicas nos CSVs de bioatividades de um item."""
    from pathlib import Path
    try:
        import pandas as pd
        bioact = _resolve_path(dh_dir, base_output_path) / "ChEMBL" / folder_name / "bioatividades"
        dfs = [pd.read_csv(f) for f in bioact.glob("*.csv") if f.stat().st_size > 0]
        if not dfs:
            return 0
        merged = pd.concat(dfs, ignore_index=True)
        return int(merged["molecule_chembl_id"].nunique()) if "molecule_chembl_id" in merged.columns else len(merged)
    except Exception:
        return 0


def _recover_orphaned_job(db: Session, job) -> bool:
    """
    Se o background task morreu (reload do uvicorn), recupera o status pelo filesystem.
    Retorna True se o job foi atualizado.
    """
    from pathlib import Path

    dh_dir = get_config(db, "drug_hunter_path") or ""
    changed = False
    for item in job.items:
        if item.status != "running":
            continue
        similares = _resolve_path(dh_dir, job.base_output_path) / "ChEMBL" / item.folder_name / "similares"
        if similares.is_dir() and any(similares.glob("*.csv")):
            mol_count = _count_bioact_molecules(job.base_output_path, item.folder_name, dh_dir)
            svc.atualizar_status_item(db, item.id, "done", molecules_count=mol_count)
            item.status = "done"
            item.molecules_count = mol_count
            changed = True
        else:
            # Item preso em "running" sem arquivos — servidor foi reiniciado durante a execução.
            svc.atualizar_status_item(
                db, item.id, "error",
                error_msg="Job interrompido: o servidor foi reiniciado durante a execução.",
            )
            item.status = "error"
            changed = True

    if changed and job.status == "running":
        all_statuses = [it.status for it in job.items]
        if all(s != "running" for s in all_statuses):
            final = "done" if any(s == "done" for s in all_statuses) else "error"
            svc.marcar_job_finalizado(db, job.id, final)
            job.status = final

    return changed


def uc_listar_jobs(db: Session, user_id: int) -> list:
    return svc.listar_jobs_usuario(db, user_id)


def uc_deletar_job(db: Session, job_id: int, user_id: int) -> bool:
    """Remove o job e toda a cascata downstream (ADMET → Consenso → Clustering → NeuroDock) + arquivos."""
    from app.domain.models.admet_result import AdmetResult
    from app.domain.models.consensus_job import ConsensusJob
    from app.domain.models.clustering_job import ClusteringJob
    from app.domain.models.neurodock_model import NeuroDockModel
    from app.domain.models.neurodock_prediction import NeuroDockPrediction

    job = db.query(ChemblJob).filter(ChemblJob.id == job_id, ChemblJob.user_id == user_id).first()
    if not job:
        return False

    dh_dir = get_config(db, "drug_hunter_path") or ""

    for item in job.items:
        admet = db.query(AdmetResult).filter(AdmetResult.chembl_job_item_id == item.id).first()
        if admet is None:
            continue

        # ── Consenso downstream ──────────────────────────────────────────────
        consensus = db.query(ConsensusJob).filter(ConsensusJob.admet_result_id == admet.id).first()
        if consensus:
            if consensus.base_docking_output_path and consensus.target and dh_dir:
                dock_dir = _resolve_path(dh_dir, consensus.base_docking_output_path) / consensus.target
                if dock_dir.exists():
                    shutil.rmtree(dock_dir, ignore_errors=True)
            db.delete(consensus)

        # ── Clustering + NeuroDock downstream ───────────────────────────────
        clustering = db.query(ClusteringJob).filter(ClusteringJob.admet_result_id == admet.id).first()
        if clustering:
            neurodock = db.query(NeuroDockModel).filter(NeuroDockModel.clustering_job_id == clustering.id).first()
            if neurodock:
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
            if clustering.result_dir:
                p = Path(clustering.result_dir)
                if p.exists():
                    shutil.rmtree(p, ignore_errors=True)
            db.delete(clustering)

        # ── Diretório ADMET (análise gerada pelo DrugHunter) ─────────────────
        if admet.base_output_path and item.folder_name and dh_dir:
            admet_dir = _resolve_path(dh_dir, admet.base_output_path) / "ChEMBL" / item.folder_name / "ADMET"
            if admet_dir.exists():
                shutil.rmtree(admet_dir, ignore_errors=True)

        db.delete(admet)

    db.delete(job)  # SQLAlchemy cascata → ChemblJobItems
    db.commit()
    logger.info("ChemblJob %s removido com cascata downstream completa.", job_id)
    return True


def uc_get_job(db: Session, job_id: int, user_id: int):
    return svc.get_job_by_id(db, job_id, user_id)


def uc_listar_moleculas(
    db: Session,
    job_id: int,
    user_id: int,
    page: int = 1,
    per_page: int = 50,
) -> Optional[dict]:
    """
    Lê os CSVs de bioatividades do job e retorna moléculas paginadas.
    Retorna None se o job não existir ou não pertencer ao usuário.
    """
    import math
    from pathlib import Path

    try:
        import pandas as pd
    except ImportError:
        return {"molecules": [], "total": 0, "page": page, "per_page": per_page}

    job = svc.get_job_by_id(db, job_id, user_id)
    if not job:
        return None

    dh_dir = get_config(db, "drug_hunter_path") or ""
    chembl_base = _resolve_path(dh_dir, job.base_output_path) / "ChEMBL"
    all_dfs = []

    for item in job.items:
        bioact_dir = chembl_base / item.folder_name / "bioatividades"
        if not bioact_dir.is_dir():
            continue
        for csv_file in bioact_dir.glob("*.csv"):
            try:
                df = pd.read_csv(csv_file)
                all_dfs.append(df)
            except Exception:
                pass

    if not all_dfs:
        return {"molecules": [], "total": 0, "page": page, "per_page": per_page}

    merged = pd.concat(all_dfs, ignore_index=True)
    total = len(merged)

    start = (page - 1) * per_page
    page_df = merged.iloc[start : start + per_page]

    COLS = [
        "molecule_chembl_id", "canonical_smiles", "molecule_pref_name",
        "pchembl_value", "value", "type", "units",
        "target_organism", "target_pref_name",
    ]
    molecules = []
    for _, row in page_df.iterrows():
        mol = {}
        for col in COLS:
            if col in row.index:
                v = row[col]
                mol[col] = None if (isinstance(v, float) and math.isnan(v)) else v
            else:
                mol[col] = None
        molecules.append(mol)

    return {"molecules": molecules, "total": total, "page": page, "per_page": per_page}


def uc_analise_status(db: Session, job_id: int, user_id: int) -> Optional[dict]:
    """Verifica se a análise molecular foi executada para o job."""
    import re
    import time

    job = svc.get_job_by_id(db, job_id, user_id)
    if not job:
        return None

    dh_dir = get_config(db, "drug_hunter_path") or ""
    analysis_dir = _resolve_path(dh_dir, job.base_output_path) / "ChEMBL" / "analysis"
    similarity_dir = analysis_dir / "Similarity"
    maxcomp_dir = analysis_dir / "data" / "maxcomp"

    # Identifica quais itens do job têm arquivos de análise iniciados (root MOLS/SIMS)
    # e, desses, quais ainda não têm maxcomp concluído (potencialmente em andamento).
    _STALE_SECONDS = 15 * 60  # > 15 min sem maxcomp → análise parou, não está rodando
    now = time.time()

    items_with_analysis: list[str] = []  # itens que têm arquivos _MOLS/_SIMS no root
    incomplete_mtimes: list[float] = []  # mtimes dos itens sem maxcomp correspondente
    # Alvos que têm Similarity mas não têm maxcomp após o tempo de espera (falha silenciosa do DH)
    dh_failed_targets: list[str] = []

    for item in job.items:
        folder = item.folder_name
        mols_f = analysis_dir / f"{folder}_MOLS.csv"
        sims_f = analysis_dir / f"{folder}_SIMS.csv"

        if not (mols_f.exists() or sims_f.exists()):
            continue  # item ainda não tem arquivos de análise

        items_with_analysis.append(folder)

        item_mtime = max(f.stat().st_mtime for f in [mols_f, sims_f] if f.exists())
        item_maxcomp = list(maxcomp_dir.glob(f"*{folder}*.csv")) if maxcomp_dir.is_dir() else []

        # Maxcomp está desatualizado se não existe ou é mais antigo que o root file
        maxcomp_current = (
            bool(item_maxcomp)
            and max(f.stat().st_mtime for f in item_maxcomp) >= item_mtime
        )
        if not maxcomp_current:
            incomplete_mtimes.append(item_mtime)

        # Falha silenciosa do DrugHunter: Similarity existe mas nenhum maxcomp foi gerado.
        # Checa apenas existência — mtime não é confiável porque o worker regenera
        # os arquivos raiz (_MOLS/_SIMS) de todos os alvos em cada run.
        has_similarity = similarity_dir.is_dir() and bool(
            list(similarity_dir.glob(f"*{folder}*.csv"))
        )
        has_maxcomp = maxcomp_dir.is_dir() and bool(
            list(maxcomp_dir.glob(f"*{folder}*.csv"))
        )
        if has_similarity and not has_maxcomp:
            dh_failed_targets.append(folder)

    # Lê erro da análise, se houver (gravado pelo analysis_runner em caso de falha)
    error_file = analysis_dir / "analysis_error.json"
    analysis_error: str | None = None
    if error_file.exists():
        try:
            analysis_error = json.loads(error_file.read_text()).get("error")
        except Exception:
            pass

    if not items_with_analysis:
        return {
            "has_analysis": False,
            "analysis_running": False,
            "centroids_count": 0,
            "similarity_files": [],
            "mcc_ids": [],
            "mcc_sims_ids": [],
            "mcc_mols_ids": [],
            "dh_failed_targets": [],
            "analysis_error": analysis_error,
        }

    # analysis_running apenas quando arquivos foram atualizados recentemente
    analysis_running = bool(incomplete_mtimes) and any(
        now - mt < _STALE_SECONDS for mt in incomplete_mtimes
    )

    # Mostra qualquer dado disponível: Similarity files existindo basta para has_analysis.
    # maxcomp pode ser de uma run anterior — continua válido para colorir a rede.
    similarity_files = [f.name for f in similarity_dir.glob("*.csv")] if similarity_dir.is_dir() else []
    has_analysis = bool(similarity_files)

    if not has_analysis:
        return {
            "has_analysis": False,
            "analysis_running": analysis_running,
            "centroids_count": 0,
            "similarity_files": [],
            "mcc_ids": [],
            "mcc_sims_ids": [],
            "mcc_mols_ids": [],
            "dh_failed_targets": dh_failed_targets,
            "analysis_error": analysis_error,
        }

    # Lê maxcomp disponível (mesmo de runs anteriores) para coloração MCC
    all_maxcomp = list(maxcomp_dir.glob("*.csv")) if maxcomp_dir.is_dir() else []

    mcc_sims: set[str] = set()
    mcc_mols: set[str] = set()
    try:
        import pandas as pd
        for f in all_maxcomp:
            stem = f.stem  # ex: Tanimoto_morgan_CHEMBL203_SIMS
            match = re.search(r"_(SIMS|MOLS)$", stem)
            analysis_type = match.group(1) if match else None
            df = pd.read_csv(f)
            unique = {str(v) for v in pd.unique(df[["source", "target"]].values.ravel())}
            if analysis_type == "SIMS":
                mcc_sims.update(unique)
            elif analysis_type == "MOLS":
                mcc_mols.update(unique)
            else:
                mcc_sims.update(unique)
    except Exception:
        pass

    mcc_ids = list(mcc_sims | mcc_mols)

    return {
        "has_analysis": True,
        "analysis_running": analysis_running,
        "centroids_count": len(mcc_ids),
        "similarity_files": similarity_files,
        "mcc_ids": mcc_ids,
        "mcc_sims_ids": list(mcc_sims),
        "mcc_mols_ids": list(mcc_mols),
        "dh_failed_targets": dh_failed_targets,
        "analysis_error": analysis_error,
    }


async def _run_job_background(
    job_id: int,
    items_data: list[dict],
    base_output_path: str,
    drug_hunter_dir: str,
    python_bin: str,
) -> None:
    """Drena o runner em background, atualizando o banco a cada item."""
    def _on_start(item_id: int):
        with SessionLocal() as s:
            svc.atualizar_status_item(s, item_id, "running")

    def _on_done(item_id: int, molecules_count: int):
        with SessionLocal() as s:
            svc.atualizar_status_item(s, item_id, "done", molecules_count=molecules_count)

    def _on_error(item_id: int, error_msg: str):
        with SessionLocal() as s:
            svc.atualizar_status_item(s, item_id, "error", error_msg=error_msg)

    try:
        async for _ in run_chembl_group(
            job_id=job_id,
            items_data=items_data,
            base_output_path=base_output_path,
            drug_hunter_dir=drug_hunter_dir,
            python_bin=python_bin,
            on_item_start=_on_start,
            on_item_done=_on_done,
            on_item_error=_on_error,
        ):
            pass
        with SessionLocal() as s:
            final_job = s.query(ChemblJob).filter(ChemblJob.id == job_id).first()
            if final_job:
                all_statuses = [it.status for it in final_job.items]
                final_status = "done" if any(st == "done" for st in all_statuses) else "error"
                svc.marcar_job_finalizado(s, job_id, final_status)
    except Exception as exc:
        logger.exception("Erro fatal no grupo ChEMBL job=%s: %s", job_id, exc)
        with SessionLocal() as s:
            svc.marcar_job_finalizado(s, job_id, "error", str(exc))


async def uc_iniciar_grupo(
    db: Session,
    request: ChemblRunRequest,
    usuario: User,
) -> ChemblJob:
    """
    Cria o job + itens no banco e dispara a execução em background.
    Retorna o job imediatamente — o cliente faz polling pelo status.
    """
    drug_hunter_dir = get_config(db, "drug_hunter_path") or ""
    python_bin = get_config(db, "python_bin") or ""

    job = svc.criar_job(db, usuario.id, request.base_output_path)

    item_ids: list[int] = []
    for it in request.items:
        db_item = svc.criar_item(
            db=db,
            job_id=job.id,
            target_name=it.target_name,
            folder_name=it.folder_name,
            target_filters=json.dumps(it.target_filters.model_dump()),
            bioact_filters=json.dumps(it.bioact_filters.model_dump()),
            mol_filters=json.dumps(it.mol_filters.model_dump()),
            sim_filters=json.dumps(it.sim_filters.model_dump()),
        )
        item_ids.append(db_item.id)

    svc.atualizar_status_job(db, job.id, "running")

    items_data = [
        {
            "item_id": item_ids[i],
            "target_name": it.target_name,
            "folder_name": it.folder_name,
            "chembl_search_id": it.chembl_search_id or None,
            "target_filters": it.target_filters.model_dump(),
            "bioact_filters": it.bioact_filters.model_dump(),
            "mol_filters": it.mol_filters.model_dump(),
            "sim_filters": it.sim_filters.model_dump(),
        }
        for i, it in enumerate(request.items)
    ]

    asyncio.create_task(_run_job_background(
        job_id=job.id,
        items_data=items_data,
        base_output_path=request.base_output_path,
        drug_hunter_dir=drug_hunter_dir,
        python_bin=python_bin,
    ))

    return job

    return _stream()


def uc_get_networks(db: Session, job_id: int, user_id: int) -> Optional[dict]:
    """
    Retorna metadados das redes de similaridade geradas pela análise.
    Para cada arquivo em Similarity/, extrai scaffold, contagem do MCC e bins de similaridade.
    """
    import re
    from pathlib import Path

    try:
        import pandas as pd
        import numpy as np
    except ImportError:
        return {"networks": []}

    job = svc.get_job_by_id(db, job_id, user_id)
    if not job:
        return None

    dh_dir = get_config(db, "drug_hunter_path") or ""
    analysis_dir = _resolve_path(dh_dir, job.base_output_path) / "ChEMBL" / "analysis"
    similarity_dir = analysis_dir / "Similarity"
    maxcomp_dir = analysis_dir / "data" / "maxcomp"
    plots_dir = analysis_dir / "plots"
    centroids_file = analysis_dir / "centroids" / "smiles.csv"

    if not similarity_dir.is_dir():
        return {"networks": []}

    # Mapa folder_name → target_name do job
    folder_to_name = {it.folder_name: it.target_name for it in job.items}

    # Lê scaffold SMILES do centroids/smiles.csv
    scaffold_map: dict[str, str] = {}
    if centroids_file.exists():
        try:
            df_centroids = pd.read_csv(centroids_file)
            for _, row in df_centroids.iterrows():
                scaffold_map[str(row["id"])] = str(row["smiles"])
        except Exception:
            pass

    networks = []
    for csv_path in sorted(similarity_dir.glob("*.csv")):
        stem = csv_path.stem  # e.g. "Tanimoto_morgan_CHEMBL203_SIMS"

        # Extrai folder_name e tipo (SIMS/MOLS) removendo o prefixo métrica_fp_
        # Prefixo termina antes do folder_name: tudo até o 3º underscore-token é prefixo
        # Padrão: {Metric}_{fp}_{folder_name}_{TYPE}
        match = re.match(r"^([^_]+)_([^_]+)_(.+)_(SIMS|MOLS)$", stem)
        if not match:
            continue
        metric_name = match.group(1)
        fingerprint_name = match.group(2)
        folder_name = match.group(3)
        analysis_type = match.group(4)
        item_name = folder_to_name.get(folder_name, folder_name)

        # Total de nós (moléculas no dataset do tipo)
        total_nodes = 0
        mol_csv = analysis_dir / f"{folder_name}_{analysis_type}.csv"
        if mol_csv.exists():
            try:
                total_nodes = len(pd.read_csv(mol_csv))
            except Exception:
                pass

        # MCC: nós únicos no maxcomp
        mcc_count = 0
        maxcomp_csv = maxcomp_dir / f"{stem}.csv"
        if maxcomp_csv.exists():
            try:
                df_mc = pd.read_csv(maxcomp_csv)
                mcc_count = int(pd.unique(df_mc[["source", "target"]].values.ravel()).shape[0])
            except Exception:
                pass

        # Bins de similaridade (apenas coluna value)
        sim_bins = []
        try:
            df_sim = pd.read_csv(csv_path, usecols=["value"])
            bins = [0.5, 0.6, 0.7, 0.8, 0.9, 1.001]
            labels = ["0.5–0.6", "0.6–0.7", "0.7–0.8", "0.8–0.9", "0.9–1.0"]
            counts = pd.cut(df_sim["value"], bins=bins, labels=labels, right=False).value_counts().reindex(labels, fill_value=0)
            sim_bins = [{"range": lbl, "count": int(cnt)} for lbl, cnt in counts.items() if cnt > 0]
        except Exception:
            pass

        has_plot = (plots_dir / f"{stem}.png").exists()

        networks.append({
            "filename": stem,
            "item_folder": folder_name,
            "item_name": item_name,
            "analysis_type": analysis_type,
            "metric": metric_name,
            "fingerprint": fingerprint_name,
            "scaffold_smiles": scaffold_map.get(stem),
            "mcc_count": mcc_count,
            "total_nodes": total_nodes,
            "has_plot": has_plot,
            "sim_bins": sim_bins,
        })

    return {"networks": networks}


def uc_get_plot(db: Session, job_id: int, user_id: int, filename: str) -> Optional[Path]:
    """Retorna o caminho do PNG de plot para um filename de análise, se existir."""
    import re
    from pathlib import Path

    job = svc.get_job_by_id(db, job_id, user_id)
    if not job:
        return None

    if not re.match(r"^[A-Za-z0-9_\-]+$", filename):
        return None

    dh_dir = get_config(db, "drug_hunter_path") or ""
    plot_path = _resolve_path(dh_dir, job.base_output_path) / "ChEMBL" / "analysis" / "plots" / f"{filename}.png"
    return plot_path if plot_path.exists() else None


def uc_iniciar_analise(
    request: ChemblAnalysisRequest,
    usuario: User,
    db: Session,
) -> None:
    """Lança a análise molecular em background (chamada pelo BackgroundTask)."""
    from app.infra.external.analysis_runner import executar_analise_background

    drug_hunter_dir = get_config(db, "drug_hunter_path") or ""
    python_bin = get_config(db, "python_bin") or "python3"

    executar_analise_background(
        job_id=request.job_id,
        base_output_path=request.base_output_path,
        fingerprint=request.fingerprint,
        metric=request.metric,
        drug_hunter_dir=drug_hunter_dir,
        python_bin=python_bin,
    )
