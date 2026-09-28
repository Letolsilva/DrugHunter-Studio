"""
usecases/consensus.py — Orquestração do Docking de Consenso.

Combina as moléculas selecionadas do ADMET, executa o DrugHunter e persiste o resultado.
Não conhece HTTP nem FastAPI.
"""
import json
import logging
import shutil
from pathlib import Path
from typing import List, Optional

import pandas as pd
from sqlalchemy.orm import Session

from app.domain.models import User
from app.domain.models.admet_result import AdmetResult
from app.domain.models.chembl_job import ChemblJobItem
from app.domain.models.consensus_job import ConsensusJob
from app.domain.models.redocking_job import RedockingJob
from app.infra.db.database import SessionLocal, get_config
from app.infra.external.consensus_runner import run_consensus_worker
from app.services import consensus as svc

logger = logging.getLogger("pdb_explorer")

# Jobs de consenso ativos neste processo. Se o servidor reiniciar, o set fica vazio
# e qualquer job ainda "running" no banco é detectado como órfão.
_running_jobs: set[int] = set()

# Mapeamento de categoria → sufixo de arquivo ADMET
_CATEGORY_FILES = {
    "bbb_plus": "_BBBplus.csv",
    "bbb_minus": "_BBBminus.csv",
    "hia_plus": "_HIAplus.csv",
    "toxic":    "_toxic.csv",
    "all": ".csv",
}


def _combinar_moleculas(
    admet_dir: Path,
    stem: str,
    categories: List[str],
    out_dir: Path,
    max_mols: Optional[int] = None,
) -> int:
    """Lê os CSVs ADMET selecionados, combina, deduplica e escreve molecules.csv.

    Quando max_mols é definido, seleciona as N melhores por peso molecular (MW)
    crescente — moléculas menores têm melhor leadabilidade (Lipinski).
    """
    frames = []

    def _read_admet(path: Path) -> Optional[pd.DataFrame]:
        if not path.exists():
            return None
        df = pd.read_csv(path)
        df.columns = [c.lower() for c in df.columns]
        required = {"canonical_smiles", "molecule_chembl_id"}
        if not required.issubset(df.columns):
            return None
        return df

    if "all" in categories:
        df = _read_admet(admet_dir / f"{stem}.csv")
        if df is not None:
            frames.append(df)
    else:
        for cat in categories:
            suffix = _CATEGORY_FILES.get(cat)
            if not suffix:
                continue
            df = _read_admet(admet_dir / f"{stem}{suffix}")
            if df is not None:
                frames.append(df)
            else:
                logger.warning("Arquivo ADMET não encontrado: %s", admet_dir / f"{stem}{suffix}")

    if not frames:
        raise RuntimeError("Nenhuma molécula encontrada para as categorias selecionadas.")

    combined = (
        pd.concat(frames, ignore_index=True)
        .drop_duplicates(subset=["molecule_chembl_id"])
        .dropna(subset=["canonical_smiles"])
        .reset_index(drop=True)
    )

    if combined.empty:
        raise RuntimeError("Conjunto de moléculas vazio após deduplicação.")

    total = len(combined)

    if max_mols is not None and max_mols > 0:
        # Ordena pelas N melhores por MW crescente (moléculas menores = melhores leads).
        # nsmallest pula NaN — separamos as com MW válido das sem MW e completamos se necessário.
        if "mw" in combined.columns:
            has_mw = combined[combined["mw"].notna()]
            no_mw  = combined[combined["mw"].isna()]
            top_mw = has_mw.nsmallest(max_mols, "mw")
            if len(top_mw) < max_mols:
                extra = no_mw.head(max_mols - len(top_mw))
                combined = pd.concat([top_mw, extra], ignore_index=True)
            else:
                combined = top_mw.reset_index(drop=True)
        else:
            combined = combined.head(max_mols)
        logger.info(
            "Top %d moléculas selecionadas por MW (de %d disponíveis)", len(combined), total
        )

    out_dir.mkdir(parents=True, exist_ok=True)
    combined[["canonical_smiles", "molecule_chembl_id"]].to_csv(
        str(out_dir / "molecules.csv"), index=False
    )
    logger.info("molecules.csv gravado: %d moléculas em %s", len(combined), out_dir)
    return len(combined)


