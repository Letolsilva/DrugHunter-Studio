"""
Script executado via subprocesso com o Python do DrugHunter.

Recebe configuração via JSON em argv[1].
Responsabilidades:
  1. Garantir que os fingerprints existam (computa via Descriptors se não existirem)
  2. Garantir que o CSV de moléculas existe no formato esperado pelo DH
  3. Chamar perform_clustering(base_input_path, base_output_path, fingerprint)
  4. Emitir evento {"type": "done", "n_clusters": k, "silhouette": score}

Paths: DH usa Path.cwd() + path[1:], portanto todos os paths têm '/' no início
e o worker roda com cwd=dh_dir.
"""
import json
import os
import re
import sys
from pathlib import Path


def emit(msg: dict):
    print(json.dumps(msg, ensure_ascii=False), flush=True)


def main():
    if len(sys.argv) < 2:
        emit({"type": "error", "msg": "Uso: _dh_clustering_worker.py <json_args>"})
        sys.exit(1)

    try:
        args = json.loads(sys.argv[1])
    except json.JSONDecodeError as exc:
        emit({"type": "error", "msg": f"Args JSON inválido: {exc}"})
        sys.exit(1)

    dh_dir           = args["dh_dir"]
    admet_csv_path   = args["admet_csv_path"]   # caminho absoluto do CSV de moléculas
    target           = args["target"]            # nome do alvo (ex: Butyrylcholinesterase)
    base_input_path  = args["base_input_path"]   # DH-relative, ex: /resultados/maia_input
    base_output_path = args["base_output_path"]  # DH-relative, ex: /resultados/clustering
    fingerprint_type = args.get("fingerprint_type", "morgan")
    max_mols         = args.get("max_mols")      # int ou None

    src_path = os.path.join(dh_dir, "src")
    if src_path not in sys.path:
        sys.path.insert(0, src_path)
    os.chdir(dh_dir)

    # ── Importa módulos do DrugHunter ─────────────────────────────────────────
    try:
        from kernel.descriptors import Descriptors, fingerprints as FP
        from wrappers.molecular_ai_analyzer import perform_clustering
    except ImportError as exc:
        emit({"type": "error", "msg": f"Não foi possível carregar o módulo de clustering do DrugHunter. Verifique se o ambiente conda está ativo. Detalhe: {exc}"})
        sys.exit(1)

    # ── Mapeia fingerprint_type para o enum do DH ────────────────────────────
    fp_map = {
        "morgan": FP.Morgan,
        "maccs": FP.MACCs,
        "pharmacophore": FP.Pharmacophore,
    }
    fp_enum = fp_map.get(fingerprint_type.lower(), FP.Morgan)

    # Caminhos absolutos (dh_dir + relative sem '/')
    abs_input = Path(dh_dir) / base_input_path.lstrip("/")
    fingerprints_dir = abs_input / "Fingerprints"
    fingerprint_csv = fingerprints_dir / f"{fp_enum.value}_{target}.csv"
    mol_csv = abs_input / f"{target}.csv"

    # ── Garante Fingerprints/ ─────────────────────────────────────────────────
    fingerprints_dir.mkdir(parents=True, exist_ok=True)

    # ── Computa fingerprints se não existem ──────────────────────────────────
    # Quando max_mols está definido, o subconjunto de moléculas pode variar entre
    # execuções, então sempre recomputamos para garantir consistência com mol_csv.
    if max_mols and max_mols > 0 and fingerprint_csv.exists():
        fingerprint_csv.unlink()
        emit({"type": "log", "msg": f"max_mols={max_mols}: cache de fingerprints removido para recomputar com subconjunto."})

    if not fingerprint_csv.exists():
        emit({"type": "log", "msg": f"Computando fingerprints para {target}..."})
        try:
            import pandas as pd
            from rdkit import Chem
            from rdkit.Chem import AllChem, Descriptors as RDKitDesc

            mols = pd.read_csv(admet_csv_path)
            mols.columns = [c.lower() for c in mols.columns]
            if "canonical_smiles" not in mols.columns or "molecule_chembl_id" not in mols.columns:
                emit({"type": "error", "msg": "CSV de moléculas não tem canonical_smiles/molecule_chembl_id"})
                sys.exit(1)

            # Aplica limite max_mols antes de computar fingerprints.
            # Seleciona as N menores por MW (Lipinski — moléculas menores = melhores leads).
            total_before = len(mols)
            if max_mols and max_mols > 0 and total_before > max_mols:
                if "mw" in mols.columns:
                    mols = mols.nsmallest(max_mols, "mw").reset_index(drop=True)
                else:
                    # Calcula MW via RDKit para poder ordenar
                    mols = mols.dropna(subset=["canonical_smiles"]).copy()
                    mols["_mw"] = mols["canonical_smiles"].apply(
                        lambda s: RDKitDesc.MolWt(Chem.MolFromSmiles(s)) if Chem.MolFromSmiles(s) else float("inf")
                    )
                    mols = mols.nsmallest(max_mols, "_mw").drop(columns=["_mw"]).reset_index(drop=True)
                emit({"type": "log", "msg": f"max_mols={max_mols}: selecionadas {len(mols)} de {total_before} moléculas por MW"})


            # Computa Morgan fingerprints em loop simples, sem multiprocessing.
            # O get_fingerprints do DH usa Pool.starmap internamente; dentro de um
            # subprocess os objetos Boost.Python do RDKit não podem ser serializados,
            # causando PicklingError. Replicamos o mesmo cálculo sem pool.
            RADIUS, N_BITS = 2, 2048
            results = []
            for row in mols[["molecule_chembl_id", "canonical_smiles"]].itertuples(index=False):
                mol = Chem.MolFromSmiles(row.canonical_smiles)
                if mol is None:
                    continue
                fp = list(AllChem.GetMorganFingerprintAsBitVect(
                    mol, RADIUS, nBits=N_BITS,
                    useChirality=True, useBondTypes=False, useFeatures=True,
                ))
                results.append({"molecule_chembl_id": row.molecule_chembl_id, "fingerprint": fp})

            if not results:
                emit({"type": "error", "msg": "Nenhum fingerprint foi gerado (todas as SMILES inválidas?)."})
                sys.exit(1)

            fp_df = pd.DataFrame(results)
            fp_df.to_csv(str(fingerprint_csv), index=False)
            emit({"type": "log", "msg": f"Fingerprints salvos em {fingerprint_csv} ({len(fp_df)} moléculas)"})
        except Exception as exc:
            emit({"type": "error", "msg": f"Erro ao computar fingerprints: {exc}"})
            sys.exit(1)
    else:
        emit({"type": "log", "msg": f"Fingerprints já existem em {fingerprint_csv} — reutilizando"})

    # ── Garante CSV de moléculas no base_input_path ──────────────────────────
    # Sempre remove o mol_csv para garantir que o subconjunto correto seja
    # recriado — em especial quando o limite muda entre execuções.
    if mol_csv.exists():
        mol_csv.unlink()

    if not mol_csv.exists():
        try:
            import pandas as pd
            from rdkit import Chem
            from rdkit.Chem import Descriptors as RDKitDesc
            mols_for_csv = pd.read_csv(admet_csv_path)
            mols_for_csv.columns = [c.lower() for c in mols_for_csv.columns]
            if max_mols and max_mols > 0 and len(mols_for_csv) > max_mols:
                if "mw" in mols_for_csv.columns:
                    mols_for_csv = mols_for_csv.nsmallest(max_mols, "mw").reset_index(drop=True)
                else:
                    mols_for_csv = mols_for_csv.dropna(subset=["canonical_smiles"]).copy()
                    mols_for_csv["_mw"] = mols_for_csv["canonical_smiles"].apply(
                        lambda s: RDKitDesc.MolWt(Chem.MolFromSmiles(s)) if Chem.MolFromSmiles(s) else float("inf")
                    )
                    mols_for_csv = mols_for_csv.nsmallest(max_mols, "_mw").drop(columns=["_mw"]).reset_index(drop=True)
            mols_for_csv[["molecule_chembl_id", "canonical_smiles"]].to_csv(str(mol_csv), index=False)
            emit({"type": "log", "msg": f"Moléculas salvas em {mol_csv}"})
        except Exception as exc:
            emit({"type": "error", "msg": f"Erro ao preparar CSV de moléculas: {exc}"})
            sys.exit(1)

    # ── Executa clustering ─────────────────────────────────────────────────────
    emit({"type": "start", "msg": f"Iniciando clustering para {target} ({fp_enum.value})..."})
    try:
        perform_clustering(base_input_path, base_output_path, fp_enum)
    except Exception as exc:
        emit({"type": "error", "msg": f"Erro em perform_clustering: {exc}"})
        sys.exit(1)

    # ── Lê kmeans.txt para extrair n_clusters e silhouette ────────────────────
    result_dir = Path(dh_dir) / base_output_path.lstrip("/") / target
    kmeans_txt = result_dir / "data" / "kmeans.txt"
    n_clusters = None
    silhouette = None
    try:
        if kmeans_txt.exists():
            # Formato: "KMeans score using {k} clusters: {score} for {filename}"
            pattern = re.compile(r"KMeans score using (\d+) clusters: ([\d.eE+\-]+)")
            last_match = None
            for line in kmeans_txt.read_text().splitlines():
                m = pattern.search(line)
                if m:
                    last_match = m
            if last_match:
                n_clusters = int(last_match.group(1))
                silhouette = float(last_match.group(2))
    except Exception:
        pass

    # ── Gera tsne_data.json com coordenadas para visualização interativa ──────
    try:
        import ast
        import json as _json
        import numpy as np
        import pandas as pd
        from sklearn.manifold import TSNE

        fp_df = pd.read_csv(str(fingerprint_csv))
        fp_df["fingerprint"] = fp_df["fingerprint"].apply(ast.literal_eval)

        labels_csv = result_dir / "data" / f"{fp_enum.value}_{target}.csv"
        if labels_csv.exists():
            labels_df = pd.read_csv(str(labels_csv))
            merged = fp_df.merge(
                labels_df[["molecule_chembl_id", "canonical_smiles", "label"]],
                on="molecule_chembl_id",
                how="inner",
            )
            X = np.vstack(merged["fingerprint"].values)
            tsne = TSNE(n_components=2, random_state=73)
            coords = tsne.fit_transform(X)
            records = []
            for i, row in enumerate(merged.itertuples(index=False)):
                records.append({
                    "id": row.molecule_chembl_id,
                    "smiles": row.canonical_smiles,
                    "label": int(row.label),
                    "x": float(coords[i, 0]),
                    "y": float(coords[i, 1]),
                })
            tsne_json_path = result_dir / "data" / "tsne_data.json"
            tsne_json_path.write_text(_json.dumps(records, ensure_ascii=False))
            emit({"type": "log", "msg": f"tsne_data.json salvo com {len(records)} pontos."})
    except Exception as exc:
        emit({"type": "warn", "msg": f"Falha ao gerar tsne_data.json (PNG estático continua disponível): {exc}"})

    emit({
        "type": "done",
        "n_clusters": n_clusters,
        "silhouette": silhouette,
    })


if __name__ == "__main__":
    main()
