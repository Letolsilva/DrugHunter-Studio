"""
Script executado via subprocesso com o Python do DrugHunter.

Recebe configuração via JSON em argv[1].
Responsabilidades:
  1. Chamar MDSimulator diretamente (não execute_md_simulation, para controlar paths)
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


def _map_constraints(name: str):
    from openmm.app import HBonds, AllBonds, HAngles
    mapping = {
        "HBonds": HBonds,
        "AllBonds": AllBonds,
        "HAngles": HAngles,
        "None": None,
    }
    return mapping.get(name, HBonds)


def main():
    if len(sys.argv) < 2:
        emit({"type": "error", "msg": "Uso: _dh_md_worker.py <json_args>"})
        sys.exit(1)

    try:
        args = json.loads(sys.argv[1])
    except json.JSONDecodeError as exc:
        emit({"type": "error", "msg": f"Args JSON inválido: {exc}"})
        sys.exit(1)

    dh_dir             = args["dh_dir"]
    ligand_input_path  = args["ligand_input_path"]   # absoluto
    receptor_input_path = args["receptor_input_path"] # absoluto
    output_path        = args["output_path"]          # absoluto
    p                  = args["params"]               # dict com todos os MDParams

    src_path = os.path.join(dh_dir, "src")
    if src_path not in sys.path:
        sys.path.insert(0, src_path)
    os.chdir(dh_dir)

    # ── Auto-configura $AMBERHOME se não estiver definido ────────────────────
    # antechamber (para cargas AM1-BCC) fica no bin/ do env conda.
    # Quando instalado via "conda install -c conda-forge ambertools", o env
    # prefix é o próprio AMBERHOME. Detectamos pelo caminho do python_bin.
    if not os.environ.get("AMBERHOME"):
        _python_bin = args.get("python_bin", "") or sys.executable
        _env_prefix = Path(_python_bin).parent.parent  # bin/ → env root
        _antechamber = _env_prefix / "bin" / "antechamber"
        if _antechamber.exists():
            os.environ["AMBERHOME"] = str(_env_prefix)
            emit({"type": "log", "msg": f"AMBERHOME auto-configurado: {_env_prefix}"})

    # ── Importa módulos do DrugHunter ─────────────────────────────────────────
    # Patch: openff.toolkit tenta rodar "antechamber -L" ao inicializar o GLOBAL_TOOLKIT_REGISTRY.
    # Se antechamber retornar exit!=0 (versão incompatível ou AMBERHOME não configurado), o import
    # falha com CalledProcessError antes mesmo de criar o MDSimulator.
    # Interceptamos check_output para que chamadas a "antechamber" retornem vazio (toolkit marcado
    # como ausente, não como erro fatal) e restauramos depois do import.
    import subprocess as _subproc_patch
    _orig_check_output = _subproc_patch.check_output

    def _safe_check_output(cmd, **kwargs):
        if isinstance(cmd, (list, tuple)) and cmd and "antechamber" in str(cmd[0]):
            # ambertools_wrapper.py faz: out.split("\n")[1].split()[3].strip(":")
            # Retornamos versão 20.0: alta o suficiente para OpenFF aceitar,
            # mas abaixo de 22+ que adicionou o flag -dr (não suportado por
            # versões antigas do antechamber instaladas via conda).
            return b"\nAMBERTOOLS: Release 20 20.0:\n"
        return _orig_check_output(cmd, **kwargs)

    _subproc_patch.check_output = _safe_check_output
    try:
        from caad.dynamics import (
            MDSimulator,
            LigandForceField,
            ProteinForceField,
            WaterForceField,
            MDPlatform,
            SolvationWaterModel,
        )
        from openmm import unit
    except ImportError as exc:
        emit({"type": "error", "msg": f"Falha ao importar DrugHunter/OpenMM: {exc}"})
        sys.exit(1)
    finally:
        _subproc_patch.check_output = _orig_check_output

    # ── Mapeia enums de string → objetos do DrugHunter ───────────────────────
    def _protein_ff(name: str):
        try:
            return ProteinForceField[name]
        except KeyError:
            return ProteinForceField.AMBER_FF14SB

    def _water_ff(name: str):
        try:
            return WaterForceField[name]
        except KeyError:
            return WaterForceField.TIP3P_STANDARD

    def _ligand_ff(name: str):
        try:
            return LigandForceField[name]
        except KeyError:
            return LigandForceField.OPENFF_2_2_0

    def _platform(name: str):
        try:
            return MDPlatform[name]
        except KeyError:
            return MDPlatform.CUDA

    def _water_model(name: str):
        try:
            return SolvationWaterModel[name]
        except KeyError:
            return SolvationWaterModel.TIP3P

    # ── Valida arquivos de entrada ────────────────────────────────────────────
    if not Path(ligand_input_path).exists():
        emit({"type": "error", "msg": f"Arquivo do ligante não encontrado: {ligand_input_path}"})
        sys.exit(1)

    if not Path(receptor_input_path).exists():
        emit({"type": "error", "msg": f"Arquivo do receptor não encontrado: {receptor_input_path}"})
        sys.exit(1)

    Path(output_path).mkdir(parents=True, exist_ok=True)

    # ── Monta parâmetros ──────────────────────────────────────────────────────
    constraints      = _map_constraints(p.get("constraints", "HBonds"))
    protein_ff       = _protein_ff(p.get("protein_forcefield", "AMBER_FF14SB"))
    solvent_ff       = _water_ff(p.get("solvent_forcefield", "TIP3P_STANDARD"))
    ligand_ff        = _ligand_ff(p.get("ligand_forcefield", "OPENFF_2_2_0"))
    platform         = _platform(p.get("platform_name", "CUDA"))
    water_model      = _water_model(p.get("water_model", "TIP3P"))

    sim_temp         = p.get("simulation_temperature", 310.0) * unit.kelvin
    friction         = p.get("friction_coeff", 1.0) / unit.picoseconds
    integ_step       = p.get("integration_step", 2.0) * unit.femtoseconds
    padding          = p.get("padding_value", 1.0) * unit.nanometer
    ionic            = p.get("ionic_strength", 0.1) * unit.molar
    cutoff           = p.get("nonbondedCutoff", 1.0) * unit.nanometer
    baro_pressure    = p.get("barostat_pressure", 1.0) * unit.atmospheres

    hydrogen_mass = None
    if p.get("hydrogenMass") is not None:
        hydrogen_mass = p["hydrogenMass"] * unit.amu

    extforce = p.get("externalForce_constrain_kJ")

    emit({"type": "start", "msg": f"Iniciando dinâmica molecular: ligante={Path(ligand_input_path).name}, receptor={Path(receptor_input_path).name}"})

    # ── Converte paths absolutos para DH-relativos ───────────────────────────
    # MDSimulator armazena os paths e usa [1:] para torná-los relativos ao dh_dir (CWD).
    # Ex: '/datasets/PDB/Target/Prepared/1P0I.noH.pdb' → [1:] → 'datasets/PDB/...' (relativo ao CWD=dh_dir)
    # Se passarmos '/home/letol/.../1P0I.noH.pdb', o [1:] vira 'home/letol/...' — errado.
    def _to_dh_rel(abs_path: str) -> str:
        try:
            rel = Path(abs_path).relative_to(dh_dir)
            return "/" + str(rel)
        except ValueError:
            return abs_path  # fora do dh_dir — passa como está

    ligand_for_md   = ligand_input_path
    receptor_for_md = _to_dh_rel(receptor_input_path)
    # output_path precisa de barra final (MDSimulator concatena diretamente com o nome do arquivo)
    output_for_md   = _to_dh_rel(output_path).rstrip("/") + "/"

    ligand_for_md = _to_dh_rel(ligand_input_path)

    # ── Patch OpenFF: mol2 → sdf via RDKit (transparente ao MDSimulator) ────
    # MDSimulator valida a extensão do ligante e só aceita mol2.
    # Mas OpenFF não consegue ler mol2 do DOCK6 com o RDKit toolkit.
    # Interceptamos Molecule.from_file para converter mol2→sdf com RDKit
    # antes que OpenFF tente ler, sem alterar o path visto pelo MDSimulator.
    try:
        from openff.toolkit import Molecule as _OFFMolecule
        from rdkit import Chem as _RDChem

        _orig_off_from_file = _OFFMolecule.from_file

        def _off_from_file_patched(filename, file_format=None, **kwargs):
            fn = str(filename)
            fmt = (file_format or "").lower()
            # OpenFF é strict com estereoquímica: se não veio explicitamente como False,
            # permite stereo indefinida (inferida das coordenadas 3D pelo OpenFF).
            kwargs.setdefault("allow_undefined_stereo", True)

            if fn.lower().endswith(".mol2") or fmt == "mol2":
                # Resolve path absoluto: MDSimulator passa paths relativos ao CWD (dh_dir)
                abs_fn = fn if Path(fn).is_absolute() else str(Path(dh_dir) / fn)
                _rdmol = _RDChem.MolFromMol2File(abs_fn, removeHs=False)
                if _rdmol is not None:
                    _sdf_tmp = abs_fn.rsplit(".", 1)[0] + "_openff_compat.sdf"
                    _w = _RDChem.SDWriter(_sdf_tmp)
                    _w.write(_rdmol)
                    _w.close()
                    emit({"type": "log", "msg": f"OpenFF patch: mol2→sdf via RDKit: {Path(_sdf_tmp).name}"})
                    return _orig_off_from_file(_sdf_tmp, file_format="sdf", **kwargs)
            return _orig_off_from_file(filename, file_format=file_format, **kwargs)

        _OFFMolecule.from_file = _off_from_file_patched
        emit({"type": "log", "msg": "Patch OpenFF Molecule.from_file: mol2→sdf via RDKit ativado"})

        # ── Patch assign_partial_charges: AM1-BCC → MMFF94 fallback ─────────
        # AM1-BCC requer antechamber (AmberTools) com $AMBERHOME configurado.
        # Se não disponível, usamos MMFF94 via RDKit como fallback.
        _orig_assign_partial_charges = _OFFMolecule.assign_partial_charges

        def _patched_assign_partial_charges(mol_self, partial_charge_method, **kwargs):
            try:
                return _orig_assign_partial_charges(mol_self, partial_charge_method, **kwargs)
            except Exception as _charge_err:
                if partial_charge_method == "am1bcc":
                    emit({"type": "warn", "msg": (
                        f"AM1-BCC falhou ({type(_charge_err).__name__}): antechamber/AmberTools "
                        "não está configurado ($AMBERHOME). Usando MMFF94 via RDKit como fallback. "
                        "Para cargas AM1-BCC precisas, configure o AmberTools no ambiente DrugHunter."
                    )})
                    try:
                        return _orig_assign_partial_charges(mol_self, "mmff94", **kwargs)
                    except Exception as _mmff_err:
                        emit({"type": "warn", "msg": f"MMFF94 também falhou ({_mmff_err}). Tentando gasteiger."})
                        return _orig_assign_partial_charges(mol_self, "gasteiger", **kwargs)
                raise

        _OFFMolecule.assign_partial_charges = _patched_assign_partial_charges
        emit({"type": "log", "msg": "Patch OpenFF assign_partial_charges: AM1-BCC→MMFF94 fallback ativado"})

    except Exception as _e:
        emit({"type": "warn", "msg": f"Patch OpenFF mol2 falhou (continuando): {_e}"})

    # ── Patch subprocess.run: substitui obabel por RDKit ─────────────────────
    # prepare_ligand() no DrugHunter chama:
    #   obabel -i pdb -o mol <input_fixed.pdb> -O <output.mol>
    # Se obabel não estiver instalado, o .mol nunca é criado mas lig_mol_file
    # já é setado para ele, causando OSError no build_forcefield_system.
    # Interceptamos subprocess.run para fazer a conversão PDB→MOL com RDKit.
    import subprocess as _sp_mod
    _orig_sp_run = _sp_mod.run

    def _patched_sp_run(cmd, **kwargs):
        # ── Antechamber: remove flags não suportados em versões antigas ───────
        # OpenFF decide quais flags usar com base na versão cacheada do antechamber.
        # Se o stub retornou uma versão alta demais, flags como -dr podem não ser
        # reconhecidos pelo binário real. Removemos -dr da lista de argumentos.
        if isinstance(cmd, (list, tuple)) and cmd and "antechamber" in str(cmd[0]):
            cmd = [c for i, c in enumerate(cmd)
                   if c != "-dr" and (i == 0 or cmd[i - 1] != "-dr")]
            return _orig_sp_run(cmd, **kwargs)

        cmd_str = cmd if isinstance(cmd, str) else " ".join(str(c) for c in cmd)
        if "obabel" in cmd_str:
            # ── Tenta obabel nativo primeiro ─────────────────────────────────
            result = _orig_sp_run(cmd, **kwargs)

            # Verifica se o arquivo de saída foi realmente gerado
            try:
                import shlex as _shlex
                parts = _shlex.split(cmd_str)
                o_idx = next((i for i, p in enumerate(parts) if p == "-O"), None)
                if o_idx is not None and o_idx + 1 < len(parts):
                    output_mol = parts[o_idx + 1]
                    cwd = kwargs.get("cwd") or os.getcwd()
                    if not Path(cwd).is_absolute():
                        cwd = str(Path(os.getcwd()) / cwd)
                    abs_output = str(Path(cwd) / output_mol) if not Path(output_mol).is_absolute() else output_mol
                    if Path(abs_output).exists():
                        emit({"type": "log", "msg": f"obabel: conversão PDB→MOL concluída (nativo)"})
                        return result
            except Exception:
                pass

            # ── Fallback: RDKit (obabel não está instalado ou falhou) ─────────
            emit({"type": "warn", "msg": "obabel não encontrado ou falhou — usando RDKit como fallback (instale obabel no env DH para melhor precisão)"})
            try:
                import shlex as _shlex
                from rdkit import Chem as _RDChem2

                parts = _shlex.split(cmd_str)
                o_idx = next((i for i, p in enumerate(parts) if p == "-O"), None)
                if o_idx is None or o_idx + 1 >= len(parts):
                    raise ValueError("Flag -O não encontrada no comando obabel")
                output_mol = parts[o_idx + 1]

                skip_next = False
                input_pdb = None
                for i, part in enumerate(parts[1:], 1):
                    if skip_next:
                        skip_next = False
                        continue
                    if part in ("-i", "-o", "-O"):
                        skip_next = True
                        continue
                    if not part.startswith("-"):
                        input_pdb = part
                        break

                if input_pdb is None:
                    raise ValueError("Arquivo PDB de entrada não encontrado no comando obabel")

                cwd = kwargs.get("cwd") or os.getcwd()
                if not Path(cwd).is_absolute():
                    cwd = str(Path(os.getcwd()) / cwd)
                abs_input  = str(Path(cwd) / input_pdb)  if not Path(input_pdb).is_absolute()  else input_pdb
                abs_output = str(Path(cwd) / output_mol) if not Path(output_mol).is_absolute() else output_mol

                rdmol = _RDChem2.MolFromPDBFile(abs_input, removeHs=False)
                if rdmol is None:
                    raise ValueError(f"RDKit não conseguiu ler PDB: {abs_input}")

                _RDChem2.MolToMolFile(rdmol, abs_output)
                emit({"type": "log", "msg": f"obabel fallback: PDB→MOL via RDKit: {Path(abs_output).name}"})
                import subprocess as _sp_inner
                return _sp_inner.CompletedProcess(args=cmd, returncode=0, stdout=b"", stderr=b"")
            except Exception as _rdkit_err:
                emit({"type": "warn", "msg": f"Fallback RDKit também falhou: {_rdkit_err}"})

        return _orig_sp_run(cmd, **kwargs)

    _sp_mod.run = _patched_sp_run
    emit({"type": "log", "msg": "Patch subprocess.run: obabel→RDKit ativado"})

    # ── Executa simulação ─────────────────────────────────────────────────────
    try:
        md = MDSimulator(
            ligand_input_path=ligand_for_md,
            receptor_input_path=receptor_for_md,
            output_path=output_for_md,
        )

        md.prepare_ligand()

        md.prepare_receptor(keepWater=p.get("receptor_keepWater", False))

        md.build_forcefield_system(
            constraints=constraints,
            protein_forcefield_xml=protein_ff,
            solvent_forcefield_xml=solvent_ff,
            ligand_forcefield=ligand_ff,
            rigidWater=p.get("rigidWater", True),
            removeCMMotion=p.get("removeCMMotion", True),
            use_periodic_boundary=p.get("use_periodic_boundary", True),
            nonbondedCutoff=cutoff,
            ewaldErrorTolerance=p.get("ewaldErrorTolerance", 5e-4),
            useDispersionCorrection=p.get("useDispersionCorrection", True),
            use_HMR=p.get("use_HMR", False),
            hydrogenMass=hydrogen_mass,
            barostat_pressure=baro_pressure,
            barostat_frequency=p.get("barostat_frequency", 25),
            simulation_temperature=sim_temp,
        )

        md.build_complex_and_solvation(
            ph_value=p.get("ph_value", 7.4),
            padding_value=padding,
            ionic_strength=ionic,
            neutralize=p.get("neutralize", True),
            platform_name=platform,
            solvatation=p.get("solvatation", True),
            water_model=water_model,
            box_shape=p.get("box_shape", "dodecahedron"),
        )

        md.md_simulation(
            simulation_temperature=sim_temp,
            friction_coeff=friction,
            integration_step=integ_step,
            production_duration_ns=p.get("production_duration_ns", 50.0),
            platform_name=platform,
            equilibration_duration_steps=p.get("equilibration_duration_steps", 100000),
            integrator_tolerance=p.get("integrator_tolerance", 1e-5),
            reporting_interval_steps=p.get("reporting_interval_steps", 1000),
            checkpoint_interval_steps=p.get("checkpoint_interval_steps", 1000),
            enforcePeriodicBox=p.get("enforcePeriodicBox_dcd", True),
            externalForce_constrain=extforce,
            restraint_target_atoms=p.get("restraint_target_atoms", ["CA", "N", "C", "O"]),
            restraint_axes=p.get("restraint_axes", ["x", "y", "z"]),
            standard_amino_acids=p.get("standard_amino_acids", [
                "ALA", "ARG", "ASN", "ASP", "CYS", "GLU", "GLN", "GLY", "HIS",
                "ILE", "LEU", "LYS", "MET", "PHE", "PRO", "SER", "THR", "TRP",
                "TYR", "VAL",
            ]),
            removeCMMotion=p.get("removeCMMotion", True),
            seed=p.get("seed", 73),
        )

        md.cleanup()
        del md

    except Exception as exc:
        emit({"type": "error", "msg": f"Erro na simulação: {exc}"})
        sys.exit(1)

    emit({"type": "done"})


if __name__ == "__main__":
    main()
