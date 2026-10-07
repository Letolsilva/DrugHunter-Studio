"""
Script executado via subprocesso com o Python do DrugHunter.

Recebe configuração via JSON em argv[1] e imprime eventos de progresso
como JSON lines no stdout. Código de saída 0 = sucesso, 1 = erro.

Instala um shim antes de importar qualquer coisa do DH:

  sphere_selector — substitui o sphere_selector do Dock6, que é interativo e
                    bloqueia esperando stdin. Nossa versão seleciona esferas em
                    Python puro, sem interação, e grava selected_spheres.sph
                    no CWD. Desvio documentado em PRINCIPIOS.md.

Chimera: usado diretamente conforme o fluxo original do DrugHunter.
  O DH chama: chimera --nogui --silent prepare_better_conform_<ligand>.com
  O script .com abre o .pdb da pose Vina, adiciona H, atribui cargas e
  minimiza energia, depois grava .lig.mol2.
  Requer que o UCSF Chimera esteja instalado e acessível no PATH.
"""
import json
import os
import stat
import sys
import tempfile
from pathlib import Path


def emit(msg: dict):
    try:
        print(json.dumps(msg, ensure_ascii=False), flush=True)
    except (BrokenPipeError, OSError):
        # Pipe fechado pelo processo pai — silencia; o resultado já foi gravado em disco.
        pass


def _install_sphere_selector_shim(tmp_dir: str) -> None:
    """
    Cria um script fake 'sphere_selector' em tmp_dir.

    O sphere_selector do Dock6 é interativo: após selecionar as esferas dentro
    do raio pedido, ele aguarda o usuário escolher um cluster. Em servidor isso
    bloqueia ou retorna sem gravar o arquivo.

    Nosso shim implementa a seleção em Python puro:
      1. Lê as coordenadas dos átomos do ligante no .mol2
      2. Lê todas as esferas do .sph
      3. Seleciona as que estão a ≤ distance Å de qualquer átomo do ligante
      4. Grava selected_spheres.sph no CWD (mesmo comportamento do original)

    Chamada: sphere_selector <sph_file> <mol2_file> <distance>
    """
    python_bin = sys.executable

    # language=python
    py_script = r"""
import sys, os

def parse_mol2_coords(mol2_file):
    coords = []
    in_atom = False
    try:
        with open(mol2_file) as f:
            for line in f:
                if '@<TRIPOS>ATOM' in line:
                    in_atom = True
                    continue
                if line.startswith('@<TRIPOS>'):
                    in_atom = False
                    continue
                if in_atom and line.strip():
                    parts = line.split()
                    if len(parts) >= 5:
                        try:
                            coords.append((float(parts[2]), float(parts[3]), float(parts[4])))
                        except ValueError:
                            pass
    except OSError:
        pass
    return coords

def parse_sph(sph_file):
    spheres = []
    current_cluster = None
    try:
        with open(sph_file) as f:
            for line in f:
                stripped = line.rstrip()
                if not stripped or stripped.startswith('DOCK'):
                    continue
                if stripped.lstrip().startswith('cluster'):
                    parts = stripped.split()
                    try:
                        current_cluster = int(parts[1])
                    except (IndexError, ValueError):
                        pass
                    continue
                parts = stripped.split()
                if len(parts) >= 5 and current_cluster is not None:
                    try:
                        idx    = int(parts[0])
                        sx, sy, sz = float(parts[1]), float(parts[2]), float(parts[3])
                        radius = float(parts[4])
                        rest   = ' '.join(parts[5:]) if len(parts) > 5 else '0  0'
                        spheres.append((current_cluster, idx, sx, sy, sz, radius, rest))
                    except (ValueError, IndexError):
                        pass
    except OSError:
        pass
    return spheres

def reconstruct_paths(argv_parts):
    # DH calls sphere_selector via shell=True without quoting paths.
    # Paths with spaces (e.g. "Área de Trabalho") get split into multiple argv items.
    # Strategy: last arg is always the float distance; join the rest and split on
    # known extensions to find .sph and .mol2 boundaries.
    if len(argv_parts) < 3:
        return None, None, None
    try:
        distance = float(argv_parts[-1])
    except ValueError:
        return None, None, None
    joined = ' '.join(argv_parts[:-1])
    sph_idx = joined.find('.sph')
    if sph_idx == -1:
        return None, None, None
    sph_file = joined[:sph_idx + 4].strip()
    mol2_file = joined[sph_idx + 4:].strip()
    return sph_file, mol2_file, distance

def main():
    sph_file, mol2_file, distance = reconstruct_paths(sys.argv[1:])
    if sph_file is None:
        return

    coords  = parse_mol2_coords(mol2_file)
    spheres = parse_sph(sph_file)
    dist2   = distance * distance

    selected = []
    for sph in spheres:
        _, idx, sx, sy, sz, radius, rest = sph
        for lx, ly, lz in coords:
            if (sx-lx)**2 + (sy-ly)**2 + (sz-lz)**2 <= dist2:
                selected.append(sph)
                break

    if selected:
        with open('selected_spheres.sph', 'w') as out:
            out.write('DOCK 3.5 receptor_spheres\n')
            out.write(f'cluster     1   number of spheres in cluster  {len(selected):4d}\n')
            for _, idx, sx, sy, sz, radius, rest in selected:
                rest_parts = rest.split()
                close_atom = int(rest_parts[0]) if rest_parts else 0
                flag1 = int(rest_parts[1]) if len(rest_parts) > 1 else 0
                flag2 = int(rest_parts[2]) if len(rest_parts) > 2 else 0
                out.write(f'{idx:5d}{sx:10.5f}{sy:10.5f}{sz:10.5f}{radius:8.3f}{close_atom:5d}{flag1:2d}{flag2:3d}\n')

main()
"""

    # language=bash
    shim_script = f"""\
#!/bin/bash
# DH sphere_selector shim — seleciona esferas sem interação com o usuário
# Chamada: sphere_selector <sph_file> <mol2_file> <distance>
# Nota: DH chama via shell=True sem aspas; paths com espaços chegam quebrados.
# Passamos "$@" inteiro para Python reconstruir os paths pelas extensões.
"{python_bin}" - "$@" << 'PYEOF'
{py_script}
PYEOF
exit 0
"""

    shim_path = Path(tmp_dir) / "sphere_selector"
    shim_path.write_text(shim_script)
    shim_path.chmod(shim_path.stat().st_mode | stat.S_IEXEC | stat.S_IXGRP | stat.S_IXOTH)


