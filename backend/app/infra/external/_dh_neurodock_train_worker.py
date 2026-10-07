"""
Script executado via subprocesso com o Python do DrugHunter.

Recebe configuração via JSON em argv[1].
Responsabilidades:
  1. Chamar build_model(...) do DrugHunter
  2. Emitir {"type": "done", "n_targets": N, "n_train_mols": M}
     ou    {"type": "error", "msg": "..."}

Paths: DH usa Path.cwd() + path[1:], portanto todos os paths têm '/' no início
e o worker roda com cwd=dh_dir.
"""
import json
import os
import sys
from pathlib import Path


def emit(msg: dict):
    print(json.dumps(msg, ensure_ascii=False), flush=True)


def main():
    if len(sys.argv) < 2:
        emit({"type": "error", "msg": "Uso: _dh_neurodock_train_worker.py <json_args>"})
        sys.exit(1)

    try:
        args = json.loads(sys.argv[1])
    except json.JSONDecodeError as exc:
        emit({"type": "error", "msg": f"Args JSON inválido: {exc}"})
        sys.exit(1)

    dh_dir                 = args["dh_dir"]
    base_input_mols        = args["base_input_mols"]        # DH-relativo, ex: /resultados/maia_input
    base_input_fingerprints = args["base_input_fingerprints"] # DH-relativo, ex: /resultados/maia_input/Fingerprints
    base_input_consensus   = args["base_input_consensus"]   # DH-relativo, ex: /resultados/consenso
    model_output_path      = args["model_output_path"]      # DH-relativo
    history_output_path    = args["history_output_path"]    # DH-relativo
    input_mols             = args["input_mols"]             # nome do target (sem .csv)
    fingerprint_type       = args.get("fingerprint_type", "morgan")
    consensus_type         = args.get("consensus_type", "min-max")
    evaluation_name        = args.get("evaluation_name", "MorganBestModel")
    n_trials               = args.get("n_trials", 20)

    # Desabilita XLA/JIT do TensorFlow — consome RAM extra sem ganho em CPU-only
    os.environ.setdefault("TF_XLA_FLAGS", "--tf_xla_auto_jit=0")
    os.environ.setdefault("TF_ENABLE_ONEDNN_OPTS", "0")
    os.environ.setdefault("TF_CPP_MIN_LOG_LEVEL", "2")

    src_path = os.path.join(dh_dir, "src")
    if src_path not in sys.path:
        sys.path.insert(0, src_path)
    os.chdir(dh_dir)

    # ── Importa módulos do DrugHunter ─────────────────────────────────────────
    try:
        from kernel.descriptors import fingerprints as FP
        from wrappers.molecular_ai_analyzer import _preprocessing
        from IA.neuralnetwork import NeuroDocking
    except ImportError as exc:
        emit({"type": "error", "msg": f"Não foi possível carregar o módulo NeuroDock do DrugHunter. Verifique se o ambiente conda está ativo. Detalhe: {exc}"})
        sys.exit(1)

    fp_map = {
        "morgan": FP.Morgan,
        "maccs": FP.MACCs,
        "pharmacophore": FP.Pharmacophore,
    }
    fp_enum = fp_map.get(fingerprint_type.lower(), FP.Morgan)

    # ── Valida entradas ──────────────────────────────────────────────────────
    abs_mols_dir = Path(dh_dir) / base_input_mols.lstrip("/")
    mol_csv = abs_mols_dir / f"{input_mols}.csv"
    if not mol_csv.exists():
        emit({"type": "error", "msg": "Resultado ADMET não encontrado. Execute a análise ADMET antes de treinar o NeuroDock."})
        sys.exit(1)

    abs_fp_dir = Path(dh_dir) / base_input_fingerprints.lstrip("/")
    if not abs_fp_dir.exists():
        emit({"type": "error", "msg": "Dados de fingerprints não encontrados. Execute o clustering antes de treinar o NeuroDock."})
        sys.exit(1)

    abs_consensus_dir = Path(dh_dir) / base_input_consensus.lstrip("/")
    if not abs_consensus_dir.exists():
        emit({"type": "error", "msg": "Resultados de docking não encontrados. Execute o docking de consenso antes de treinar o NeuroDock."})
        sys.exit(1)

    # Conta alvos e moléculas de treino para reportar ao final
    n_targets = len([
        d for d in abs_consensus_dir.iterdir()
        if d.is_dir() and not d.name.startswith("Molecules")
    ])

    try:
        import pandas as pd
        n_train_mols = len(pd.read_csv(str(mol_csv)))
    except Exception:
        n_train_mols = None

    # ── Executa treinamento ──────────────────────────────────────────────────
    emit({"type": "start", "msg": f"Iniciando treinamento NeuroDock para {input_mols} ({evaluation_name}), {n_trials} trials..."})
    try:
        X, y = _preprocessing(
            base_input_mols=base_input_mols,
            base_input_fingerprints=base_input_fingerprints,
            base_input_consensus=base_input_consensus,
            input_mols=f"{input_mols}.csv",
            fingerprint_type=fp_enum,
            consensus_type=consensus_type,
        )
        model = NeuroDocking(
            num_inputs=X.shape[1],
            num_outputs=y.shape[1],
            evaluation_name=evaluation_name,
            history_output_path=history_output_path,
            model_output_path=model_output_path,
        )
        model.hyperparameter_search(X, y, n_trials=n_trials, direction="minimize", metric="val_mae")
        model.fit(X, y)
    except Exception as exc:
        emit({"type": "error", "msg": f"Erro no treinamento: {exc}"})
        sys.exit(1)

    emit({
        "type": "done",
        "n_targets": n_targets,
        "n_train_mols": n_train_mols,
    })


if __name__ == "__main__":
    main()
