"""
infra/external/chembl_runner.py — Adapter de saída: execução do pipeline ChEMBL.

Executa cada alvo como um subprocesso usando o Python do DrugHunter,
evitando conflitos de sys.path/cwd com o ambiente do backend.

Emite eventos SSE conforme o progresso de cada alvo no grupo.
"""

import asyncio
import json
import logging
import os
from pathlib import Path
from typing import AsyncGenerator, List

logger = logging.getLogger("pdb_explorer")

_WORKER_PATH = str(Path(__file__).parent / "_dh_chembl_worker.py")


def _sse(data: dict) -> str:
    return f"data: {json.dumps(data, ensure_ascii=False)}\n\n"


async def _run_item_subprocess(
    python_bin: str,
    dh_dir: str,
    target_name: str,
    output_path: str,
    target_filters: dict,
    bioact_filters: dict,
    mol_filters: dict,
    sim_filters: dict,
    chembl_search_id: str | None = None,
) -> AsyncGenerator[dict, None]:
    """
    Executa um alvo via subprocesso com o Python do DH.
    Gera dicts de progresso lidos do stdout do worker (JSON lines).
    """
    args_json = json.dumps({
        "dh_dir": dh_dir,
        "target_name": target_name,
        "output_path": output_path,
        "target_filters": target_filters,
        "bioact_filters": bioact_filters,
        "mol_filters": mol_filters,
        "sim_filters": sim_filters,
        "chembl_search_id": chembl_search_id or None,
    }, ensure_ascii=False)

    dh_bin = str(Path(python_bin).parent)
    env = os.environ.copy()
    env["PATH"] = dh_bin + os.pathsep + env.get("PATH", "")

    proc = await asyncio.create_subprocess_exec(
        python_bin, _WORKER_PATH, args_json,
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE,
        cwd=dh_dir,
        env=env,
    )

    try:
        assert proc.stdout is not None
        async for raw_line in proc.stdout:
            line = raw_line.decode("utf-8", errors="replace").strip()
            if not line:
                continue
            try:
                yield json.loads(line)
            except json.JSONDecodeError:
                pass  # DH pode imprimir linhas não-JSON; ignorar
    finally:
        if proc.returncode is None:
            try:
                proc.kill()
            except ProcessLookupError:
                pass
        await proc.wait()
        assert proc.stderr is not None
        stderr_bytes = await proc.stderr.read()
        if stderr_bytes:
            logger.debug(
                "ChEMBL worker stderr [%s]: %s",
                target_name,
                stderr_bytes.decode("utf-8", errors="replace").strip(),
            )


async def run_chembl_group(
    job_id: int,
    items_data: List[dict],
    base_output_path: str,
    drug_hunter_dir: str,
    python_bin: str = "",
    on_item_start=None,
    on_item_done=None,
    on_item_error=None,
) -> AsyncGenerator[str, None]:
    """
    Generator SSE que executa o pipeline ChEMBL para cada item do grupo
    de forma sequencial, emitindo progresso a cada etapa.
    """
    if not drug_hunter_dir or not Path(drug_hunter_dir).exists():
        yield _sse({
            "tipo": "erro_fatal",
            "msg": f"DrugHunter não encontrado em: {drug_hunter_dir}",
        })
        return

    if not python_bin:
        yield _sse({
            "tipo": "erro_fatal",
            "msg": "Python do DrugHunter não configurado. Acesse Configurações e preencha o caminho do Python.",
        })
        return

    total = len(items_data)
    yield _sse({"tipo": "inicio_grupo", "job_id": job_id, "total": total})

    for idx, item in enumerate(items_data):
        item_id = item["item_id"]
        target_name = item["target_name"]
        folder_name = item["folder_name"]
        chembl_search_id = item.get("chembl_search_id") or None
        target_filters = item.get("target_filters", {})
        bioact_filters = item.get("bioact_filters", {})
        mol_filters = item.get("mol_filters", {})
        sim_filters = item.get("sim_filters", {})

        item_output = str(Path(base_output_path) / "ChEMBL" / folder_name)

        yield _sse({
            "tipo": "item_inicio",
            "idx": idx,
            "item_id": item_id,
            "target": target_name,
        })

        if on_item_start:
            on_item_start(item_id)

        try:
            mol_count = 0
            got_done = False

            async for event in _run_item_subprocess(
                python_bin=python_bin,
                dh_dir=drug_hunter_dir,
                target_name=target_name,
                output_path=item_output,
                target_filters=target_filters,
                bioact_filters=bioact_filters,
                mol_filters=mol_filters,
                sim_filters=sim_filters,
                chembl_search_id=chembl_search_id,
            ):
                etype = event.get("type")
                if etype == "etapa":
                    yield _sse({"tipo": "etapa", "idx": idx, "etapa": event["etapa"]})
                elif etype == "done":
                    mol_count = event.get("molecules_count", 0)
                    got_done = True
                elif etype == "error":
                    raise RuntimeError(event.get("msg", "Erro desconhecido no worker"))

            if not got_done:
                raise RuntimeError("Worker encerrou sem reportar conclusão.")

            yield _sse({
                "tipo": "item_fim",
                "idx": idx,
                "item_id": item_id,
                "status": "done",
                "molecules_count": mol_count,
            })

            if on_item_done:
                on_item_done(item_id, mol_count)

        except Exception as exc:
            error_msg = str(exc)
            logger.exception(
                "Erro no item %s (target=%s): %s", item_id, target_name, error_msg
            )
            yield _sse({
                "tipo": "item_erro",
                "idx": idx,
                "item_id": item_id,
                "msg": error_msg,
            })
            if on_item_error:
                on_item_error(item_id, error_msg)

    yield _sse({"tipo": "fim_grupo", "job_id": job_id})