def _install_shims() -> str:
    """
    Cria o sphere_selector shim em um diretório temporário.
    Retorna o diretório (deve ser inserido no início do PATH).
    O Chimera é usado diretamente — sem shim.
    """
    tmp_dir = tempfile.mkdtemp(prefix="dh_shims_")
    _install_sphere_selector_shim(tmp_dir)
    return tmp_dir


# ── Patches de nível de módulo (picklable) ────────────────────────────────────
# O DrugHunter usa multiprocessing.ProcessPoolExecutor para paralelizar o docking.
# Os objetos Dock6 são enviados para processos filhos via pickle na fila de trabalho.
# Closures definidos dentro de main() não são picklable por nome qualificado —
# as funções de patch precisam estar no nível de módulo para serem serializáveis.

_ORIG_GENERATE_DOCKING_SCRIPT: object = None


def _fixed_generate_docking_script(self_dock6, input_template: str, output_script: str, **kwargs):
    _ORIG_GENERATE_DOCKING_SCRIPT(self_dock6, input_template, output_script, **kwargs)  # type: ignore[call-arg]
    try:
        with open(output_script, "r") as _f:
            _content = _f.read()
        # dock6 v6.13: num_scored_conformers → num_final_scored_poses (renomeado)
        _fixed = _content.replace("num_scored_conformers", "num_final_scored_poses")
        # dock6 v6.13: num_preclustered_conformers é novo parâmetro obrigatório
        # não presente no template do DrugHunter — injeta após num_final_scored_poses
        if "num_preclustered_conformers" not in _fixed:
            import re as _re2
            _fixed = _re2.sub(
                r"(num_final_scored_poses\s+\d+)",
                r"\1\nnum_preclustered_conformers                              1",
                _fixed,
            )
        if _fixed != _content:
            with open(output_script, "w") as _f:
                _f.write(_fixed)
    except OSError:
        pass


