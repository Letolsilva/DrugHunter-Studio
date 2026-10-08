"""
infra/external/analysis_runner.py — Executa análise molecular em background.

Chama _dh_analysis_worker.py via subprocesso com o Python do DrugHunter,
evitando conflitos de sys.path/cwd com o ambiente do backend.
"""

import json
import logging
import subprocess
import threading
from pathlib import Path

logger = logging.getLogger("drughunter_studio")

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
    Executa a análise molecular para um job ChEMBL em daemon thread.

    Consolida bioatividades/similares de cada alvo em *_MOLS.csv / *_SIMS.csv,
    gera fingerprints, calcula similaridade e analisa grafos.

    Em caso de erro, grava analysis_error.json no diretório de análise para que
    uc_analise_status possa surfacear o erro ao usuário.

    Callbacks opcionais:
      on_done(job_id)             → chamado ao final com sucesso
      on_error(job_id, error_msg) → chamado se o subprocess falhar
    """
    # Resolve para path absoluto: base_output_path pode ser relativo ao dh_dir (novo padrão)
    # ou já absoluto (legado). A escrita de error_file ocorre no processo do backend (não no
    # subprocess), então o path precisa ser absoluto independentemente do cwd do worker.
    _p = Path(base_output_path)
    abs_output = _p if (_p.is_absolute() and _p.exists()) else Path(drug_hunter_dir) / base_output_path.lstrip("/")
    chembl_output = str(abs_output / "ChEMBL")
    analysis_dir = abs_output / "ChEMBL" / "analysis"
    error_file = analysis_dir / "analysis_error.json"

    args_json = json.dumps({
        "dh_dir":        drug_hunter_dir,
        "chembl_output": chembl_output,
        "fingerprint":   fingerprint,
        "metric":        metric,
    }, ensure_ascii=False)

    cmd = [python_bin, _WORKER_PATH, args_json]

    # Apaga erro anterior para que o status não mostre erro de run anterior
    try:
        error_file.unlink(missing_ok=True)
    except Exception:
        pass

    logger.info(
        "Iniciando análise molecular — job=%s fingerprint=%s metric=%s",
        job_id, fingerprint, metric,
    )

    try:
        proc = subprocess.Popen(
            cmd,
            stdin=subprocess.DEVNULL,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            cwd=drug_hunter_dir,
        )
    except Exception as exc:
        logger.exception("Erro ao iniciar análise — job=%s: %s", job_id, exc)
        _write_error(error_file, str(exc))
        if on_error:
            on_error(job_id, str(exc))
        return

    logger.info("Análise iniciada em background (PID=%s) — job=%s", proc.pid, job_id)

    def _run():
        done = False
        error_msg = None

        def _drain_stderr():
            assert proc.stderr is not None
            for raw in proc.stderr:
                line = raw.decode("utf-8", errors="replace").strip()
                if line:
                    logger.warning("Analysis worker stderr: %s", line)

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
                logger.info("Analysis [DH]: %s", line)
                continue

            etype = event.get("type")
            if etype == "done":
                done = True
            elif etype == "error":
                error_msg = event.get("msg", "Erro desconhecido na análise molecular")
            elif etype == "partial_failure":
                logger.warning("Analysis partial_failure — job=%s: %s", job_id, event.get("msg"))
            elif etype in ("log", "etapa"):
                logger.info("Analysis [worker]: %s", event.get("msg") or event.get("etapa", ""))
            elif etype == "warn":
                logger.warning("Analysis [worker]: %s", event.get("msg"))

        proc.wait()
        stderr_thread.join(timeout=5)

        if error_msg:
            logger.error("Análise molecular falhou — job=%s: %s", job_id, error_msg)
            _write_error(error_file, error_msg)
            if on_error:
                on_error(job_id, error_msg)
        elif proc.returncode != 0 and not done:
            msg = f"Análise encerrou com código {proc.returncode}. Verifique os logs do servidor."
            logger.error("Analysis encerrou com código %s — job=%s", proc.returncode, job_id)
            _write_error(error_file, msg)
            if on_error:
                on_error(job_id, msg)
        else:
            error_file.unlink(missing_ok=True)
            logger.info("Análise molecular concluída — job=%s", job_id)
            if on_done:
                on_done(job_id)

    t = threading.Thread(target=_run, daemon=True)
    t.start()


def _write_error(error_file: Path, msg: str) -> None:
    try:
        error_file.parent.mkdir(parents=True, exist_ok=True)
        error_file.write_text(json.dumps({"error": msg}, ensure_ascii=False))
    except Exception as exc:
        logger.warning("Não foi possível gravar analysis_error.json: %s", exc)
