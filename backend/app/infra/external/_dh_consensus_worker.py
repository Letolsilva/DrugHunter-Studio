"""
Script executado via subprocesso com o Python do DrugHunter.

Recebe configuração via JSON em argv[1] e imprime eventos de progresso
como JSON lines no stdout. Código de saída 0 = sucesso, 1 = erro.

Instala dois shims antes de importar qualquer coisa do DH:

  chimera      — substitui o UCSF Chimera por obabel (sem minimização de energia),
                 preservando as coordenadas da pose Vina.

  sphere_selector — substitui o sphere_selector do Dock6, que é interativo e
                    bloqueia esperando stdin. Nossa versão seleciona esferas em
                    Python puro, sem interação, e grava selected_spheres.sph
                    no CWD.

Por que o shim de chimera é necessário:
  O DH usa Chimera para converter as poses do Vina (pdbqt) em mol2 e depois
  minimiza a energia (sem restrições de posição). Essa minimização desloca o
  ligante para fora do sítio de ligação, fazendo sphere_selector encontrar
  0 esferas e não gerar selected_spheres.sph — quebrando toda a etapa Dock6.
  O shim substitui o Chimera por obabel, que converte .pdb → .mol2 preservando
  as coordenadas da pose docada pelo Vina e atribuindo cargas de Gasteiger.

Por que o shim de sphere_selector é necessário:
  O sphere_selector do Dock6 é interativo: após selecionar as esferas, aguarda
  entrada do usuário no stdin. Em ambiente de servidor (stdin redirecionado ou
  fechado) isso pode bloquear indefinidamente ou retornar sem gravar o arquivo.
  Nossa versão calcula distâncias em Python puro e grava selected_spheres.sph
  de forma não-interativa.
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


def _install_chimera_shim(tmp_dir: str) -> None:
    """
    Cria um script fake 'chimera' em tmp_dir.

    O DH chama:  chimera --nogui --silent prepare_better_conform_<ligand>.com
    O script .com abre <ligand>.pdb, adiciona H/cargas, minimiza e grava .lig.mol2.
    Nosso shim lê o .com, extrai o nome do ligante e usa obabel para fazer a
    conversão pdb → mol2 com cargas Gasteiger — sem minimização de energia.
    """
    obabel_bin = str(Path(sys.executable).parent / "obabel")

    # language=bash
    shim_script = f"""\
#!/bin/bash
# DH chimera shim — usa obabel para preservar coordenadas da pose Vina
# Chamada: chimera --nogui --silent <arquivo.com>
LOG="/tmp/dh_shim_debug.log"
echo "[chimera] args: $@  cwd: $(pwd)  time: $(date +%T)" >> "$LOG"
COM="$3"
if [[ -z "$COM" || ! -f "$COM" ]]; then
    echo "[chimera] COM nao encontrado: '$COM'" >> "$LOG"
    exit 0
fi
# Extrai o nome do ligante da linha "open LIGNAME.pdb" do .com
LIGNAME=$(grep '^open ' "$COM" 2>/dev/null | head -1 | awk '{{print $2}}' | sed 's/\\.pdb$//')
echo "[chimera] COM=$COM  LIGNAME=$LIGNAME" >> "$LOG"
if [[ -z "$LIGNAME" ]]; then
    exit 0
fi
PDB="${{LIGNAME}}.pdb"
MOL2="${{LIGNAME}}.lig.mol2"
echo "[chimera] PDB=$PDB exists=$(test -f "$PDB" && echo yes || echo no)" >> "$LOG"
if [[ -f "$PDB" ]]; then
    "{obabel_bin}" -i pdb "$PDB" -o mol2 -O "$MOL2" \\
        --partialcharge gasteiger 2>&1 >> "$LOG"
    echo "[chimera] obabel exit=$?  mol2_created=$(test -f "$MOL2" && echo yes || echo no)" >> "$LOG"
