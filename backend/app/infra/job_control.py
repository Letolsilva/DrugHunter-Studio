"""
Controle de jobs em execução — permite CANCELAR um job encerrando o subprocesso do DrugHunter.

Como funciona
-------------
1. A thread (ou task) do job roda dentro de `track(kind, job_id)` (ou do decorador `@tracked(kind)`),
   que registra a "chave" do job no contexto da thread.
2. O runner cria o subprocesso com `**popen_kwargs()` (novo grupo de processos) e chama `attach(proc)`;
   o processo passa a ser conhecido pelo registro.
3. `cancel(kind, job_id)` marca o job como cancelado e encerra o GRUPO de processos inteiro
   (o worker Python e os filhos: Chimera, Vina, Dock6, OpenBabel...).
4. O runner percebe a saída do processo e lança erro; o usecase consulta `was_cancelled()` para
   não tratar o encerramento como falha (sem e-mail) e os `marcar_*` dos services preservam o
   estado "cancelled" no banco.

O registro vive na memória do servidor: se o servidor reiniciar, os subprocessos órfãos não são
conhecidos (o mesmo vale para a recuperação de jobs "running" já existente).
"""
from __future__ import annotations

import functools
import logging
import os
import signal
import subprocess
import threading
from contextlib import contextmanager
from typing import Any, Callable, Optional

logger = logging.getLogger(__name__)

JobKey = tuple[str, int]

_lock = threading.Lock()
_procs: dict[JobKey, list[Any]] = {}
_cancelled: set[JobKey] = set()
_ctx = threading.local()

# Tempo entre o pedido de término (SIGTERM) e o encerramento forçado (SIGKILL)
_GRACE_SECONDS = 5.0


def popen_kwargs() -> dict:
    """Argumentos extras de Popen/create_subprocess_exec para o processo ficar em grupo próprio."""
    if os.name == "nt":
        return {}
    return {"start_new_session": True}


@contextmanager
def track(kind: str, job_id: int):
    """Registra o job corrente da thread. Zera um cancelamento antigo da mesma chave (re-execução)."""
    key: JobKey = (kind, job_id)
    with _lock:
        _cancelled.discard(key)
        _procs.pop(key, None)
    previous = getattr(_ctx, "key", None)
    _ctx.key = key
    try:
        yield
    finally:
        _ctx.key = previous
        with _lock:
            _procs.pop(key, None)  # `_cancelled` permanece para was_cancelled() após o fim do bloco


def tracked(kind: str) -> Callable:
    """Decorador para `_executar_*`: o 1º argumento posicional é o id do job."""

    def decorator(fn: Callable) -> Callable:
        @functools.wraps(fn)
        def wrapper(job_id: int, *args, **kwargs):
            with track(kind, job_id):
                return fn(job_id, *args, **kwargs)

        return wrapper

    return decorator


def attach(proc: Any, key: Optional[JobKey] = None) -> None:
    """Associa o subprocesso ao job corrente. Se o cancelamento já foi pedido, encerra na hora."""
    key = key or getattr(_ctx, "key", None)
    if key is None:
        return
    with _lock:
        _procs.setdefault(key, []).append(proc)
        already_cancelled = key in _cancelled
    if already_cancelled:
        _kill(proc)


def was_cancelled(kind: str, job_id: int) -> bool:
    with _lock:
        return (kind, job_id) in _cancelled


def is_active(kind: str, job_id: int) -> bool:
    with _lock:
        return (kind, job_id) in _procs


def cancel(kind: str, job_id: int) -> bool:
    """Pede o cancelamento. Retorna True se havia subprocesso conhecido sendo encerrado."""
    key: JobKey = (kind, job_id)
    with _lock:
        _cancelled.add(key)
        procs = list(_procs.get(key, []))
    for proc in procs:
        _kill(proc)
    if procs:
        logger.info("Job %s/%s cancelado: %d processo(s) encerrado(s).", kind, job_id, len(procs))
    else:
        logger.info("Job %s/%s cancelado (sem subprocesso ativo registrado).", kind, job_id)
    return bool(procs)


def _alive(proc: Any) -> bool:
    returncode = getattr(proc, "returncode", None)
    if returncode is not None:
        return False
    poll = getattr(proc, "poll", None)
    return poll() is None if callable(poll) else True


def _kill(proc: Any) -> None:
    if not _alive(proc):
        return
    pid = proc.pid
    try:
        if os.name == "nt":
            subprocess.run(
                ["taskkill", "/F", "/T", "/PID", str(pid)],
                capture_output=True, check=False,
            )
            return
        pgid = os.getpgid(pid)
        if pgid == os.getpgid(0):
            # Mesmo grupo do servidor (runner sem `popen_kwargs()`): nunca usar killpg — derrubaria a API.
            proc.terminate()
            return
        os.killpg(pgid, signal.SIGTERM)
    except (ProcessLookupError, PermissionError):
        return
    except Exception:  # noqa: BLE001
        logger.exception("Falha ao encerrar o processo %s", pid)
        return

    def _force() -> None:
        if _alive(proc):
            try:
                pgid = os.getpgid(pid)
                if pgid != os.getpgid(0):
                    os.killpg(pgid, signal.SIGKILL)
                else:
                    proc.kill()
            except (ProcessLookupError, PermissionError):
                pass

    timer = threading.Timer(_GRACE_SECONDS, _force)
    timer.daemon = True
    timer.start()
