"""
infra/external/md_analyser_runner.py — Executa o worker de Análise de Dinâmica Molecular como subprocesso.

Chamado de dentro de uma thread (não asyncio), usa subprocess.Popen síncrono.
Lança RuntimeError em caso de falha.
"""
import json
import logging
import subprocess
import threading
from pathlib import Path
from typing import Optional

logger = logging.getLogger("pdb_explorer")

_MD_ANALYSER_WORKER_PATH = str(Path(__file__).parent / "_dh_md_analyser_worker.py")


def run_md_analyser_worker(
    python_bin: str,
    dh_dir: str,
    parent_output_path: str,
    target: str,
    integration_step: float,
    reporting_interval_steps: int,
) -> None:
    """Executa a análise de trajetória de dinâmica molecular via subprocesso. Lança RuntimeError em falha."""
    if not python_bin:
        raise RuntimeError(
            "Python do DrugHunter não configurado. "
            "Acesse Configurações e preencha o caminho do Python."
        )
    if not dh_dir or not Path(dh_dir).exists():
        raise RuntimeError(f"Pasta do DrugHunter não encontrada: {dh_dir}")

    args_json = json.dumps(
        {
            "dh_dir": dh_dir,
            "python_bin": python_bin,
            "parent_output_path": parent_output_path,
            "target": target,
            "integration_step": integration_step,
            "reporting_interval_steps": reporting_interval_steps,
        },
        ensure_ascii=False,
    )

    proc = subprocess.Popen(
        [python_bin, _MD_ANALYSER_WORKER_PATH, args_json],
        stdin=subprocess.DEVNULL,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        cwd=dh_dir,
    )

    done_event: Optional[dict] = None
    error_msg: Optional[str] = None
    stderr_lines: list[str] = []

    def _drain_stderr():
        assert proc.stderr is not None
        for raw in proc.stderr:
            line = raw.decode("utf-8", errors="replace").strip()
            if line:
                logger.warning("MD analyser worker stderr: %s", line)
                stderr_lines.append(line)

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
            logger.info("MD analyser [DH]: %s", line)
            continue

        etype = event.get("type")
        if etype == "start":
            logger.info("MD analyser: %s", event.get("msg"))
        elif etype == "done":
            done_event = event
        elif etype == "error":
            error_msg = event.get("msg", "Erro desconhecido no worker de análise de dinâmica molecular")
        elif etype == "log":
            logger.info("MD analyser [worker]: %s", event.get("msg"))
        elif etype == "warn":
            logger.warning("MD analyser [worker]: %s", event.get("msg"))

    proc.wait()
    stderr_thread.join(timeout=5)

    if error_msg:
        raise RuntimeError(error_msg)

    if proc.returncode != 0 and done_event is None:
        stderr_snippet = "\n".join(stderr_lines[-10:])[:400]
        raise RuntimeError(
            "Falha inesperada na análise de trajetória. Tente rodar novamente."
            + (f" Detalhe: {stderr_snippet}" if stderr_snippet else "")
        )

    if done_event is None:
        raise RuntimeError(
            "O processo de análise de trajetória parou inesperadamente. Tente rodar novamente."
        )
