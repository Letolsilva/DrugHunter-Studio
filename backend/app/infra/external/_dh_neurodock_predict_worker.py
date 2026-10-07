"""
Script executado via subprocesso com o Python do DrugHunter.

Recebe configuração via JSON em argv[1].
Responsabilidades:
  1. Copiar o CSV da biblioteca para dentro do dh_dir (se necessário)
  2. Chamar predict(...) do DrugHunter
  3. Emitir {"type": "done", "n_screened": N, "n_selected": K}
     ou    {"type": "error", "msg": "..."}
"""
import json
import os
import shutil
import sys
from pathlib import Path


def emit(msg: dict):
    print(json.dumps(msg, ensure_ascii=False), flush=True)


def main():
    if len(sys.argv) < 2:
        emit({"type": "error", "msg": "Uso: _dh_neurodock_predict_worker.py <json_args>"})
        sys.exit(1)

    try:
        args = json.loads(sys.argv[1])
    except json.JSONDecodeError as exc:
        emit({"type": "error", "msg": f"Args JSON inválido: {exc}"})
        sys.exit(1)

    dh_dir             = args["dh_dir"]
    library_csv_path   = args["library_csv_path"]   # path absoluto do CSV com candidatos
    input_dataset      = args["input_dataset"]       # nome descritivo (ex: ZINC)
    model_output_path  = args["model_output_path"]   # DH-relativo
    evaluation_model   = args["evaluation_model"]    # nome do modelo treinado
    base_output_path   = args["base_output_path"]    # DH-relativo de saída
    fingerprint_type   = args.get("fingerprint_type", "morgan")
    top_k              = args.get("top_k", 50)
    batch_size         = args.get("batch_size", 10000)

    src_path = os.path.join(dh_dir, "src")
    if src_path not in sys.path:
        sys.path.insert(0, src_path)
    os.chdir(dh_dir)

    # ── Importa módulos do DrugHunter ─────────────────────────────────────────
    try:
        from kernel.descriptors import fingerprints as FP
        from wrappers.molecular_ai_analyzer import predict
    except ImportError as exc:
        emit({"type": "error", "msg": f"Não foi possível carregar o módulo NeuroDock do DrugHunter. Verifique se o ambiente conda está ativo. Detalhe: {exc}"})
        sys.exit(1)

    fp_map = {
        "morgan": FP.Morgan,
        "maccs": FP.MACCs,
        "pharmacophore": FP.Pharmacophore,
    }
    fp_enum = fp_map.get(fingerprint_type.lower(), FP.Morgan)

    # ── Valida CSV da biblioteca ───────────────────────────────────────────────
    lib_csv = Path(library_csv_path)
    if not lib_csv.exists():
        emit({"type": "error", "msg": f"Arquivo da biblioteca de compostos não encontrado ({lib_csv.name}). Selecione o arquivo CSV novamente."})
        sys.exit(1)

    # ── Copia CSV para dentro do dh_dir em user_library/<dataset>/ ───────────
    # O DH usa Path.cwd() + path[1:] para resolver paths, então a biblioteca
    # precisa estar dentro do dh_dir. Fazemos uma cópia temporária.
    user_lib_dir = Path(dh_dir) / "user_library" / input_dataset
    user_lib_dir.mkdir(parents=True, exist_ok=True)
    dest_csv = user_lib_dir / lib_csv.name
    if not dest_csv.exists() or dest_csv.stat().st_mtime < lib_csv.stat().st_mtime:
        shutil.copy2(str(lib_csv), str(dest_csv))
        emit({"type": "log", "msg": f"Biblioteca copiada para {dest_csv}"})
    else:
        emit({"type": "log", "msg": f"Biblioteca já atualizada em {dest_csv}"})

    # DH-relative path para a pasta da biblioteca
    base_input_mols = f"/user_library/{input_dataset}"
    # Nome do CSV sem extensão
    csv_stem = lib_csv.stem

    # ── Executa triagem virtual ──────────────────────────────────────────────
    emit({"type": "start", "msg": f"Iniciando triagem virtual de {input_dataset} com {evaluation_model}..."})
    try:
        predict(
            base_input_mols=base_input_mols,
            base_output_predictions=base_output_path,
            input_mols=csv_stem,
            fingerprint_type=fp_enum,
            model_output_path=model_output_path,
            evaluation_model=evaluation_model,
            batch_size=batch_size,
            top_k=top_k,
        )
    except Exception as exc:
        emit({"type": "error", "msg": f"Erro em predict: {exc}"})
        sys.exit(1)

    # ── Lê resultados para reportar contagens ────────────────────────────────
    # DrugHunter salva direto em base_output_path/ (sem subdiretório por dataset)
    result_dir = Path(dh_dir) / base_output_path.lstrip("/")
    predictions_csv = result_dir / "consensus.csv"   # todas as moléculas triadas
    molecules_csv = result_dir / "molecules.csv"     # top-K selecionadas

    n_screened = None
    n_selected = None
    try:
        import pandas as pd
        if predictions_csv.exists():
            n_screened = len(pd.read_csv(str(predictions_csv)))
        if molecules_csv.exists():
            n_selected = len(pd.read_csv(str(molecules_csv)))
    except Exception:
        pass

    emit({
        "type": "done",
        "n_screened": n_screened,
        "n_selected": n_selected,
    })


if __name__ == "__main__":
    main()
