"""
usecases/molecular_dynamics.py — Orquestração do módulo de Dinâmica Molecular.

Monta paths absolutos, dispara o worker em thread e persiste os resultados.
Não conhece HTTP nem FastAPI.
"""
import json
import logging
import shutil
import threading
from pathlib import Path
from typing import Optional

from sqlalchemy.orm import Session

from app.domain.models import User
from app.domain.models.consensus_job import ConsensusJob
from app.domain.models.md_job import MDJob
from app.domain.models.md_analysis_job import MdAnalysisJob
from app.domain.schemas.molecular_dynamics import IniciarMDRequest
from app.infra.db.database import SessionLocal, get_config
from app.infra.external.md_runner import run_md_worker
from app.infra.external.md_analyser_runner import run_md_analyser_worker
from app.services import molecular_dynamics as svc

logger = logging.getLogger("pdb_explorer")

_running_jobs: set[int] = set()
_running_analyses: set[int] = set()


# ── Execução em background ────────────────────────────────────────────────────

def _executar_md(job_id: int) -> None:
    db = SessionLocal()
    try:
        job = db.query(MDJob).filter(MDJob.id == job_id).first()
        if not job:
            logger.error("MDJob %s não encontrado.", job_id)
            return

        dh_dir     = get_config(db, "drug_hunter_path") or ""
        python_bin = get_config(db, "python_bin") or ""

        # Resolve o path absoluto do ligante
        if job.ligand_source == "consensus":
            consensus_job = db.query(ConsensusJob).filter(ConsensusJob.id == job.consensus_job_id).first()
            if not consensus_job:
                svc.marcar_erro(db, job_id, f"ConsensusJob {job.consensus_job_id} não encontrado.")
                return
            # Convenção DrugHunter: poses finais do dock6 anchor-and-grow ficam em Dock6/flex/
            ligand_path = (
                Path(dh_dir)
                / consensus_job.base_docking_output_path.lstrip("/")
                / consensus_job.target
                / "Dock6"
                / "flex"
                / job.ligand_filename
            )
            ligand_input_path = str(ligand_path)
        else:
            ligand_input_path = job.ligand_file_path

        # Resolve o path absoluto do receptor
        if job.receptor_source == "dh_prepared":
            # Convenção DH: datasets/PDB/{target}/Prepared/{filename}
            receptor_path = (
                Path(dh_dir)
                / "datasets"
                / "PDB"
                / job.target
                / "Prepared"
                / job.receptor_filename
            )
            receptor_input_path = str(receptor_path)
        else:
            # "upload" ou "manual": receptor_path já é absoluto
            receptor_input_path = str(Path(job.receptor_path) / job.receptor_filename) if job.receptor_filename else job.receptor_path

        output_path = str(Path(dh_dir) / job.base_output_path.lstrip("/"))
        params      = json.loads(job.params_json)

        svc.marcar_rodando(db, job_id)
        logger.info("MDJob %s iniciado: ligante=%s receptor=%s", job_id, ligand_input_path, receptor_input_path)

        run_md_worker(
            python_bin=python_bin,
            dh_dir=dh_dir,
            ligand_input_path=ligand_input_path,
            receptor_input_path=receptor_input_path,
            output_path=output_path,
            params=params,
        )

        svc.marcar_concluido(db, job_id)
        logger.info("MDJob %s concluído.", job_id)

    except Exception as e:
        logger.exception("Erro no MDJob %s: %s", job_id, e)
        try:
            svc.marcar_erro(db, job_id, str(e))
        except Exception:
            pass
    finally:
        db.close()


def _recover_orphaned(db: Session, job: MDJob) -> None:
    if job.status == "running" and job.id not in _running_jobs:
        logger.warning("MDJob %s está 'running' sem thread — marcando como erro.", job.id)
        svc.marcar_erro(db, job.id, "Job interrompido: o servidor foi reiniciado durante a execução.")


# ── Usecases públicos ─────────────────────────────────────────────────────────

