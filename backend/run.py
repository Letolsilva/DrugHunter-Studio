"""
run.py — Entry point do executável PDB Explorer.

Responsabilidades:
1. Detecta o ambiente conda DrugHunter e configura PYTHON_BIN automaticamente
2. Define o diretório de dados (banco + pdb_files) relativo ao executável
3. Sobe o FastAPI via uvicorn em thread separada
4. Aguarda o servidor ficar pronto
5. Abre o navegador padrão em http://localhost:8765
6. Mantém o processo vivo até o usuário fechar
"""

import os
import sys
import threading
import time
import webbrowser
from pathlib import Path

# ── Diretório base do executável (ou do script em dev) ────────────────────────
if getattr(sys, "frozen", False):
    # Rodando como executável PyInstaller
    BASE_DIR = Path(sys.executable).parent
else:
    # Rodando como script Python normal (dev)
    BASE_DIR = Path(__file__).parent

# ── Dados persistidos ao lado do executável ───────────────────────────────────
DATA_DIR = BASE_DIR / "data"
DATA_DIR.mkdir(exist_ok=True)
(DATA_DIR / "pdb_files").mkdir(exist_ok=True)

os.environ.setdefault("PDB_FILES_DIR", str(DATA_DIR / "pdb_files"))
os.environ.setdefault("DATABASE_URL", f"sqlite:///{DATA_DIR / 'pdb_explorer.db'}")

# ── Detecção automática do conda DrugHunter ───────────────────────────────────
def _detectar_conda_drughunter() -> None:
    """Define PYTHON_BIN e DRUG_HUNTER_PATH se o ambiente DrugHunter existir."""
    if os.environ.get("PYTHON_BIN") and os.environ.get("DRUG_HUNTER_PATH"):
        return  # já configurado manualmente

    # Locais comuns do conda
    possiveis_conda = [
        Path.home() / "miniconda3",
        Path.home() / "anaconda3",
        Path.home() / "miniforge3",
        Path("/opt/conda"),
        Path("/usr/local/conda"),
    ]
    env_name = "DrugHunter"

    for conda_root in possiveis_conda:
        python_bin = conda_root / "envs" / env_name / "bin" / "python"
        if python_bin.exists():
            os.environ.setdefault("PYTHON_BIN", str(python_bin))
            break

    # Locais comuns do repositório DrugHunter
    possiveis_hunter = [
        Path.home() / "DrugHunter",
        Path.home() / "Downloads" / "DrugHunter",
        Path.home() / "Desktop" / "DrugHunter",
        BASE_DIR / "DrugHunter",
    ]
    for p in possiveis_hunter:
        if (p / "src" / "wrappers" / "docking.py").exists():
            os.environ.setdefault("DRUG_HUNTER_PATH", str(p))
            break


_detectar_conda_drughunter()

# ── Carrega .env se existir ao lado do executável ─────────────────────────────
env_file = BASE_DIR / ".env"
if env_file.exists():
    from dotenv import load_dotenv
    load_dotenv(env_file)

# ── Sobe o servidor em thread separada ───────────────────────────────────────
PORT = int(os.environ.get("PORT", "8765"))


def _iniciar_servidor() -> None:
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host="127.0.0.1",
        port=PORT,
        log_level="warning",
    )


thread = threading.Thread(target=_iniciar_servidor, daemon=True)
thread.start()

# ── Aguarda o servidor ficar pronto (máx 30s) ─────────────────────────────────
import urllib.request
import urllib.error

url = f"http://127.0.0.1:{PORT}/health"
for _ in range(60):
    try:
        urllib.request.urlopen(url, timeout=1)
        break
    except Exception:
        time.sleep(0.5)

# ── Abre o navegador ──────────────────────────────────────────────────────────
webbrowser.open(f"http://localhost:{PORT}")
print(f"PDB Explorer rodando em http://localhost:{PORT}")
print("Feche esta janela para encerrar.")

# ── Mantém vivo ───────────────────────────────────────────────────────────────
try:
    thread.join()
except KeyboardInterrupt:
    print("\nEncerrando PDB Explorer.")
