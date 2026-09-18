"""
Script executado via subprocesso com o Python do DrugHunter.

Consolida os dados de bioatividades/similares e executa:
  1. generate_fingerprints — gera fingerprints moleculares
  2. compute_similarity    — calcula similaridade entre moléculas
  3. analyze_graphs        — análise de redes moleculares

Recebe configuração via JSON em argv[1].
"""
import ast
import json
import os
import sys


def emit(msg: dict):
    print(json.dumps(msg, ensure_ascii=False), flush=True)


def _extract_smiles_from_structures(val):
    """Extrai canonical_smiles da coluna molecule_structures (string de dict)."""
    if isinstance(val, dict):
        return val.get("canonical_smiles") or val.get("smiles")
    if isinstance(val, str):
        try:
            d = ast.literal_eval(val)
            return d.get("canonical_smiles") or d.get("smiles")
        except Exception:
            pass
    return None


def _build_mols_csv(bioact_dir: str, target_name: str, analysis_dir: str) -> bool:
    """
    Cria {target}_MOLS.csv a partir dos CSVs de bioatividades.
    Retorna True se ao menos uma linha foi salva.
    """
    import pandas as pd

    dfs = []
    if os.path.isdir(bioact_dir):
        for fname in os.listdir(bioact_dir):
            if not fname.endswith(".csv"):
                continue
            try:
                df = pd.read_csv(os.path.join(bioact_dir, fname))
                if "molecule_chembl_id" in df.columns and "canonical_smiles" in df.columns:
                    dfs.append(df[["molecule_chembl_id", "canonical_smiles"]].dropna())
            except Exception:
                pass

    if not dfs:
        return False

    merged = pd.concat(dfs, ignore_index=True).drop_duplicates(subset=["molecule_chembl_id"])
    merged = merged[merged["canonical_smiles"].str.strip() != ""]
    if merged.empty:
        return False

    merged.to_csv(os.path.join(analysis_dir, f"{target_name}_MOLS.csv"), index=False)
    return True


def _build_sims_csv(sims_dir: str, target_name: str, analysis_dir: str) -> bool:
    """
    Cria {target}_SIMS.csv a partir dos CSVs de similares.
    Extrai canonical_smiles de dentro da coluna molecule_structures.
    Retorna True se ao menos uma linha foi salva.
    """
    import pandas as pd

    rows = []
    if os.path.isdir(sims_dir):
        for fname in os.listdir(sims_dir):
            if not fname.endswith(".csv"):
                continue
            try:
                df = pd.read_csv(os.path.join(sims_dir, fname))
                # SMILES pode ser coluna direta ou aninhada em molecule_structures
                if "canonical_smiles" in df.columns:
                    sub = df[["molecule_chembl_id", "canonical_smiles"]].dropna()
                elif "molecule_structures" in df.columns:
                    df["canonical_smiles"] = df["molecule_structures"].apply(
                        _extract_smiles_from_structures
                    )
                    sub = df[["molecule_chembl_id", "canonical_smiles"]].dropna()
                elif "smiles" in df.columns:
                    df = df.rename(columns={"smiles": "canonical_smiles"})
                    sub = df[["molecule_chembl_id", "canonical_smiles"]].dropna()
                else:
                    continue
                rows.append(sub)
            except Exception:
                pass

    if not rows:
        return False

    merged = pd.concat(rows, ignore_index=True).drop_duplicates(subset=["molecule_chembl_id"])
    merged = merged[merged["canonical_smiles"].str.strip() != ""]
    if merged.empty:
        return False

    merged.to_csv(os.path.join(analysis_dir, f"{target_name}_SIMS.csv"), index=False)
    return True


def _rel(dh_dir: str, abs_path: str) -> str:
    """Retorna path relativo ao dh_dir com barra inicial (convenção DH)."""
    rel = os.path.relpath(abs_path, dh_dir)
    return "/" + rel + "/"


