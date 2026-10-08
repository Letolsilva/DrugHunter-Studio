"""
infra/external/neurodock_runner.py — Executa os workers de NeuroDock como subprocesso.

Chamado de dentro de uma thread (não asyncio), usa subprocess.Popen síncrono.
Lança RuntimeError em caso de falha.
"""
import json
import logging
import subprocess
import threading
from pathlib import Path
from typing import Optional, Tuple

logger = logging.getLogger("pdb_explorer")

_TRAIN_WORKER_PATH = str(Path(__file__).parent / "_dh_neurodock_train_worker.py")
_PREDICT_WORKER_PATH = str(Path(__file__).parent / "_dh_neurodock_predict_worker.py")


def _run_worker(
    python_bin: str,
    dh_dir: str,
    worker_path: str,
    args_json: str,
) -> dict:
    """Executa um worker como subprocesso e retorna o evento 'done'."""
    if not python_bin:
        raise RuntimeError(
            "Python do DrugHunter não configurado. "
            "Acesse Configurações e preencha o caminho do Python."
        )
    if not dh_dir or not Path(dh_dir).exists():
        raise RuntimeError(f"Pasta do DrugHunter não encontrada: {dh_dir}")

    proc = subprocess.Popen(
        [python_bin, worker_path, args_json],
        stdin=subprocess.DEVNULL,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        cwd=dh_dir,
    )

    done_event: Optional[dict] = None
    error_msg: Optional[str] = None

    def _drain_stderr():
        assert proc.stderr is not None
        for raw in proc.stderr:
            line = raw.decode("utf-8", errors="replace").strip()
            if line:
                logger.warning("NeuroDock worker stderr: %s", line)

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
            logger.info("NeuroDock [DH]: %s", line)
            continue

        etype = event.get("type")
        if etype == "start":
            logger.info("NeuroDock: %s", event.get("msg"))
        elif etype == "done":
            done_event = event
        elif etype == "error":
            error_msg = event.get("msg", "Erro desconhecido no worker NeuroDock")
        elif etype == "log":
            logger.info("NeuroDock [worker]: %s", event.get("msg"))
        elif etype == "warn":
            logger.warning("NeuroDock [worker]: %s", event.get("msg"))

    proc.wait()
    stderr_thread.join(timeout=5)

    if error_msg:
        raise RuntimeError(error_msg)

    if proc.returncode != 0 and done_event is None:
        raise RuntimeError(
            f"Worker NeuroDock encerrou com código {proc.returncode}. Veja o stderr acima."
        )

    if done_event is None:
        raise RuntimeError("Worker NeuroDock encerrou sem reportar conclusão.")

    return done_event


def run_train_worker(
    python_bin: str,
    dh_dir: str,
    base_input_mols: str,
    base_input_fingerprints: str,
    base_input_consensus: str,
    model_output_path: str,
    history_output_path: str,
    input_mols: str,
    fingerprint_type: str = "morgan",
    consensus_type: str = "min-max",
    evaluation_name: str = "MorganBestModel",
    n_trials: int = 20,
) -> Tuple[Optional[int], Optional[int]]:
    """Treina o modelo NeuroDock. Retorna (n_targets, n_train_mols)."""
    args_json = json.dumps({
        "dh_dir": dh_dir,
        "base_input_mols": base_input_mols,
        "base_input_fingerprints": base_input_fingerprints,
        "base_input_consensus": base_input_consensus,
        "model_output_path": model_output_path,
        "history_output_path": history_output_path,
        "input_mols": input_mols,
        "fingerprint_type": fingerprint_type,
        "consensus_type": consensus_type,
        "evaluation_name": evaluation_name,
        "n_trials": n_trials,
    }, ensure_ascii=False)

    event = _run_worker(python_bin, dh_dir, _TRAIN_WORKER_PATH, args_json)
    return event.get("n_targets"), event.get("n_train_mols")


def run_predict_worker(
    python_bin: str,
    dh_dir: str,
    library_csv_path: str,
    input_dataset: str,
    model_output_path: str,
    evaluation_model: str,
    base_output_path: str,
    fingerprint_type: str = "morgan",
    top_k: int = 50,
    batch_size: int = 10000,
    pred_id: Optional[int] = None,
) -> Tuple[Optional[int], Optional[int]]:
    """Executa triagem virtual. Retorna (n_screened, n_selected)."""
    args_json = json.dumps({
        "dh_dir": dh_dir,
        "library_csv_path": library_csv_path,
        "input_dataset": input_dataset,
        "model_output_path": model_output_path,
        "evaluation_model": evaluation_model,
        "base_output_path": base_output_path,
        "fingerprint_type": fingerprint_type,
        "top_k": top_k,
        "batch_size": batch_size,
        "pred_id": pred_id,
    }, ensure_ascii=False)

    event = _run_worker(python_bin, dh_dir, _PREDICT_WORKER_PATH, args_json)
    return event.get("n_screened"), event.get("n_selected")
