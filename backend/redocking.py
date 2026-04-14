"""
redocking.py — Stub de desenvolvimento.

Aceita os mesmos argumentos que o script real de redocking.
Por enquanto apenas loga os parâmetros recebidos e retorna sucesso (exit 0).
Substitua o conteúdo deste arquivo pelo código real quando estiver pronto.
"""

import argparse
import sys


def main() -> int:
    parser = argparse.ArgumentParser(description="Script de redocking")
    parser.add_argument("--base_input_path", required=True)
    parser.add_argument("--target", required=True)
    parser.add_argument("--base_output_path", required=True)
    parser.add_argument("--charge_type", required=True, choices=["am1", "gas"])
    parser.add_argument("--prepare_complex", default="True")
    parser.add_argument("--csv_path", required=True)
    args = parser.parse_args()

    print(f"[redocking stub] target={args.target}")
    print(f"[redocking stub] base_input_path={args.base_input_path}")
    print(f"[redocking stub] base_output_path={args.base_output_path}")
    print(f"[redocking stub] charge_type={args.charge_type}")
    print(f"[redocking stub] prepare_complex={args.prepare_complex}")
    print(f"[redocking stub] csv_path={args.csv_path}")
    print("[redocking stub] Concluído com sucesso (stub).")
    return 0


if __name__ == "__main__":
    sys.exit(main())
