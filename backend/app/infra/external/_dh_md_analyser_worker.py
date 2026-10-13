"""
Script executado via subprocesso com o Python do DrugHunter.

Recebe configuração via JSON em argv[1].
Responsabilidades:
  1. Chamar execute_md_analisys do DrugHunter
  2. Emitir {"type": "done"} ou {"type": "error", "msg": "..."}

Paths recebidos já são absolutos — não DH-relativos.
O worker roda com cwd=dh_dir.
"""
import json
import os
import sys
from pathlib import Path

# Compatibilidade: pkg_resources foi removido do stdlib no Python 3.12+ e de versões
# recentes do setuptools. Injetamos um stub mínimo antes de qualquer import do DrugHunter
# para que dependências transitivas (OpenMM, BioPython etc.) não quebrem.
if "pkg_resources" not in sys.modules:
    try:
        import pkg_resources  # noqa: F401
    except ImportError:
        import types as _types

        _pr = _types.ModuleType("pkg_resources")

        class _Dist:
            def __init__(self, name="", version="0.0.0"):
                self.project_name = name
                self.version = version

            def __str__(self):
                return f"{self.project_name} {self.version}"

        class _DistNotFound(Exception):
            pass

        class _VersionConflict(Exception):
            pass

        def _get_distribution(name):
            return _Dist(name)

        def _require(*args, **kwargs):
            return []

        def _working_set_iter():
            return iter([])

        _pr.get_distribution = _get_distribution
        _pr.require = _require
        _pr.DistributionNotFound = _DistNotFound
        _pr.VersionConflict = _VersionConflict
        _pr.WorkingSet = type("WorkingSet", (), {"__iter__": lambda self: _working_set_iter()})
        _pr.working_set = _pr.WorkingSet()
        _pr.resource_string = lambda *a, **k: b""
        _pr.resource_filename = lambda *a, **k: ""
        _pr.resource_stream = lambda *a, **k: None
        _pr.resource_exists = lambda *a, **k: False
        _pr.resource_listdir = lambda *a, **k: []
        sys.modules["pkg_resources"] = _pr


def emit(msg: dict):
    print(json.dumps(msg, ensure_ascii=False), flush=True)


def main():
    if len(sys.argv) < 2:
        emit({"type": "error", "msg": "Uso: _dh_md_analyser_worker.py <json_args>"})
        sys.exit(1)

    try:
        args = json.loads(sys.argv[1])
    except json.JSONDecodeError as exc:
        emit({"type": "error", "msg": f"Args JSON inválido: {exc}"})
        sys.exit(1)

    dh_dir                  = args["dh_dir"]
    python_bin              = args.get("python_bin", "") or sys.executable
    parent_output_path      = args["parent_output_path"]   # path absoluto do diretório pai (sem o target/)
    target                  = args["target"]
    integration_step        = float(args["integration_step"])      # fs
    reporting_interval_steps = int(args["reporting_interval_steps"])

    src_path = str(Path(dh_dir) / "src")
    if src_path not in sys.path:
        sys.path.insert(0, src_path)
    os.chdir(dh_dir)

    # ── Auto-configura $AMBERHOME se não estiver definido ────────────────────
    if not os.environ.get("AMBERHOME"):
        _env_prefix = Path(python_bin).parent.parent  # bin/ → env root
        _antechamber = _env_prefix / "bin" / "antechamber"
        if _antechamber.exists():
            os.environ["AMBERHOME"] = str(_env_prefix)
            emit({"type": "log", "msg": f"AMBERHOME auto-configurado: {_env_prefix}"})

    # ── Patcha subprocess.check_output para interceptar antechamber -L ─────────
    # O AmberTools wrapper do OpenFF chama antechamber -L durante o import para
    # detectar a versão. Se o antechamber retornar exit code != 0, a importação
    # do openff.toolkit falha. Interceptamos e devolvemos uma versão fictícia.
    import subprocess as _subproc_patch
    _orig_check_output = _subproc_patch.check_output

    def _safe_check_output(cmd, **kwargs):
        if isinstance(cmd, (list, tuple)) and cmd and "antechamber" in str(cmd[0]):
            # ambertools_wrapper.py: out.split("\n")[1].split()[3].strip(":")
            return b"\nAMBERTOOLS: Release 20 20.0:\n"
        return _orig_check_output(cmd, **kwargs)

    _subproc_patch.check_output = _safe_check_output

    # ── Importa módulos do DrugHunter ─────────────────────────────────────────
    try:
        from openmm import unit as _unit
        from wrappers.molecular_dynamics import execute_md_analisys
    except ImportError as exc:
        emit({"type": "error", "msg": f"Não foi possível inicializar o DrugHunter ou o OpenMM. Verifique se o ambiente conda está ativo. Detalhe: {exc}"})
        sys.exit(1)

    emit({"type": "start", "msg": f"Iniciando análise de trajetória: target={target}, parent={parent_output_path}"})

    # ── Executa análise ───────────────────────────────────────────────────────
    try:
        execute_md_analisys(
            base_output_path=parent_output_path,
            target=target,
            integration_step=integration_step * _unit.femtoseconds,
            align_trajectory=True,
            in_memory=False,
            reporting_interval_steps=reporting_interval_steps,
        )
    except Exception as exc:
        emit({"type": "error", "msg": f"Erro durante a análise da trajetória. Se o problema persistir, verifique se o OpenMM está instalado. Detalhe: {exc}"})
        sys.exit(1)

    emit({"type": "done"})


if __name__ == "__main__":
    main()
