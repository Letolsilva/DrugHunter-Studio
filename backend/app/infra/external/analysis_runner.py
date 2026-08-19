"""
infra/external/analysis_runner.py — Executa análise molecular em background.

Chama _dh_analysis_worker.py via subprocesso com o Python do DrugHunter,
evitando conflitos de sys.path/cwd com o ambiente do backend.
"""

import json
import logging
import subprocess
from pathlib import Path

logger = logging.getLogger("pdb_explorer")

_WORKER_PATH = str(Path(__file__).parent / "_dh_analysis_worker.py")


def executar_analise_background(
    job_id: int,
    base_output_path: str,
    fingerprint: str,
    metric: str,
    drug_hunter_dir: str,
    python_bin: str,
    on_done=None,
    on_error=None,
) -> None:
    """
    Executa a análise molecular para um job ChEMBL.

    Consolida bioatividades/similares de cada alvo em *_MOLS.csv / *_SIMS.csv,
    gera fingerprints, calcula similaridade e analisa grafos.

    Callbacks opcionais:
      on_done(job_id)             → chamado ao final com sucesso
      on_error(job_id, error_msg) → chamado se o subprocess falhar
    """
    chembl_output = str(Path(base_output_path) / "ChEMBL")

    args_json = json.dumps({
        "dh_dir":        drug_hunter_dir,
        "chembl_output": chembl_output,
        "fingerprint":   fingerprint,
        "metric":        metric,
    }, ensure_ascii=False)

    cmd = [python_bin, _WORKER_PATH, args_json]

    logger.info(
        "Iniciando análise molecular — job=%s fingerprint=%s metric=%s",
        job_id, fingerprint, metric,
    )

    try:
        proc = subprocess.Popen(
            cmd,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
            cwd=drug_hunter_dir,
        )
        logger.info("Análise iniciada em background (PID=%s) — job=%s", proc.pid, job_id)
    except Exception as exc:
        logger.exception("Erro ao iniciar análise — job=%s: %s", job_id, exc)
        if on_error:
            on_error(job_id, str(exc))
