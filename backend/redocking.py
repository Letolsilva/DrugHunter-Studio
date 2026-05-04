"""
redocking.py — Wrapper CLI para o DrugHunter perform_redocking.

Recebe argumentos de linha de comando do backend (redocking_runner.py)
e os repassa para perform_redocking() do DrugHunter.

Parâmetros aceitos:
  --base_input_path   Pasta base onde ficam os PDBs (ex: /datasets/PDB)
  --target            Subpasta do alvo terapêutico (ex: GlucanSynthase)
  --base_output_path  Pasta onde os resultados serão salvos
  --charge_type       Tipo de carga do ligante: am1 | gas
  --prepare_complex   Se deve preparar receptor + ligante: True | False
  --csv_path          Caminho do CSV com os códigos PDB (gerado pelo backend)
"""

import argparse
import os
import shutil
import sys
from pathlib import Path

sys.path.append("src")

from wrappers.docking import perform_redocking  # type: ignore[import]


def main() -> int:
    parser = argparse.ArgumentParser(description="Script de redocking")
    parser.add_argument("--base_input_path", required=True)
    parser.add_argument("--target", required=True)
    parser.add_argument("--base_output_path", required=True)
    parser.add_argument("--charge_type", required=True, choices=["am1", "gas"])
    parser.add_argument("--prepare_complex", default="True")
    parser.add_argument("--csv_path", required=True)
    args = parser.parse_args()

    prepare_complex = args.prepare_complex.strip().lower() in ("true", "1", "yes")

    # perform_redocking lê pdb_codes.csv de {cwd}{base_input_path}/{target}/
    # Copia o CSV temporário gerado pelo backend para esse local.
    target_clean = args.target.replace(" ", "")
    cwd = str(Path.cwd())
    dest_dir = cwd + args.base_input_path + "/" + target_clean + "/"
    os.makedirs(dest_dir, exist_ok=True)
    shutil.copy(args.csv_path, dest_dir + "pdb_codes.csv")

    perform_redocking(
        base_input_path=args.base_input_path,
        target=args.target,
        base_output_path=args.base_output_path,
        prepare_complex=prepare_complex,
        charge_type=args.charge_type,
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
