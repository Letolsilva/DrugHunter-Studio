"""
Script executado via subprocesso com o Python do DrugHunter.

Recebe configuração via JSON em argv[1] e imprime eventos de progresso
como JSON lines no stdout. Código de saída 0 = sucesso, 1 = erro.

Usa as classes reais do DrugHunter (MoleculeEvaluator, BoiledEggPlotter)
da mesma forma que o ADMETWrapper, mas com controle total dos paths e
salvando também as moléculas tóxicas em _toxic.csv.
"""
import json
import os
import sys


def emit(msg: dict):
    print(json.dumps(msg, ensure_ascii=False), flush=True)


def main():
    if len(sys.argv) < 2:
        emit({"type": "error", "msg": "Uso: _dh_admet_worker.py <json_args>"})
        sys.exit(1)

    try:
        args = json.loads(sys.argv[1])
    except json.JSONDecodeError as exc:
        emit({"type": "error", "msg": f"Args JSON inválido: {exc}"})
        sys.exit(1)

    dh_dir = args["dh_dir"]
    input_dir = args["input_dir"]    # caminho absoluto para DrugBank/ ou bioatividades/ (legado)
    output_dir = args["output_dir"]  # caminho absoluto para ADMET/
    stem = args["stem"]              # nome base para os arquivos de saída

    # Configura o ambiente DrugHunter (igual ao _dh_chembl_worker.py)
    src_path = os.path.join(dh_dir, "src")
    if src_path not in sys.path:
        sys.path.insert(0, src_path)
    os.chdir(dh_dir)

    # kernel.header_builder não existe nesta instalação do DrugHunter —
    # é usado apenas para gerar __doc__ strings. Importamos o pacote kernel
    # real (namespace package Python 3) e injetamos apenas o sub-módulo faltante.
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
        import pandas as pd
        from caad.admet import MoleculeEvaluator, BoiledEggPlotter
    except ImportError as exc:
        emit({"type": "error", "msg": f"Não foi possível carregar o módulo ADMET do DrugHunter. Verifique se o ambiente conda está ativo. Detalhe: {exc}"})
        sys.exit(1)

    os.makedirs(output_dir, exist_ok=True)

    # Carrega moléculas: prefere {stem}_FULL.csv do DrugBank (criado pelo prepare_datamols),
    # com fallback para todos os CSVs da pasta (legado: bioatividades/).
    emit({"type": "etapa", "etapa": "carregando"})
    from pathlib import Path
    full_csv = Path(input_dir) / f"{stem}_FULL.csv"
    if full_csv.exists():
        csv_files = [full_csv]
    else:
        csv_files = list(Path(input_dir).glob("*.csv"))
    if not csv_files:
        emit({"type": "error", "msg": "Nenhum dado ChEMBL encontrado para análise. Execute o pipeline ChEMBL antes de rodar o ADMET."})
        sys.exit(1)

    frames = []
    for f in csv_files:
        try:
            df = pd.read_csv(f)
            cols = [c for c in ["molecule_chembl_id", "canonical_smiles"] if c in df.columns]
            if len(cols) == 2:
                frames.append(df[cols])
        except Exception:
            pass

    if not frames:
        emit({"type": "error", "msg": "Não foi possível ler os CSVs de entrada."})
        sys.exit(1)

    df_all = (
        pd.concat(frames, ignore_index=True)
        .drop_duplicates(subset=["canonical_smiles"])
        .dropna(subset=["canonical_smiles"])
        .reset_index(drop=True)
    )

    # Avalia moléculas usando o DrugHunter real
    emit({"type": "etapa", "etapa": "avaliando"})
    evaluator = MoleculeEvaluator()
    rows = []
    toxic_rows = []

    for _, row in df_all.iterrows():
        smiles = row["canonical_smiles"]
        name = row["molecule_chembl_id"]

        props = evaluator.calculate_properties(smiles)
        if props is None:
            continue

        if evaluator.is_toxic(props["Mol"]):
            toxic_rows.append({"molecule_chembl_id": name, "canonical_smiles": smiles})
            continue

        tpsa = props["TPSA"]
        logp = props["WLOGP"]
        mw   = props["MW"]
        hbd  = props["HBD"]
        hba  = props["HBA"]
        rb   = props["RB"]

        bbb = evaluator.classify_bbb(tpsa, logp, mw, hbd, rb)
        hia = evaluator.classify_hia(tpsa, logp)
        pgp = evaluator.predict_pgp(mw, tpsa, logp, hbd)

        rows.append({
            "canonical_smiles": smiles,
            "molecule_chembl_id": name,
            "TPSA": tpsa,
            "WLOGP": logp,
            "MW": mw,
            "HBD": hbd,
            "HBA": hba,
            "RB": rb,
            "BBB": bbb,
            "HIA": hia,
            "PGP": pgp,
        })

    results = pd.DataFrame(rows)
    df_toxic = pd.DataFrame(toxic_rows)

    # Salva CSVs de resultado com paths absolutos
    emit({"type": "etapa", "etapa": "salvando"})
    results.to_csv(os.path.join(output_dir, f"{stem}.csv"), index=False)

    for col, val, suffix in [
        ("BBB", "BBB+", "_BBBplus"),
        ("BBB", "BBB-", "_BBBminus"),
        ("HIA", "HIA+", "_HIAplus"),
    ]:
        sub = results[results[col] == val]
        sub.to_csv(os.path.join(output_dir, f"{stem}{suffix}.csv"), index=False)

    if not df_toxic.empty:
        df_toxic.to_csv(os.path.join(output_dir, f"{stem}_toxic.csv"), index=False)

    # Gera o BOILED-Egg usando o BoiledEggPlotter do DrugHunter.
    # O plotter constrói: str(Path.cwd()) + output_path + output_image_file
    # Passamos o path relativo ao dh_dir (cwd) com barra inicial e final.
    emit({"type": "etapa", "etapa": "grafico"})
    rel_output = "/" + os.path.relpath(output_dir, dh_dir) + "/"
    BoiledEggPlotter.plot(results, rel_output, f"{stem}_egg.png")

    emit({
        "type": "done",
        "total_molecules": int(len(df_all)),
        "excluded_toxic": int(len(toxic_rows)),
        "bbb_plus": int((results["BBB"] == "BBB+").sum()) if not results.empty else 0,
        "bbb_minus": int((results["BBB"] == "BBB-").sum()) if not results.empty else 0,
        "hia_plus": int((results["HIA"] == "HIA+").sum()) if not results.empty else 0,
        "pgp_plus": int((results["PGP"] == "PGP+").sum()) if not results.empty else 0,
    })


if __name__ == "__main__":
    main()
