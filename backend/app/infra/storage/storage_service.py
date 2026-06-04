"""
Infra — Abstração de storage para arquivos .pdb

Interface comum que permite trocar LocalStorage por S3 sem alterar
o resto do código. Basta injetar a implementação via Depends().
"""

import os
from pathlib import Path
from typing import Protocol, runtime_checkable

PDB_FILES_DIR = Path(os.getenv("PDB_FILES_DIR", "pdb_files"))


@runtime_checkable
class StorageService(Protocol):
    def save(self, key: str, data: bytes) -> None: ...
    def exists(self, key: str) -> bool: ...
    def read(self, key: str) -> bytes: ...
    def get_file_path(self, key: str) -> str: ...


class LocalStorageService:
    """Implementação local — salva arquivos em disco no servidor."""

    def __init__(self, base_dir: Path = PDB_FILES_DIR):
        self.base_dir = base_dir
        self.base_dir.mkdir(parents=True, exist_ok=True)

    def save(self, key: str, data: bytes) -> None:
        (self.base_dir / key).write_bytes(data)

    def exists(self, key: str) -> bool:
        return (self.base_dir / key).exists()

    def read(self, key: str) -> bytes:
        return (self.base_dir / key).read_bytes()

    def get_file_path(self, key: str) -> str:
        return str(self.base_dir / key)


# Instância singleton para injeção de dependência
_storage = LocalStorageService()


def get_storage() -> LocalStorageService:
    """FastAPI Depends — injeta o StorageService nas rotas."""
    return _storage
