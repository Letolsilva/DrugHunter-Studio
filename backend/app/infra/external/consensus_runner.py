"""
infra/external/consensus_runner.py — Executa o worker de consenso como subprocesso.

Chamado de dentro de uma thread (não asyncio), usa subprocess.Popen síncrono.
Lança RuntimeError em caso de falha.
"""
import json
import logging
import os
import subprocess
import threading
from pathlib import Path
from typing import Tuple

logger = logging.getLogger("pdb_explorer")

_WORKER_PATH = str(Path(__file__).parent / "_dh_consensus_worker.py")


def run_consensus_worker(
    python_bin: str,
    dh_dir: str,
    base_input_path: str,
    target: str,
    base_docking_output_path: str,
    base_selected_mols: str,
    dock6_app_path: str,
    pdb_code: Tuple,
    charge_type: str,
    prepare_complex: bool,
    chimera_path: str = "",
    mol_filename: str = "molecules",
) -> None:
    """
    Executa o docking de consenso via subprocesso com o Python do DrugHunter.
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
        "base_input_path": base_input_path,
        "target": target,
        "base_output_path": base_docking_output_path,
        "base_selected_mols": base_selected_mols,
        "mol_filename": mol_filename,
        "dock6_app_path": dock6_app_path,
        "pdb_code": list(pdb_code),
        "charge_type": charge_type,
        "prepare_complex": prepare_complex,
    }, ensure_ascii=False)

    # Garante que os diretórios bin/ do DrugHunter, Dock6 e Chimera estão no PATH do subprocesso.
    # dh_bin: obabel, vina e outros binários do env conda
    # dock6_bin: sphere_selector, sphgen, showbox, dock6 e afins
    # chimera_bin: diretório bin/ do UCSF Chimera (configurado em Settings → chimera_path)
    dh_bin = str(Path(python_bin).parent)
    dock6_bin = dock6_app_path.rstrip("/") if dock6_app_path else ""
    chimera_bin = chimera_path.rstrip("/") if chimera_path else ""
    env = os.environ.copy()
    extra = [p for p in [dh_bin, dock6_bin, chimera_bin] if p]
    env["PATH"] = os.pathsep.join(extra) + os.pathsep + env.get("PATH", "")

    proc = subprocess.Popen(
        [python_bin, _WORKER_PATH, args_json],
        stdin=subprocess.DEVNULL,  # dock6 herda stdin do worker; sem DEVNULL trava esperando terminal
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        cwd=dh_dir,
        env=env,
    )

    done = False
    error_msg = None

    # Lê stderr em thread paralela para evitar deadlock quando o buffer encher
    # e para mostrar erros em tempo real no log do backend.
    stderr_lines: list[str] = []

    def _drain_stderr():
        assert proc.stderr is not None
        for raw in proc.stderr:
            line = raw.decode("utf-8", errors="replace").strip()
            if line:
                logger.warning("Consenso worker stderr: %s", line)
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
            # Linhas não-JSON são prints do próprio DrugHunter — loga em tempo real
            logger.info("Consenso [DH]: %s", line)
            continue

        etype = event.get("type")
        if etype == "start":
            logger.info("Consenso: %s", event.get("msg"))
        elif etype == "done":
            done = True
        elif etype == "error":
            error_msg = event.get("msg", "Erro desconhecido no worker de consenso")
        elif etype == "log":
            logger.info("Consenso [worker]: %s", event.get("msg"))
        elif etype == "warn":
            logger.warning("Consenso [worker]: %s", event.get("msg"))

    proc.wait()
    stderr_thread.join(timeout=5)

    if error_msg:
        raise RuntimeError(error_msg)

    if proc.returncode != 0 and not done:
        stderr_snippet = "\n".join(stderr_lines[-10:])[:400]
        raise RuntimeError(
            "Falha inesperada no docking de consenso. Verifique se o Dock6 e o Chimera estão instalados e configurados em Configurações."
            + (f" Detalhe: {stderr_snippet}" if stderr_snippet else "")
        )

    if not done:
        raise RuntimeError(
            "O processo de docking parou inesperadamente. Tente rodar novamente."
        )