def _executar_pipeline(job_id: int, max_mols: Optional[int] = None) -> None:
    db = SessionLocal()
    try:
        job = db.query(ConsensusJob).filter(ConsensusJob.id == job_id).first()
        if not job:
            logger.error("ConsensusJob %s não encontrado.", job_id)
            return

        admet_result = db.query(AdmetResult).filter(AdmetResult.id == job.admet_result_id).first()
        if not admet_result:
            raise RuntimeError(f"AdmetResult {job.admet_result_id} não encontrado.")

        item = db.query(ChemblJobItem).filter(ChemblJobItem.id == admet_result.chembl_job_item_id).first()
        if not item:
            raise RuntimeError(f"ChemblJobItem não encontrado para AdmetResult {admet_result.id}.")

        admet_dir = Path(admet_result.base_output_path) / "ChEMBL" / item.folder_name / "ADMET"
        categories = json.loads(job.selected_categories) if job.selected_categories else ["all"]

        # Pasta destino de molecules.csv: base_selected_mols/target/
        out_mol_dir = Path(job.base_selected_mols) / job.target
        mol_count = _combinar_moleculas(admet_dir, item.folder_name, categories, out_mol_dir, max_mols)
        svc.atualizar_mol_count(db, job_id, mol_count)

        dh_dir = get_config(db, "drug_hunter_path") or ""
        python_bin = get_config(db, "python_bin") or ""
        dock6_path = get_config(db, "dock6_path") or ""

        # Paths derivados do dh_dir (base de todos os caminhos relativos do DH)
        dh_base_path = Path(dh_dir)
        docking_out_rel = job.base_docking_output_path.lstrip("/")
        docking_target_dir = dh_base_path / docking_out_rel / job.target

        # Remove output de runs anteriores: perform_docking_vina retorna imediatamente se
        # a pasta Vina/ já existe, mesmo que esteja vazia (run anterior falhou).
        for stale_dir in ["Vina", "Dock6"]:
            stale_path = docking_target_dir / stale_dir
            if stale_path.exists():
                shutil.rmtree(stale_path)
                logger.info("Limpou diretório anterior: %s", stale_path)

        # Remove a pasta Molecules/ compartilhada: o DH pula a preparação de ligantes se ela
        # não estiver vazia, e acaba docando resíduos de runs anteriores em vez das moléculas
        # selecionadas. Limpar garante que só as moléculas do molecules.csv atual serão usadas.
        molecules_dir = dh_base_path / docking_out_rel / "Molecules"
        if molecules_dir.exists():
            shutil.rmtree(molecules_dir)
            logger.info("Limpou Molecules/ anterior: %s", molecules_dir)

        # DH constrói caminhos como Path.cwd() + path (cwd = dh_dir).
        # Portanto base_selected_mols deve ser relativo ao dh_dir (ex: /resultados/chembl/...)
        # e não um caminho absoluto do filesystem.
        try:
            selected_mols_rel = "/" + str(out_mol_dir.relative_to(dh_base_path))
        except ValueError:
            # out_mol_dir fora do dh_dir: passa o caminho absoluto e espera que o DH saiba lidar
            selected_mols_rel = str(out_mol_dir)

        run_consensus_worker(
            python_bin=python_bin,
            dh_dir=dh_dir,
            base_input_path=job.base_input_path,
            target=job.target,
            base_docking_output_path=job.base_docking_output_path,
            base_selected_mols=selected_mols_rel,
            dock6_app_path=dock6_path,
            pdb_code=(job.pdb_id, job.ligand_resname, job.ligand_resnum, job.chain),
            charge_type=job.charge_type,
            prepare_complex=job.prepare_complex,
        )

        # Lê CSV de resultado gerado pelo DrugHunter
        result_csv = docking_target_dir / f"{job.target}.csv"
        correlation_img = docking_target_dir / "correlation.png"

        result_count = 0
        if result_csv.exists():
            df = pd.read_csv(result_csv)
            result_count = len(df)
            logger.info("Consenso: resultado lido com %d linhas.", result_count)
        else:
            logger.warning("CSV de consenso não encontrado em %s", result_csv)

        # Atualiza mol_count para refletir os resultados reais (pode ser < mol_count se alguma
        # molécula falhou no Vina ou no Dock6 e não gerou _scored.mol2)
        if result_count and result_count != mol_count:
            svc.atualizar_mol_count(db, job_id, result_count)
            mol_count = result_count

        svc.marcar_concluido(
            db=db,
            job_id=job_id,
            result_csv_path=str(result_csv) if result_csv.exists() else None,
            correlation_img_path=str(correlation_img) if correlation_img.exists() else None,
        )
        logger.info("Consenso concluído: job_id=%s | mols=%s", job_id, mol_count)

    except Exception as e:
        logger.exception("Erro no pipeline de consenso job_id=%s: %s", job_id, e)
        try:
            svc.marcar_erro(db, job_id, str(e))
        except Exception:
            pass
    finally:
        db.close()


