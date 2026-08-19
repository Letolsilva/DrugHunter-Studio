"""
Script executado via subprocesso com o Python do DrugHunter.

Recebe configuração do alvo via JSON em argv[1] e imprime eventos de progresso
como JSON lines no stdout. Código de saída 0 = sucesso, 1 = erro.

Convenção de paths do DrugHunter:
  - Todos os paths são relativos ao dh_dir (cwd), com barra inicial.
  - Ex: "/resultados/chembl/ERG11/targets/" → cwd + path
  - Cada etapa usa um subdiretório separado.
"""
import json
import os
import sys


def emit(msg: dict):
    print(json.dumps(msg, ensure_ascii=False), flush=True)


def _rel(dh_dir: str, abs_path: str) -> str:
    """Retorna path relativo ao dh_dir com barra inicial (ex: '/resultados/foo/')."""
    rel = os.path.relpath(abs_path, dh_dir)
    return "/" + rel + "/"


def _clean(f: dict) -> dict:
    """Remove valores vazios; mantém os nomes de campo exatamente como o DH espera."""
    return {k: v for k, v in f.items() if v is not None and v != "" and v != []}


def _clean_target(target_name: str, f: dict) -> dict:
    """
    Limpa e converte filtros de target para o formato que o cliente ChEMBL aceita.

    Conversões necessárias (filtros com lista Python não funcionam no cliente):
    - type__in: ["SINGLE PROTEIN"] → target_type: "SINGLE PROTEIN"
    - organism: "..." → organism__icontains: "..." (ChEMBL armazena com strain completo)

    Se target_name é um ID ChEMBL (ex: CHEMBL1780), o filtro de organismo é removido
    para não bloquear alvos de organismos não-humanos.
    """
    out = _clean(f)

    # type__in com lista Python é silenciosamente ignorado pelo cliente ChEMBL;
    # converte para target_type (match exato)
    if "type__in" in out:
        types = out.pop("type__in")
        if types:
            out["target_type"] = types[0]

    # relationship_type não é um filtro válido no endpoint de target — remove
    out.pop("relationship_type", None)

    if target_name.upper().startswith("CHEMBL"):
        out.pop("organism", None)
    elif "organism" in out:
        out["organism__icontains"] = out.pop("organism")

    return out


def main():
    if len(sys.argv) < 2:
        emit({"type": "error", "msg": "Uso: _dh_chembl_worker.py <json_args>"})
        sys.exit(1)

    try:
        args = json.loads(sys.argv[1])
    except json.JSONDecodeError as exc:
        emit({"type": "error", "msg": f"Args JSON inválido: {exc}"})
        sys.exit(1)

    dh_dir = args["dh_dir"]
    target_name = args["target_name"]
    output_path = args["output_path"]   # caminho absoluto para a pasta do alvo
    target_filters = args.get("target_filters", {})
    bioact_filters = args.get("bioact_filters", {})
    mol_filters = args.get("mol_filters", {})
    sim_filters = args.get("sim_filters", {})

    # Configura o ambiente DrugHunter
    src_path = os.path.join(dh_dir, "src")
    if src_path not in sys.path:
        sys.path.insert(0, src_path)
    os.chdir(dh_dir)

    # Paths relativos ao dh_dir (cwd), com barra inicial e final
    targets_dir = _rel(dh_dir, os.path.join(output_path, "targets"))
    bioact_dir  = _rel(dh_dir, os.path.join(output_path, "bioatividades"))
    mols_dir    = _rel(dh_dir, os.path.join(output_path, "moleculas"))
    sims_dir    = _rel(dh_dir, os.path.join(output_path, "similares"))

    try:
        # ── Etapa 1: Targets ───────────────────────────────────────────────────
        emit({"type": "etapa", "etapa": "targets"})
        from crawlers.targets import Targets
        t = Targets()
        t.set_outputpath(targets_dir)

        t.search(target_name, _clean_target(target_name, target_filters))

        targets_csv = dh_dir + targets_dir + target_name.upper() + ".csv"

        if not os.path.exists(targets_csv):
            emit({"type": "error", "msg": (
                f"Nenhum alvo encontrado no ChEMBL para '{target_name}'. "
                "Verifique o nome do alvo e os filtros (organismo, tipo de alvo)."
            )})
            sys.exit(1)

        # ── Etapa 2: Bioatividades ─────────────────────────────────────────────
        emit({"type": "etapa", "etapa": "bioatividades"})
        from crawlers.bioactivities import Bioactivity
        b = Bioactivity()
        b.set_targetpath(targets_dir)
        b.set_outputpath(bioact_dir)
        # molecule_type não é filtro válido no endpoint de bioatividade (é pós-filtro do DH)
        # standard_type__in com lista é suportado pelo cliente ChEMBL via lookup __in
        bioact_clean = {k: v for k, v in _clean(bioact_filters).items() if k != "molecule_type"}
        b.search(target_name, bioact_clean)

        bioact_files = [f for f in os.listdir(dh_dir + bioact_dir) if f.endswith(".csv")]
        if not bioact_files:
            emit({"type": "error", "msg": (
                f"Nenhuma bioatividade encontrada para '{target_name}'. "
                "Verifique os filtros: standard_type (ex: Ki, IC50), standard_units (nM), max_value_ref. "
                "Logs do DrugHunter: " + dh_dir + "/logs/bioactivities.log"
            )})
            sys.exit(1)

        # ── Etapa 3: Moléculas ────────────────────────────────────────────────
        emit({"type": "etapa", "etapa": "moleculas"})
        from crawlers.molecules import Molecule
        m = Molecule()
        m.set_bioactivitypath(bioact_dir)
        m.set_outputpath(mols_dir)
        m.search(_clean(mol_filters))

        mol_count = len([
            f for f in os.listdir(dh_dir + mols_dir) if f.endswith(".csv")
        ])

        # ── Etapa 4: Moléculas similares ──────────────────────────────────────
        emit({"type": "etapa", "etapa": "similares"})
        from crawlers.molecules import SimilarMols
        s = SimilarMols()
        s.set_bioactivitypath(bioact_dir)
        s.set_outputpath(sims_dir)
        s.search(_clean(sim_filters))

        emit({"type": "done", "molecules_count": mol_count})

    except Exception as exc:
        emit({"type": "error", "msg": str(exc)})
        sys.exit(1)


if __name__ == "__main__":
    main()
