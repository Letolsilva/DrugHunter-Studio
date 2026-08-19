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
import re
import shutil
import sys
from pathlib import Path

sys.path.append("src")

from wrappers.docking import perform_redocking  # type: ignore[import]


def _posicao_log(log_path: Path) -> int:
    """Retorna o tamanho atual do arquivo para marcar o início do run."""
    try:
        return log_path.stat().st_size if log_path.exists() else 0
    except OSError:
        return 0


def _extrair_erros_log(log_path: Path, desde_byte: int) -> list[str]:
    """Extrai linhas de ERROR/Traceback escritas a partir de desde_byte."""
    if not log_path.exists():
        return []
    try:
        with log_path.open("r", encoding="utf-8", errors="replace") as f:
            f.seek(desde_byte)
            linhas = f.read().splitlines()
        return [l for l in linhas if re.search(r"ERROR|Traceback|Error:", l)][-20:]
    except Exception:
        return []


def _csv_tem_dados(csv_path: Path) -> bool:
    """True se o CSV tem ao menos 1 linha de dados além do cabeçalho."""
    if not csv_path.exists():
        return False
    try:
        linhas = [l.strip() for l in csv_path.read_text(encoding="utf-8", errors="replace").splitlines() if l.strip()]
        return len(linhas) > 1
    except Exception:
        return False


def _verificar_resultado(
    cwd: str,
    base_input_path: str,
    target_clean: str,
    pos_logs: dict[str, int],
) -> tuple[bool, str]:
    """Verifica artefatos e logs após o run.

    Retorna (sucesso, resumo_do_erro).
    Critério primário: CSV de saída com dados.
    Critério secundário: ausência de ERROR nos logs do run.
    """
    csv_path = Path(cwd + base_input_path + "/" + target_clean + "/pdb_codes.csv")
    tem_dados = _csv_tem_dados(csv_path)

    erros: list[str] = []
    for nome, pos in pos_logs.items():
        erros += _extrair_erros_log(Path(cwd) / "logs" / nome, pos)

    if not tem_dados:
        if erros:
            resumo = "\n".join(erros[-10:])
        else:
            resumo = (
                "Nenhum resultado de RMSD foi gerado. Causas comuns:\n"
                "• Ligante não adequado para docking (HOH, ZN, EDO, ACT, SO4, PO4, GOL e íons em geral não são processados pelo Vina).\n"
                "• Arquivo .pdb ausente ou corrompido na pasta do alvo.\n"
                "• Falha silenciosa do DrugHunter — verifique os logs em logs/redocking.log e logs/docking.log."
            )
        return False, resumo

    return True, ""


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

    # Marca posição dos logs antes do run para não pegar erros de runs anteriores
    pos_logs = {
        "redocking.log": _posicao_log(Path(cwd) / "logs" / "redocking.log"),
        "docking.log":   _posicao_log(Path(cwd) / "logs" / "docking.log"),
    }

    perform_redocking(
        base_input_path=args.base_input_path,
        target=args.target,
        base_output_path=args.base_output_path,
        prepare_complex=prepare_complex,
        charge_type=args.charge_type,
    )

    sucesso, resumo = _verificar_resultado(cwd, args.base_input_path, target_clean, pos_logs)
    if not sucesso:
        print(resumo, file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