def main():
    if len(sys.argv) < 2:
        emit({"type": "error", "msg": "Uso: _dh_analysis_worker.py <json_args>"})
        sys.exit(1)

    try:
        args = json.loads(sys.argv[1])
    except json.JSONDecodeError as exc:
        emit({"type": "error", "msg": f"Args JSON inválido: {exc}"})
        sys.exit(1)

    dh_dir = args["dh_dir"]
    chembl_output = args["chembl_output"]   # {base_output_path}/ChEMBL
    fingerprint_name = args.get("fingerprint", "morgan").lower()
    metric_name = args.get("metric", "Tanimoto")

    os.chdir(dh_dir)
    src_path = os.path.join(dh_dir, "src")
    if src_path not in sys.path:
        sys.path.insert(0, src_path)

    try:
        from kernel.descriptors import similarityFunctions, fingerprints as fp_enum
    except Exception as exc:
        emit({"type": "error", "msg": f"Erro ao importar DrugHunter: {exc}"})
        sys.exit(1)

    fp_map = {
        "morgan":       (fp_enum.Morgan,        True,  False, False),
        "maccs":        (fp_enum.MACCs,         False, True,  False),
        "pharmacophore":(fp_enum.Pharmacophore, False, False, True),
    }
    metric_map = {
        "Tanimoto":        similarityFunctions.TanimotoSimilarity,
        "Dice":            similarityFunctions.DiceSimilarity,
        "Cosine":          similarityFunctions.CosineSimilarity,
        "Sokal":           similarityFunctions.SokalSimilarity,
        "Russel":          similarityFunctions.RusselSimilarity,
        "RogotGoldberg":   similarityFunctions.RogotGoldbergSimilarity,
        "AllBit":          similarityFunctions.AllBitSimilarity,
        "Kulczynski":      similarityFunctions.KulczynskiSimilarity,
        "McConnaughey":    similarityFunctions.McConnaugheySimilarity,
        "Asymmetric":      similarityFunctions.AsymmetricSimilarity,
        "BraunBlanquet":   similarityFunctions.BraunBlanquetSimilarity,
    }

    fp_enum_val, use_morgan, use_maccs, use_pharmacophore = fp_map.get(
        fingerprint_name, fp_map["morgan"]
    )
    metric_val = metric_map.get(metric_name, similarityFunctions.TanimotoSimilarity)

    # ── Etapa 1: Consolidar dados de cada alvo ────────────────────────────────
    emit({"type": "etapa", "etapa": "consolidando"})

    analysis_dir = os.path.join(chembl_output, "analysis")
    os.makedirs(analysis_dir, exist_ok=True)

    targets_processed = 0
    if os.path.isdir(chembl_output):
        for entry in os.listdir(chembl_output):
            if entry == "analysis":
                continue
            target_dir = os.path.join(chembl_output, entry)
            if not os.path.isdir(target_dir):
                continue

            bioact_dir = os.path.join(target_dir, "bioatividades")
            sims_dir   = os.path.join(target_dir, "similares")

            built_mols = _build_mols_csv(bioact_dir, entry, analysis_dir)
            built_sims = _build_sims_csv(sims_dir, entry, analysis_dir)

            if built_mols or built_sims:
                targets_processed += 1

    if targets_processed == 0:
        emit({"type": "error", "msg": "Nenhum dado de moléculas encontrado para análise. Execute o pipeline ChEMBL primeiro."})
        sys.exit(1)

    # Verifica se há arquivos *_MOLS.csv ou *_SIMS.csv no analysis_dir
    analysis_files = [f for f in os.listdir(analysis_dir) if f.endswith("_MOLS.csv") or f.endswith("_SIMS.csv")]
    if not analysis_files:
        emit({"type": "error", "msg": "Nenhum arquivo consolidado criado. Verifique os dados de bioatividades."})
        sys.exit(1)

    rel_analysis = _rel(dh_dir, analysis_dir).rstrip("/")   # ex: /resultados/chembl/ChEMBL/analysis
    rel_fingerprints = rel_analysis + "/Fingerprints"

    # ── Etapa 2: Gerar fingerprints ───────────────────────────────────────────
    emit({"type": "etapa", "etapa": "fingerprints"})
    try:
        from wrappers.molecular_analyzer import generate_fingerprints
        generate_fingerprints(
            base_input_path=rel_analysis,
            morgan=use_morgan,
            maccs=use_maccs,
            pharmacophore=use_pharmacophore,
        )
    except Exception as exc:
        emit({"type": "error", "msg": f"Erro na geração de fingerprints: {exc}"})
        sys.exit(1)

    # Verifica se fingerprints foram criados
    fingerprints_dir = os.path.join(analysis_dir, "Fingerprints")
    if not os.path.isdir(fingerprints_dir) or not os.listdir(fingerprints_dir):
        emit({"type": "error", "msg": "Fingerprints não foram gerados. Verifique se as moléculas têm SMILES válidos."})
        sys.exit(1)

    # ── Etapa 3: Calcular similaridade ────────────────────────────────────────
    emit({"type": "etapa", "etapa": "similaridade"})
    try:
        from wrappers.molecular_analyzer import compute_similarity
        compute_similarity(
            base_input_path=rel_fingerprints,
            base_output_path=rel_analysis,
            metric=metric_val,
            fingerprint=fp_enum_val,
        )
    except Exception as exc:
        emit({"type": "error", "msg": f"Erro no cálculo de similaridade: {exc}"})
        sys.exit(1)

    # ── Etapa 4: Análise de grafos ────────────────────────────────────────────
    emit({"type": "etapa", "etapa": "grafos"})
    try:
        from wrappers.molecular_analyzer import analyze_graphs
        analyze_graphs(
            base_input_path=rel_analysis,
            base_output_path=rel_analysis,
            metric=metric_val,
            fingerprint=fp_enum_val,
        )
    except Exception as exc:
        emit({"type": "error", "msg": f"Erro na análise de grafos: {exc}"})
        sys.exit(1)

    # ── Verifica alvos sem maxcomp (falha silenciosa do DrugHunter) ───────────
    # O DrugHunter engole exceções internas (ex: MCS muito grande) sem propagar.
    # Detectamos aqui quais alvos têm Similarity mas não geraram maxcomp.
    similarity_dir = os.path.join(analysis_dir, "Similarity")
    maxcomp_dir    = os.path.join(analysis_dir, "data", "maxcomp")
    prefix = f"{metric_name}_{fingerprint_name}_"
    failed_targets = []
    if os.path.isdir(similarity_dir):
        for sim_file in os.listdir(similarity_dir):
            if not sim_file.endswith(".csv") or not sim_file.startswith(prefix):
                continue
            stem = sim_file.rsplit(".", 1)[0]
            maxcomp_file = os.path.join(maxcomp_dir, sim_file)
            if not os.path.exists(maxcomp_file):
                # Extrai o nome do alvo removendo prefixo e sufixo _SIMS/_MOLS
                target_part = stem[len(prefix):]
                for suffix in ("_SIMS", "_MOLS"):
                    if target_part.endswith(suffix):
                        target_part = target_part[: -len(suffix)]
                        break
                if target_part not in failed_targets:
                    failed_targets.append(target_part)

    if failed_targets:
        emit({
            "type": "partial_failure",
            "targets": failed_targets,
            "msg": (
                f"O DrugHunter não gerou maxcomp/plots para: {', '.join(failed_targets)}. "
                "Provável causa: componente conectado muito grande para cálculo de MCS (rdFMCS.FindMCS sem timeout). "
                "Trata-se de uma limitação interna do DrugHunter."
            ),
        })

    emit({"type": "done", "failed_targets": failed_targets})


if __name__ == "__main__":
    main()