def uc_iniciar_md(
    db: Session,
    usuario: User,
    req: IniciarMDRequest,
) -> MDJob:
    dh_dir = get_config(db, "drug_hunter_path") or ""

    # Valida e resolve informações do receptor
    target            = None
    receptor_path_db  = None
    receptor_filename = None

    if req.receptor_source == "dh_prepared":
        # "dh_prepared": receptor preparado em datasets/PDB/{target}/Prepared/ (convenção DrugHunter)
        # O target vem sempre do job de consenso (única fonte de ligante estruturado)
        if not req.consensus_job_id:
            raise ValueError("consensus_job_id é obrigatório quando receptor_source='dh_prepared'.")
        consensus_job_rec = db.query(ConsensusJob).filter(ConsensusJob.id == req.consensus_job_id).first()
        if not consensus_job_rec:
            raise ValueError(f"ConsensusJob {req.consensus_job_id} não encontrado.")
        if consensus_job_rec.user_id != usuario.id:
            raise PermissionError("Este job de consenso não pertence ao usuário.")
        if consensus_job_rec.status != "done":
            raise ValueError("O consenso ainda não concluiu.")
        target = consensus_job_rec.target

        receptor_path_db  = None   # resolvido no worker via convenção DH
        receptor_filename = req.receptor_filename  # usuário escolhe qual .pdb

        if not receptor_filename:
            # Tenta encontrar automaticamente o primeiro .noH.pdb
            prepared_dir = Path(dh_dir) / "datasets" / "PDB" / target / "Prepared"
            noH_files = sorted(prepared_dir.glob("*.noH.pdb")) if prepared_dir.exists() else []
            if noH_files:
                receptor_filename = noH_files[0].name
            else:
                raise ValueError(
                    f"Nenhum receptor .noH.pdb encontrado em datasets/PDB/{target}/Prepared/. "
                    "Informe receptor_filename manualmente."
                )

    elif req.receptor_source in ("upload", "manual"):
        receptor_path_db  = req.receptor_path
        receptor_filename = req.receptor_filename
        # target pode vir do req ou ser derivado do path
        target = req.receptor_path.rstrip("/").split("/")[-1] if req.receptor_path else "custom"

    base_output = f"/resultados/dinamica/{usuario.id}/{req.molecule_id.replace(' ', '_')}"

    job = svc.criar_job(
        db=db,
        user_id=usuario.id,
        molecule_id=req.molecule_id,
        smiles=req.smiles,
        ligand_source=req.ligand_source,
        consensus_job_id=req.consensus_job_id,
        ligand_filename=req.ligand_filename,
        ligand_file_path=req.ligand_file_path,
        receptor_source=req.receptor_source,
        target=target,
        receptor_path=receptor_path_db,
        receptor_filename=receptor_filename,
        params_json=req.params.model_dump_json(),
        base_output_path=f"{base_output}/{target}/",  # temporário, atualizado logo abaixo
    )

    # Inclui o job ID no path para garantir unicidade entre execuções repetidas
    unique_path = f"{base_output}_{job.id}/{target}/"
    svc.atualizar_output_path(db, job.id, unique_path)
    job.base_output_path = unique_path

    def _wrapper(job_id: int) -> None:
        _running_jobs.add(job_id)
        try:
            _executar_md(job_id)
        finally:
            _running_jobs.discard(job_id)

    t = threading.Thread(target=_wrapper, args=(job.id,), daemon=True)
    t.start()

    return job


def uc_get_job(db: Session, job_id: int, usuario: User) -> Optional[MDJob]:
    job = svc.buscar_job_por_id(db, job_id, usuario.id)
    if job is not None:
        _recover_orphaned(db, job)
        db.refresh(job)
    return job


def uc_listar_jobs(db: Session, usuario: User) -> list[MDJob]:
    jobs = svc.listar_jobs_por_usuario(db, usuario.id)
    for j in jobs:
        _recover_orphaned(db, j)
    return jobs


def uc_deletar_job(db: Session, job_id: int, usuario: User) -> bool:
    job = svc.buscar_job_por_id(db, job_id, usuario.id)
    if not job:
        return False

    dh_dir = get_config(db, "drug_hunter_path") or ""
    if job.base_output_path and dh_dir:
        abs_out = Path(dh_dir) / job.base_output_path.lstrip("/")
        if abs_out.exists():
            shutil.rmtree(abs_out, ignore_errors=True)

    # Remove arquivo de upload do ligante se existir
    if job.ligand_source == "upload" and job.ligand_file_path:
        p = Path(job.ligand_file_path)
        if p.exists():
            p.unlink(missing_ok=True)

    return svc.deletar_job(db, job_id, usuario.id)



