# pdb_explorer.spec — Configuração do PyInstaller
#
# Gera um executável único que inclui:
#   - FastAPI + uvicorn + todas as dependências Python
#   - Arquivos estáticos do React (copiados de frontend/dist/ para backend/static/)
#
# Para gerar:
#   cd backend
#   pyinstaller pdb_explorer.spec

import sys
from pathlib import Path
from PyInstaller.utils.hooks import collect_all, collect_submodules

block_cipher = None

# Coleta completa de pacotes que o PyInstaller costuma perder
uvicorn_datas, uvicorn_binaries, uvicorn_hiddenimports = collect_all("uvicorn")
fastapi_datas, fastapi_binaries, fastapi_hiddenimports = collect_all("fastapi")
starlette_datas, starlette_binaries, starlette_hiddenimports = collect_all("starlette")
anyio_datas, anyio_binaries, anyio_hiddenimports = collect_all("anyio")

a = Analysis(
    ["run.py"],
    pathex=[str(Path(".").resolve())],
    binaries=[] + uvicorn_binaries + fastapi_binaries + starlette_binaries + anyio_binaries,
    datas=[
        # Arquivos estáticos do React buildado
        ("static", "static"),
        # Pasta de PDBs (vazia, criada em runtime)
        ("pdb_files", "pdb_files"),
    ] + uvicorn_datas + fastapi_datas + starlette_datas + anyio_datas,
    hiddenimports=[
        # uvicorn
        "uvicorn",
        "uvicorn.main",
        "uvicorn.config",
        "uvicorn.server",
        "uvicorn.logging",
        "uvicorn.loops",
        "uvicorn.loops.auto",
        "uvicorn.loops.asyncio",
        "uvicorn.protocols",
        "uvicorn.protocols.http",
        "uvicorn.protocols.http.auto",
        "uvicorn.protocols.http.h11_impl",
        "uvicorn.protocols.websockets",
        "uvicorn.protocols.websockets.auto",
        "uvicorn.lifespan",
        "uvicorn.lifespan.on",
        "uvicorn.middleware",
        "uvicorn.middleware.proxy_headers",
        # h11 (HTTP parser usado pelo uvicorn)
        "h11",
        "h11._readers",
        "h11._writers",
        "h11._events",
        # click (usado pelo uvicorn CLI)
        "click",
        # starlette
        "starlette.routing",
        "starlette.staticfiles",
        "starlette.responses",
        "starlette.requests",
        "starlette.middleware",
        "starlette.middleware.cors",
        # SQLAlchemy
        "sqlalchemy.dialects.sqlite",
        "sqlalchemy.dialects.sqlite.pysqlite",
        # passlib
        "passlib.handlers.bcrypt",
        "passlib.handlers.sha2_crypt",
        # python-jose
        "jose",
        "jose.jwt",
        "jose.jws",
        "jose.jwk",
        "jose.constants",
        # email-validator (pydantic)
        "email_validator",
        # python-multipart
        "multipart",
        # anyio
        "anyio",
        "anyio.abc",
        "anyio._backends._asyncio",
    ] + uvicorn_hiddenimports + fastapi_hiddenimports + starlette_hiddenimports + anyio_hiddenimports,
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=["PyQt5", "PyQt6", "PySide2", "PySide6", "tkinter", "matplotlib", "numpy", "scipy", "PIL"],
    win_no_prefer_redirects=False,
    win_private_assemblies=False,
    cipher=block_cipher,
    noarchive=False,
)

pyz = PYZ(a.pure, a.zipped_data, cipher=block_cipher)

exe = EXE(
    pyz,
    a.scripts,
    a.binaries,
    a.zipfiles,
    a.datas,
    [],
    name="pdb-explorer",
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    upx_exclude=[],
    runtime_tmpdir=None,
    console=True,   # True = mostra janela de terminal (útil para ver erros)
    disable_windowed_traceback=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
)
