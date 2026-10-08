"""
usecases/admet.py — Orquestração dos casos de uso ADMET.

Lê CSVs do job ChEMBL, executa a análise e persiste os resultados.
Não conhece HTTP nem FastAPI.
"""

import logging
from pathlib import Path
from typing import Optional

import pandas as pd
from sqlalchemy.orm import Session

from app.domain.models import User
from app.domain.models.chembl_job import ChemblJobItem
from app.domain.models.admet_result import AdmetResult
from app.infra.db.database import SessionLocal, get_config
from app.infra.external.admet_runner import run_admet_worker
from app.services import admet as svc

logger = logging.getLogger("drughunter_studio")


def _resolve_path(dh_dir: str, stored_path: str) -> Path:
    """Resolve stored_path relativo ao dh_dir, com fallback para caminhos absolutos legados."""
    p = Path(stored_path)
    if p.is_absolute() and p.exists():
        return p
    return Path(dh_dir) / stored_path.lstrip("/")


def _ler_counts_de_arquivos(output_dir: Path, stem: str) -> dict:
    """Lê contagens dos CSVs já existentes no disco (gerados pelo DrugHunter)."""
    csv_path = output_dir / f"{stem}.csv"
    toxic_path = output_dir / f"{stem}_toxic.csv"

    df = pd.read_csv(csv_path)
    df.columns = [c.upper() for c in df.columns]

    bbb_plus = int((df.get("BBB", pd.Series()) == "BBB+").sum())
    bbb_minus = int((df.get("BBB", pd.Series()) == "BBB-").sum())
    hia_plus = int((df.get("HIA", pd.Series()) == "HIA+").sum())
    pgp_plus = int((df.get("PGP", pd.Series()) == "PGP+").sum())

    excluded_toxic = 0
    if toxic_path.exists():
        try:
            excluded_toxic = len(pd.read_csv(toxic_path))
        except Exception:
            pass

    total_molecules = len(df) + excluded_toxic

    return {
        "total_molecules": total_molecules,
        "excluded_toxic": excluded_toxic,
        "bbb_plus": bbb_plus,
        "bbb_minus": bbb_minus,
        "hia_plus": hia_plus,
        "pgp_plus": pgp_plus,
    }


def _executar_pipeline(result_id: int, item_id: int) -> None:
    """Lê arquivos ADMET existentes ou executa o worker do DrugHunter se necessário."""
    db = SessionLocal()
    try:
        result = db.query(AdmetResult).filter(AdmetResult.id == result_id).first()
        item = db.query(ChemblJobItem).filter(ChemblJobItem.id == item_id).first()

        if not result or not item:
            logger.error("AdmetResult %s ou ChemblJobItem %s não encontrado.", result_id, item_id)
            return

        base_output_path = item.job.base_output_path
        dh_dir = get_config(db, "drug_hunter_path") or ""
        output_dir = _resolve_path(dh_dir, base_output_path) / "ChEMBL" / item.folder_name / "ADMET"
        stem = item.folder_name
        csv_path = output_dir / f"{stem}.csv"

        if csv_path.exists():
            # Arquivos já gerados pelo DrugHunter — só lê os counts, sem recalcular
            logger.info("ADMET: arquivos já existem em %s — lendo do disco.", output_dir)
            counts = _ler_counts_de_arquivos(output_dir, stem)
        else:
            # Arquivos não existem — roda o worker do DrugHunter para gerar.
            # Prefere DrugBank/{stem}_FULL.csv (criado pelo prepare_datamols no worker ChEMBL);
            # fallback para bioatividades/ em jobs anteriores sem a etapa DrugBank.
            python_bin = get_config(db, "python_bin") or ""
            drugbank_dir = _resolve_path(dh_dir, base_output_path) / "ChEMBL" / "DrugBank"
            if (drugbank_dir / f"{stem}_FULL.csv").exists():
                input_dir = str(drugbank_dir)
            else:
                input_dir = str(_resolve_path(dh_dir, base_output_path) / "ChEMBL" / item.folder_name / "bioatividades")

            logger.info("ADMET: arquivos não encontrados em %s — executando worker.", output_dir)
            counts = run_admet_worker(
                python_bin=python_bin,
                dh_dir=dh_dir,
                input_dir=input_dir,
                output_dir=str(output_dir),
                stem=stem,
            )

        svc.marcar_concluido(
            db=db,
            result_id=result_id,
            total_molecules=counts["total_molecules"],
            excluded_toxic=counts["excluded_toxic"],
            bbb_plus=counts["bbb_plus"],
            bbb_minus=counts["bbb_minus"],
            hia_plus=counts["hia_plus"],
            pgp_plus=counts["pgp_plus"],
        )
        logger.info(
            "ADMET concluído: result_id=%s | total=%s | tóxicas=%s | BBB+=%s",
            result_id, counts["total_molecules"], counts["excluded_toxic"], counts["bbb_plus"],
        )

    except Exception as e:
        logger.exception("Erro no pipeline ADMET result_id=%s: %s", result_id, e)
        try:
            svc.marcar_erro(db, result_id, str(e))
        except Exception:
            pass
    finally:
        db.close()


