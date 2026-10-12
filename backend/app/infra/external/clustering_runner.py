"""
infra/external/clustering_runner.py — Executa o worker de clustering como subprocesso.

Chamado de dentro de uma thread (não asyncio), usa subprocess.Popen síncrono.
Lança RuntimeError em caso de falha.
Retorna dict com n_clusters e silhouette do evento "done".
"""
import json
import logging
import subprocess
import threading
from pathlib import Path
from typing import Optional, Tuple

from app.infra import job_control

logger = logging.getLogger("drughunter_studio")

_WORKER_PATH = str(Path(__file__).parent / "_dh_clustering_worker.py")


def run_clustering_worker(
    python_bin: str,
    dh_dir: str,
    admet_csv_path: str,
    target: str,
    base_input_path: str,
    base_output_path: str,
    fingerprint_type: str = "morgan",
    max_mols: Optional[int] = None,
) -> Tuple[Optional[int], Optional[float]]:
    """
    Executa o clustering via subprocesso com o Python do DrugHunter.
    Retorna (n_clusters, silhouette_score).
    Lança RuntimeError em caso de falha.
    """
    if not python_bin:
        raise RuntimeError(
            "Python do DrugHunter não configurado. "
            "Acesse Configurações e preencha o caminho do Python."
        )
    if not dh_dir or not Path(dh_dir).exists():
        raise RuntimeError(f"Pasta do DrugHunter não encontrada: {dh_dir}")

    args_json = json.dumps({
        "dh_dir": dh_dir,
        "admet_csv_path": admet_csv_path,
        "target": target,
        "base_input_path": base_input_path,
        "base_output_path": base_output_path,
        "fingerprint_type": fingerprint_type,
        "max_mols": max_mols,
    }, ensure_ascii=False)

    proc = subprocess.Popen(
        [python_bin, _WORKER_PATH, args_json],
        stdin=subprocess.DEVNULL,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        cwd=dh_dir,
        **job_control.popen_kwargs(),
    )
    job_control.attach(proc)

    done = False
    error_msg = None
    n_clusters = None
    silhouette = None

    def _drain_stderr():
        assert proc.stderr is not None
        for raw in proc.stderr:
            line = raw.decode("utf-8", errors="replace").strip()
            if line:
                logger.warning("Clustering worker stderr: %s", line)

    stderr_thread = threading.Thread(target=_drain_stderr, daemon=True)
    stderr_thread.start()

    assert proc.stdout is not None
    for raw_line in proc.stdout:
        line = raw_line.decode("utf-8", errors="replace").strip()
        if not line:
            continue
        try:
            event = json.loads(line)
        except json.JSONDecodeError:
            logger.info("Clustering [DH]: %s", line)
            continue

        etype = event.get("type")
        if etype == "start":
            logger.info("Clustering: %s", event.get("msg"))
        elif etype == "done":
            done = True
            n_clusters = event.get("n_clusters")
            silhouette = event.get("silhouette")
        elif etype == "error":
            error_msg = event.get("msg", "Erro desconhecido no worker de clustering")
        elif etype == "log":
            logger.info("Clustering [worker]: %s", event.get("msg"))
        elif etype == "warn":
            logger.warning("Clustering [worker]: %s", event.get("msg"))

    proc.wait()
    stderr_thread.join(timeout=5)

    if error_msg:
        raise RuntimeError(error_msg)

    if proc.returncode != 0 and not done:
        raise RuntimeError(
            f"Worker de clustering encerrou com código {proc.returncode}. Veja o stderr acima."
        )

    if not done:
        raise RuntimeError("Worker de clustering encerrou sem reportar conclusão.")

    return n_clusters, silhouette