def _executar_analise(analise_id: int) -> None:
    db = SessionLocal()
    try:
        analise = db.query(MdAnalysisJob).filter(MdAnalysisJob.id == analise_id).first()
        if not analise:
            logger.error("MdAnalysisJob %s não encontrado.", analise_id)
            return

        job = db.query(MDJob).filter(MDJob.id == analise.md_job_id).first()
        if not job:
            svc.marcar_analise_erro(db, analise_id, f"MDJob {analise.md_job_id} não encontrado.")
            return

        dh_dir     = get_config(db, "drug_hunter_path") or ""
        python_bin = get_config(db, "python_bin") or ""

        # base_output_path = "/resultados/dinamica/{user_id}/{molecule_id}/{target}/"
        # execute_md_analisys faz internamente: path = f'{base_output_path}/{target}/'
        # e depois abre os arquivos como path[1:] (relativo ao cwd=dh_dir).
        # Portanto, passamos o DH-relativo SEM o target final, mantendo a / inicial.
        parent_output  = str(Path(job.base_output_path.rstrip("/")).parent)

        params = json.loads(job.params_json) if job.params_json else {}
        integration_step_fs       = float(params.get("integration_step", 2.0))
        reporting_interval_steps_ = int(params.get("reporting_interval_steps", 1000))

        svc.marcar_analise_rodando(db, analise_id)
        logger.info("MdAnalysisJob %s iniciado: md_job=%s target=%s", analise_id, job.id, job.target)

        run_md_analyser_worker(
            python_bin=python_bin,
            dh_dir=dh_dir,
            parent_output_path=parent_output,
            target=job.target or "",
            integration_step=integration_step_fs,
            reporting_interval_steps=reporting_interval_steps_,
        )

        svc.marcar_analise_concluida(db, analise_id)
        logger.info("MdAnalysisJob %s concluído.", analise_id)

    except Exception as e:
        logger.exception("Erro no MdAnalysisJob %s: %s", analise_id, e)
        try:
            svc.marcar_analise_erro(db, analise_id, str(e))
        except Exception:
            pass
    finally:
        db.close()


def uc_iniciar_analise(db: Session, job_id: int, usuario: User) -> MdAnalysisJob:
    job = svc.buscar_job_por_id(db, job_id, usuario.id)
    if not job:
        raise ValueError(f"MDJob {job_id} não encontrado.")
    if job.status != "done":
        raise ValueError("O job de dinâmica molecular ainda não concluiu. Aguarde antes de analisar.")

    analise = svc.criar_analise_job(db=db, user_id=usuario.id, md_job_id=job.id)

    def _wrapper(analise_id: int) -> None:
        _running_analyses.add(analise_id)
        try:
            _executar_analise(analise_id)
        finally:
            _running_analyses.discard(analise_id)

    t = threading.Thread(target=_wrapper, args=(analise.id,), daemon=True)
    t.start()

    return analise


def uc_get_analise(db: Session, md_job_id: int, usuario: User) -> Optional[MdAnalysisJob]:
    return svc.buscar_analise_por_md_job(db, md_job_id, usuario.id)


def uc_listar_ligantes_consenso(db: Session, consensus_job_id: int, usuario: User) -> list[dict]:
    """Lista poses finais do dock6 anchor-and-grow (Dock6/flex/*_scored.mol2).

    O fluxo DrugHunter é: energy_min → footprint → flex (anchor-and-grow).
    O generate_consensus lê de flex/ para calcular os scores de consenso.
    """
    consensus_job = db.query(ConsensusJob).filter(ConsensusJob.id == consensus_job_id).first()
    if not consensus_job or consensus_job.user_id != usuario.id:
        return []

    dh_dir   = get_config(db, "drug_hunter_path") or ""
    flex_dir = (
        Path(dh_dir)
        / consensus_job.base_docking_output_path.lstrip("/")
        / consensus_job.target
        / "Dock6"
        / "flex"
    )
    if not flex_dir.exists():
        raise ValueError(
            f"Diretório flex/ não encontrado para o target '{consensus_job.target}'. "
            "O docking de consenso ainda não concluiu. "
            "Execute o consenso pelo módulo de Consenso antes de iniciar a dinâmica. "
            f"Caminho esperado: {flex_dir}"
        )

    result = []
    for f in sorted(flex_dir.glob("*_scored.mol2")):
        label = f.name.replace("_scored.mol2", "")
        result.append({"filename": f.name, "label": label})

    if not result:
        raise ValueError(
            f"O diretório flex/ existe mas está vazio para o target '{consensus_job.target}'. "
            "O docking anchor-and-grow do Dock6 não gerou poses. "
            "Verifique o log do consenso e execute novamente. "
            f"Caminho: {flex_dir}"
        )

    return result


def uc_listar_receptores_consenso(db: Session, consensus_job_id: int, usuario: User) -> list[dict]:
    """Lista apenas arquivos .noH.pdb em datasets/PDB/{target}/Prepared/ (receptores preparados pelo DH)."""
    consensus_job = db.query(ConsensusJob).filter(ConsensusJob.id == consensus_job_id).first()
    if not consensus_job or consensus_job.user_id != usuario.id:
        return []

    dh_dir       = get_config(db, "drug_hunter_path") or ""
    prepared_dir = Path(dh_dir) / "datasets" / "PDB" / consensus_job.target / "Prepared"
    if not prepared_dir.exists():
        return []

    return [{"filename": f.name} for f in sorted(prepared_dir.glob("*.noH.pdb"))]