# Pickle serializa bound methods usando func.__name__ para reconstruir via getattr(instance, name).
# Se __name__ não coincidir com o atributo da classe, o processo filho levanta AttributeError.
_fixed_generate_docking_script.__name__ = "generate_docking_script"
_fixed_generate_docking_script.__qualname__ = "generate_docking_script"


def main():
    if len(sys.argv) < 2:
        emit({"type": "error", "msg": "Uso: _dh_consensus_worker.py <json_args>"})
        sys.exit(1)

    try:
        args = json.loads(sys.argv[1])
    except json.JSONDecodeError as exc:
        emit({"type": "error", "msg": f"Args JSON inválido: {exc}"})
        sys.exit(1)

    dh_dir            = args["dh_dir"]
    base_input_path   = args["base_input_path"]
    target            = args["target"]
    base_output_path  = args["base_output_path"]
    base_selected_mols = args["base_selected_mols"]
    mol_filename      = args.get("mol_filename", "molecules")
    dock6_app_path    = args.get("dock6_app_path", "")
    # DH's grid.template usa {dock6_path}parameters/vdw_AMBER_parm99.defn,
    # então dock6_app_path precisa ser o RAIZ do Dock6 (pai de bin/), não bin/ sozinho.
    # Se não configurado ou se aponta para bin/, derivamos o root automaticamente.
    _dock6_bin_path = dock6_app_path.rstrip("/") if dock6_app_path else ""
    if not _dock6_bin_path:
        # Não configurado: tenta encontrar 'grid' no PATH herdado
        import shutil as _shutil
        _grid_bin = _shutil.which("grid")
        if not _grid_bin:
            for _p in os.environ.get("PATH", "").split(os.pathsep):
                _candidate = Path(_p) / "grid"
                if _candidate.exists():
                    _grid_bin = str(_candidate)
                    break
        if _grid_bin:
            dock6_app_path = str(Path(_grid_bin).parent.parent) + "/"
            emit({"type": "log", "msg": f"Dock6 root auto-detectado: {dock6_app_path}"})
    elif _dock6_bin_path.endswith("/bin"):
        # Configurado como bin/ → sobe um nível para o root
        dock6_app_path = str(Path(_dock6_bin_path).parent) + "/"
        emit({"type": "log", "msg": f"Dock6 root derivado de bin/: {dock6_app_path}"})
    pdb_code_raw      = args["pdb_code"]  # [pdb_id, ligand_resname, resnum, chain]
    charge_type       = args.get("charge_type", "am1")
    prepare_complex   = bool(args.get("prepare_complex", False))

    pdb_code = (
        str(pdb_code_raw[0]),
        str(pdb_code_raw[1]),
        int(pdb_code_raw[2]),
        str(pdb_code_raw[3]),
    )

    # ── Instala o shim do sphere_selector ANTES de importar o DH ────────────
    # O sphere_selector do Dock6 bloqueia stdin em modo interativo; o shim
    # substitui apenas esse binário, não o Chimera.
    shim_dir = _install_shims()

    os.environ["PATH"] = shim_dir + os.pathsep + os.environ.get("PATH", "")
    emit({"type": "log", "msg": f"Shim sphere_selector instalado em {shim_dir}"})

    # ── Verifica se o Chimera está acessível no PATH ──────────────────────────
    import shutil as _shutil
    chimera_bin = _shutil.which("chimera")
    if chimera_bin:
        emit({"type": "log", "msg": f"Chimera encontrado: {chimera_bin}"})
    else:
        emit({"type": "warn", "msg": (
            "AVISO: 'chimera' não encontrado no PATH. "
            "O DrugHunter precisa do UCSF Chimera instalado para a etapa "
            "prepare_better_conform (conversão pdb → mol2 com minimização de energia). "
            "Instale o Chimera e adicione ao PATH antes de rodar o consenso."
        )})

    # Configura o ambiente DrugHunter
    src_path = os.path.join(dh_dir, "src")
    if src_path not in sys.path:
        sys.path.insert(0, src_path)
    os.chdir(dh_dir)

    # Injeta stub para kernel.header_builder (não presente nesta instalação)
    import types
    try:
        import kernel as _kernel_pkg
    except ImportError as exc:
        emit({"type": "error", "msg": f"Não foi possível inicializar o DrugHunter. Verifique se o ambiente conda está ativo e o caminho do Python está correto em Configurações. Detalhe: {exc}"})
        sys.exit(1)

    if "kernel.header_builder" not in sys.modules:
        hb_stub = types.ModuleType("kernel.header_builder")

        class _HeaderBuilder:
            @staticmethod
            def build(**kwargs):
                return kwargs.get("module_title", "")

        hb_stub.HeaderBuilder = _HeaderBuilder
        sys.modules["kernel.header_builder"] = hb_stub
        _kernel_pkg.header_builder = hb_stub

    try:
        from wrappers.docking import perform_consensus
        # O DH define nprocess = os.cpu_count() - 2 no __init__ da classe base.
        # Nesta máquina isso gera 14 workers, que lançam 10 processos dock6 em paralelo
        # e esgotam a RAM — o OOM killer derruba o VS Code.
        # Limitamos a 2 workers para que no máximo 2 processos dock6 rodem ao mesmo tempo.
        from caad.docking import Dock6 as _DH_Dock6
        _dh_dock6_orig_init = _DH_Dock6.__init__

        # Calcula nprocess seguro: ~1.5 GB por processo dock6, mínimo 1, máximo cpu_count-2.
        # Lê MemAvailable do /proc/meminfo para não depender de psutil.
        def _safe_nprocess() -> int:
            try:
                with open("/proc/meminfo") as _f:
                    for _line in _f:
                        if _line.startswith("MemAvailable:"):
                            _avail_gb = int(_line.split()[1]) / (1024 ** 2)
                            return max(1, min(int(_avail_gb / 1.5), (os.cpu_count() or 4) - 2))
            except OSError:
                pass
            return 2

        _nprocess = _safe_nprocess()

        def _dh_dock6_limited_init(self, *a, **kw):
            _dh_dock6_orig_init(self, *a, **kw)
            self.nprocess = _nprocess

        _DH_Dock6.__init__ = _dh_dock6_limited_init
        emit({"type": "log", "msg": f"Paralelismo do Dock6 ajustado para {_nprocess} processos (RAM disponível)"})

        # Aplica patch usando função de nível de módulo (picklable):
        # closures locais causariam AttributeError nos processos filhos do ProcessPoolExecutor
        # ao tentar desserializar objetos Dock6 via pickle.
        global _ORIG_GENERATE_DOCKING_SCRIPT
        _ORIG_GENERATE_DOCKING_SCRIPT = _DH_Dock6.generate_docking_script
        _DH_Dock6.generate_docking_script = _fixed_generate_docking_script
        emit({"type": "log", "msg": "Patch dock6 v6.13: num_scored_conformers → num_final_scored_poses + num_preclustered_conformers"})

    except ImportError as exc:
        emit({"type": "error", "msg": f"Não foi possível carregar o módulo de docking do DrugHunter. Verifique se o ambiente conda está ativo. Detalhe: {exc}"})
        sys.exit(1)

    emit({"type": "start", "msg": "Iniciando docking de consenso..."})

    try:
        perform_consensus(
            base_input_path=base_input_path,
            target=target,
            base_output_path=base_output_path,
            base_selected_mols=base_selected_mols,
            mol_filename=mol_filename,
            dock6_app_path=dock6_app_path,
            pdb_code=pdb_code,
            charge_type=charge_type,
            prepare_complex=prepare_complex,
        )
    except Exception as exc:
        emit({"type": "error", "msg": str(exc)})
        sys.exit(1)

    # ── Verificação pós-execução: quantos mol2 foram criados pelo Chimera ─────
    try:
        output_abs = Path(dh_dir) / base_output_path.lstrip("/")
        mol2_files = list(output_abs.rglob("*.lig.mol2"))
        emit({"type": "log", "msg": f"Verificação pós-consenso: {len(mol2_files)} arquivo(s) .lig.mol2 criados"})
        for mf in mol2_files[:10]:
            emit({"type": "log", "msg": f"  mol2: {mf.relative_to(Path(dh_dir))}"})
    except Exception as _ve:
        emit({"type": "log", "msg": f"Verificação pós-consenso: erro ao listar mol2: {_ve}"})

    emit({"type": "done"})


if __name__ == "__main__":
    main()