def uc_iniciar_admet(
    db: Session,
    usuario: User,
    chembl_job_item_id: int,
) -> AdmetResult:
    """
    Cria o AdmetResult no banco e agenda execução em background.
    Retorna o resultado imediatamente (status=running); cliente faz polling.
    """
    item = (
        db.query(ChemblJobItem)
        .filter(ChemblJobItem.id == chembl_job_item_id)
        .first()
    )
    if item is None:
        raise ValueError(f"ChemblJobItem {chembl_job_item_id} não encontrado.")

    if item.job.user_id != usuario.id:
        raise PermissionError("Este item não pertence ao usuário.")

    if item.status != "done":
        raise ValueError("O item ChEMBL ainda não concluiu. Aguarde antes de rodar ADMET.")

    base_output_path = item.job.base_output_path

    result = svc.criar_ou_substituir(
        db=db,
        user_id=usuario.id,
        chembl_job_item_id=chembl_job_item_id,
        base_output_path=base_output_path,
    )

    import threading
    t = threading.Thread(
        target=_executar_pipeline,
        args=(result.id, chembl_job_item_id),
        daemon=True,
    )
    t.start()

    return result


def uc_get_result(db: Session, result_id: int, usuario: User) -> Optional[AdmetResult]:
    return svc.buscar_por_id(db, result_id, usuario.id)


def uc_get_result_by_item(
    db: Session, chembl_job_item_id: int, usuario: User
) -> Optional[AdmetResult]:
    return svc.buscar_por_item(db, chembl_job_item_id, usuario.id)


def uc_listar_moleculas(
    db: Session,
    result_id: int,
    usuario: User,
    page: int = 1,
    per_page: int = 50,
    filtro_bbb: Optional[str] = None,
    filtro_hia: Optional[str] = None,
):
    """Lê o CSV completo do ADMET e retorna paginado, com filtros opcionais."""
    result = svc.buscar_por_id(db, result_id, usuario.id)
    if result is None or result.status != "done":
        return None

    item = db.query(ChemblJobItem).filter(ChemblJobItem.id == result.chembl_job_item_id).first()
    if item is None:
        return None

    dh_dir = get_config(db, "drug_hunter_path") or ""
    csv_path = _resolve_path(dh_dir, result.base_output_path) / "ChEMBL" / item.folder_name / "ADMET" / f"{item.folder_name}.csv"
    if not csv_path.exists():
        return None

    try:
        df = pd.read_csv(csv_path)
    except Exception:
        return None

    # Normaliza nomes de colunas para lowercase no retorno
    df.columns = [c.lower() for c in df.columns]

    if filtro_bbb:
        df = df[df["bbb"] == filtro_bbb]
    if filtro_hia:
        df = df[df["hia"] == filtro_hia]

    total = len(df)
    pages = max(1, (total + per_page - 1) // per_page)
    start = (page - 1) * per_page
    page_df = df.iloc[start : start + per_page]

    molecules = page_df.to_dict(orient="records")
    return {
        "molecules": molecules,
        "total": total,
        "page": page,
        "per_page": per_page,
        "pages": pages,
    }


def uc_get_download_path(
    db: Session,
    result_id: int,
    usuario: User,
    tipo: str,
) -> Optional[Path]:
    """
    Retorna o Path do CSV para download.
    tipo: "all" | "bbb_plus" | "bbb_minus" | "hia_plus" | "toxic"
    """
    result = svc.buscar_por_id(db, result_id, usuario.id)
    if result is None or result.status != "done":
        return None

    item = db.query(ChemblJobItem).filter(ChemblJobItem.id == result.chembl_job_item_id).first()
    if item is None:
        return None

    dh_dir = get_config(db, "drug_hunter_path") or ""
    admet_dir = _resolve_path(dh_dir, result.base_output_path) / "ChEMBL" / item.folder_name / "ADMET"
    stem = item.folder_name

    mapa = {
        "all": admet_dir / f"{stem}.csv",
        "bbb_plus": admet_dir / f"{stem}_BBBplus.csv",
        "bbb_minus": admet_dir / f"{stem}_BBBminus.csv",
        "hia_plus": admet_dir / f"{stem}_HIAplus.csv",
        "toxic": admet_dir / f"{stem}_toxic.csv",
    }

    path = mapa.get(tipo)
    if path and path.exists():
        return path
    return None