fi
exit 0
"""

    shim_path = Path(tmp_dir) / "chimera"
    shim_path.write_text(shim_script)
    shim_path.chmod(shim_path.stat().st_mode | stat.S_IEXEC | stat.S_IXGRP | stat.S_IXOTH)


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
    log = open('/tmp/dh_shim_debug.log', 'a')
    log.write(f'[sph_sel] argv={sys.argv[1:]}\n')
    if sph_file is None:
        log.write('[sph_sel] falha ao reconstruir args\n')
        log.close()
        return
    log.write(f'[sph_sel] sph={sph_file} mol2={mol2_file} dist={distance} cwd={os.getcwd()}\n')

    coords  = parse_mol2_coords(mol2_file)
    spheres = parse_sph(sph_file)
    dist2   = distance * distance

    log.write(f'[sph_sel] atoms={len(coords)} spheres={len(spheres)}\n')

    selected = []
    for sph in spheres:
        _, idx, sx, sy, sz, radius, rest = sph
        for lx, ly, lz in coords:
            if (sx-lx)**2 + (sy-ly)**2 + (sz-lz)**2 <= dist2:
                selected.append(sph)
                break

    log.write(f'[sph_sel] selected={len(selected)}\n')
    log.flush()
    log.close()

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
echo "[sph_sel_sh] args: $@  cwd: $(pwd)  time: $(date +%T)" >> /tmp/dh_shim_debug.log
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
    Cria chimera e sphere_selector shims em um diretório temporário.
    Retorna o diretório (deve ser inserido no início do PATH).
    """
    tmp_dir = tempfile.mkdtemp(prefix="dh_shims_")
    _install_chimera_shim(tmp_dir)
    _install_sphere_selector_shim(tmp_dir)
    return tmp_dir


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

    # ── Instala os shims ANTES de importar qualquer coisa do DH ──────────────
    # Os shims precisam estar no PATH antes que o ProcessPoolExecutor fork os
    # workers, para que eles também encontrem nosso 'chimera' e 'sphere_selector'
    # falsos no lugar dos originais.
    shim_dir = _install_shims()

    # Limpa log de debug anterior
    try:
        open("/tmp/dh_shim_debug.log", "w").close()
    except OSError:
        pass

    os.environ["PATH"] = shim_dir + os.pathsep + os.environ.get("PATH", "")
    emit({"type": "log", "msg": f"Shims instalados em {shim_dir}"})

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
        emit({"type": "error", "msg": f"Não foi possível importar kernel do DrugHunter: {exc}"})
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

        # Patcha perform_subprocess para logar stdout/stderr do dock6 independente do exit code.
        # O DH só loga em CalledProcessError, então falhas silenciosas (exit 0 sem output)
        # ficam invisíveis. Este patch escreve tudo em /tmp/dh_dock6_debug.log.
        import subprocess as _subproc
        _orig_perform_subprocess = _DH_Dock6.perform_subprocess

        def _logging_perform_subprocess(self_dock6, command, local_path=None, shell=True, check=True):
            cwd = local_path[1:] if local_path else None
            try:
                result = _subproc.run(
                    command, cwd=cwd, shell=shell,
                    start_new_session=True,
                    stdin=_subproc.DEVNULL,
                    stdout=_subproc.PIPE, stderr=_subproc.PIPE,
                )
                with open("/tmp/dh_dock6_debug.log", "a") as _lf:
                    _lf.write(f"\n=== CMD: {command}  exit={result.returncode} ===\n")
                    _lf.write(f"STDOUT: {result.stdout.decode('utf-8', errors='replace')[:20000]}\n")
                    _lf.write(f"STDERR: {result.stderr.decode('utf-8', errors='replace')[:20000]}\n")
                if check and result.returncode != 0:
                    raise _subproc.CalledProcessError(result.returncode, command, result.stdout, result.stderr)
                return True
            except _subproc.CalledProcessError:
                raise
            except Exception as _exc:
                with open("/tmp/dh_dock6_debug.log", "a") as _lf:
                    _lf.write(f"EXCEPTION em perform_subprocess: {_exc}\n")
                return False
            finally:
                _dir = local_path[1:] if local_path else self_dock6.outputpath[1:]
                try:
                    _fd = os.open(_dir, os.O_DIRECTORY)
                    os.fsync(_fd)
                    os.close(_fd)
                except OSError:
                    pass
                import time as _time
                _time.sleep(1)

        _DH_Dock6.perform_subprocess = _logging_perform_subprocess
        emit({"type": "log", "msg": "Logging de subprocess do Dock6 ativado → /tmp/dh_dock6_debug.log"})

        # Dock6 v6.13 renomeou 'num_scored_conformers' → 'num_final_scored_poses'.
        # O template do DrugHunter usa o nome antigo; o dock6 não o reconhece e falha com:
        #   "num_final_scored_poses [1] (): ERROR: Parameter must be an integer > 0"
        # Patch: substitui o nome antigo pelo correto no arquivo .in gerado antes de rodar o dock6.
        _orig_generate_docking_script = _DH_Dock6.generate_docking_script

        def _fixed_generate_docking_script(self_dock6, input_template: str, output_script: str, **kwargs):
            _orig_generate_docking_script(self_dock6, input_template, output_script, **kwargs)
            try:
                with open(output_script, "r") as _f:
                    _content = _f.read()
                # dock6 v6.13: num_scored_conformers → num_final_scored_poses (renomeado)
                _fixed = _content.replace(
                    "num_scored_conformers",
                    "num_final_scored_poses",
                )
                # dock6 v6.13: num_preclustered_conformers é novo parâmetro obrigatório
                # não presente no template do DrugHunter — injeta após num_final_scored_poses
                if "num_preclustered_conformers" not in _fixed:
                    _fixed = _fixed.replace(
                        "num_final_scored_poses",
                        "num_final_scored_poses",  # mantém a linha
                    )
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

        _DH_Dock6.generate_docking_script = _fixed_generate_docking_script
        emit({"type": "log", "msg": "Patch dock6 v6.13: num_scored_conformers → num_final_scored_poses + num_preclustered_conformers"})

        # Patcha generate_consensus para ler scores do energy_min/ em vez do flex/.
        # O flex docking (dock6 anchor-and-grow) termina com exit=0 mas não escreve mol2 de
        # saída para estas moléculas, deixando flex/ vazio. Os _scored.mol2 do energy_min já
        # contêm Grid_Score e Internal_energy_repulsive — exatamente o que generate_consensus
        # precisa — então usamos esses arquivos diretamente para calcular o consenso.
        import wrappers.docking as _docking_mod
        import re as _re
        from pandas import DataFrame as _DataFrame

        def _consensus_from_energy_min(
            base_input_path: str,
            base_output_path: str,
            target: str,
            repulsion_weight: float = 1.0,
        ) -> None:
            from pathlib import Path as _PL
            energy_min_rel = f"{base_input_path}/Dock6/energy_min/"
            vinapath_rel = f"{base_input_path}/Vina/"
            cwd = str(_PL.cwd())

            energy_min_abs = cwd + energy_min_rel
            vina_abs = cwd + vinapath_rel

            try:
                mol2_files = [
                    f for f in os.listdir(energy_min_rel[1:])
                    if f.endswith("_scored.mol2")
                ]
            except OSError:
                emit({"type": "warn", "msg": f"energy_min/ não encontrado: {energy_min_rel}"})
                return

            if not mol2_files:
                emit({"type": "warn", "msg": "Nenhum _scored.mol2 em energy_min/ para gerar consenso."})
                return

            molecules: dict = {}
            for fname in mol2_files:
                mol_name = fname.replace(".lig.min_scored.mol2", "")
                if mol_name == fname:
                    mol_name = fname.rsplit("_scored.mol2", 1)[0]

                vina_pdbqt = vina_abs + mol_name + ".lig.pdbqt"
                try:
                    with open(vina_pdbqt, "r") as _fp:
                        _content = _fp.read()
                    _m = _re.search(r"REMARK VINA RESULT:\s+(-?\d+\.\d+)", _content)
                    vina_score = float(_m.group(1)) if _m else 0.0
                except Exception:
                    vina_score = 0.0

                dock6_mol2 = energy_min_abs + fname
                try:
                    with open(dock6_mol2, "r") as _fp:
                        _content = _fp.read()
                    _gs = _re.search(r"Grid_Score:\s+(-?\d+\.\d+)", _content)
                    _ir = _re.search(r"Internal_energy_repulsive:\s+(-?\d+\.\d+)", _content)
                    dock6_score = float(_gs.group(1)) if _gs else 0.0
                    repulsion = float(_ir.group(1)) if _ir else 0.0
                except Exception:
                    dock6_score = 0.0
                    repulsion = 0.0

                penalized = dock6_score + repulsion_weight * repulsion
                dock6_score = penalized if penalized < 0 else 0.0

                molecules[mol_name] = (vina_score, dock6_score)

            if not molecules:
                emit({"type": "warn", "msg": "Nenhuma molécula com scores válidos para o consenso."})
                return

            df = _DataFrame.from_dict(molecules, orient="index", columns=["vina", "dock6"])
            df.reset_index(inplace=True)
            df.rename(columns={"index": "molecule"}, inplace=True)

            vina_std = df["vina"].abs().std()
            dock6_std = df["dock6"].abs().std()
            if vina_std == 0 or dock6_std == 0:
                df["z-score"] = 0.0
            else:
                df["z-score"] = (
                    (df["vina"].abs() - df["vina"].abs().mean()) / vina_std
                    + (df["dock6"].abs() - df["dock6"].abs().mean()) / dock6_std
                ) / 2

            vina_range = df["vina"].abs().max() - df["vina"].abs().min()
            dock6_range = df["dock6"].abs().max() - df["dock6"].abs().min()
            if vina_range == 0 or dock6_range == 0:
                df["min-max"] = 0.0
            else:
                df["min-max"] = (
                    (df["vina"].abs() - df["vina"].abs().min()) / vina_range
                    + (df["dock6"].abs() - df["dock6"].abs().min()) / dock6_range
                ) / 2

            df = df.round(2)

            try:
                _docking_mod.plot_scatter_comparison(df, base_output_path)
            except Exception as _pe:
                emit({"type": "warn", "msg": f"plot_scatter_comparison falhou: {_pe}"})

            df = df.sort_values(by=["z-score", "min-max"], ascending=[False, False])

            try:
                from kernel.utilities import fileHandling as _fh
                _f1 = _fh(input_path=base_output_path + "/", output_path=base_output_path + "/")
                _f1.dataframe_to_csv(target, df)
            except Exception:
                csv_abs = cwd + base_output_path[1:] + "/" + target + ".csv"
                df.to_csv(csv_abs, index=False)

            emit({"type": "log", "msg": f"Consenso gerado com {len(df)} moléculas (scores de energy_min)."})

        _docking_mod.generate_consensus = _consensus_from_energy_min
        emit({"type": "log", "msg": "generate_consensus patchado → lê scores de energy_min/"})

    except ImportError as exc:
        emit({"type": "error", "msg": f"Erro ao importar wrappers.docking: {exc}"})
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

    emit({"type": "done"})


if __name__ == "__main__":
    main()