def uc_iniciar_consensus(
    db: Session,
    usuario: User,
    admet_result_id: int,
    selected_categories: List[str],
    pdb_id: str,
    ligand_resname: str,
    ligand_resnum: int,
    chain: str,
    base_input_path: str,
    base_docking_output_path: str,
    charge_type: str,
    prepare_complex: bool,
    max_mols: Optional[int] = None,
) -> ConsensusJob:
    admet_result = db.query(AdmetResult).filter(AdmetResult.id == admet_result_id).first()
    if admet_result is None:
        raise ValueError(f"AdmetResult {admet_result_id} não encontrado.")
    if admet_result.user_id != usuario.id:
        raise PermissionError("Este resultado ADMET não pertence ao usuário.")
    if admet_result.status != "done":
        raise ValueError("O resultado ADMET ainda não concluiu. Aguarde antes de rodar o consenso.")

    item = db.query(ChemblJobItem).filter(ChemblJobItem.id == admet_result.chembl_job_item_id).first()
    if item is None:
        raise ValueError("ChemblJobItem associado não encontrado.")

    target = item.folder_name
    base_selected_mols = str(Path(admet_result.base_output_path) / "ChEMBL")

    job = svc.criar_ou_substituir(
        db=db,
        user_id=usuario.id,
        admet_result_id=admet_result_id,
        target=target,
        pdb_id=pdb_id,
        ligand_resname=ligand_resname,
        ligand_resnum=ligand_resnum,
        chain=chain,
        base_input_path=base_input_path,
        base_docking_output_path=base_docking_output_path,
        base_selected_mols=base_selected_mols,
        charge_type=charge_type,
        prepare_complex=prepare_complex,
        selected_categories=json.dumps(selected_categories),
    )

    if max_mols is not None and max_mols > 0:
        logger.info("Consenso job %s: limite de teste = %d moléculas", job.id, max_mols)

    import threading

    def _pipeline_wrapper(job_id: int, _max_mols: Optional[int]) -> None:
        _running_jobs.add(job_id)
        try:
            _executar_pipeline(job_id, _max_mols)
        finally:
            _running_jobs.discard(job_id)

    t = threading.Thread(target=_pipeline_wrapper, args=(job.id, max_mols), daemon=True)
    t.start()

    return job


def _recover_orphaned_job(db: Session, job: ConsensusJob) -> None:
    """Se o job está 'running' mas o processo não existe mais, marca como erro."""
    if job.status == "running" and job.id not in _running_jobs:
        logger.warning("ConsensusJob %s está 'running' mas sem thread ativa — marcando como erro (servidor reiniciado?).", job.id)
        svc.marcar_erro(db, job.id, "Job interrompido: o servidor foi reiniciado durante a execução.")


def uc_get_job(db: Session, job_id: int, usuario: User) -> Optional[ConsensusJob]:
    job = svc.buscar_por_id(db, job_id, usuario.id)
    if job is not None:
        _recover_orphaned_job(db, job)
        db.refresh(job)
    return job


def uc_get_job_by_admet(
    db: Session, admet_result_id: int, usuario: User
) -> Optional[ConsensusJob]:
    job = svc.buscar_por_admet(db, admet_result_id, usuario.id)
    if job is not None:
        _recover_orphaned_job(db, job)
        db.refresh(job)
    return job


def uc_listar_redocking_jobs(db: Session, usuario: User) -> list:
    """Retorna os jobs de redocking do usuário — usados para pré-preencher o formulário."""
    return (
        db.query(RedockingJob)
        .filter(RedockingJob.user_id == usuario.id)
        .order_by(RedockingJob.iniciado_em.desc())
        .all()
    )
