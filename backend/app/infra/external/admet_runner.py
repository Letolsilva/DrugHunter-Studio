"""
infra/external/admet_runner.py — Executa o worker ADMET como subprocesso.

Chamado de dentro de uma thread (não asyncio), usa subprocess.Popen síncrono.
Retorna o dict emitido pelo worker no evento "done" ou lança RuntimeError.
"""
import json
import logging
import subprocess
from pathlib import Path

logger = logging.getLogger("pdb_explorer")

_WORKER_PATH = str(Path(__file__).parent / "_dh_admet_worker.py")


def run_admet_worker(
    python_bin: str,
    dh_dir: str,
    input_dir: str,
    output_dir: str,
    stem: str,
) -> dict:
    """
    Executa o pipeline ADMET via subprocesso com o Python do DrugHunter.

    Retorna o dict do evento "done" emitido pelo worker:
      {total_molecules, excluded_toxic, bbb_plus, bbb_minus, hia_plus, pgp_plus}

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
        "input_dir": input_dir,
        "output_dir": output_dir,
        "stem": stem,
    }, ensure_ascii=False)

    proc = subprocess.Popen(
        [python_bin, _WORKER_PATH, args_json],
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        cwd=dh_dir,
    )

    done_data = None
    error_msg = None

    assert proc.stdout is not None
    for raw_line in proc.stdout:
        line = raw_line.decode("utf-8", errors="replace").strip()
        if not line:
            continue
        try:
            event = json.loads(line)
        except json.JSONDecodeError:
            continue

        etype = event.get("type")
        if etype == "etapa":
            logger.info("ADMET etapa: %s", event.get("etapa"))
        elif etype == "done":
            done_data = event
        elif etype == "error":
            error_msg = event.get("msg", "Erro desconhecido no worker ADMET")

    proc.wait()

    stderr_bytes = proc.stderr.read() if proc.stderr else b""
    if stderr_bytes:
        logger.debug("ADMET worker stderr: %s", stderr_bytes.decode("utf-8", errors="replace").strip())

    if error_msg:
        raise RuntimeError(error_msg)

    if proc.returncode != 0 and done_data is None:
        stderr_str = stderr_bytes.decode("utf-8", errors="replace").strip() if stderr_bytes else ""
        raise RuntimeError(
            f"Worker ADMET encerrou com código {proc.returncode}. "
            + (f"Stderr: {stderr_str[:500]}" if stderr_str else "")
        )

    if done_data is None:
        raise RuntimeError("Worker ADMET encerrou sem reportar conclusão.")

    return done_data
