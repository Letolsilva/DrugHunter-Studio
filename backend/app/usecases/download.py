"""
usecases/download.py — Orquestração dos casos de uso de downloads PDB.

Não importa fastapi, Request ou Response.
"""

from typing import List
from sqlalchemy.orm import Session

from app.domain.models import User
from app.services import download as svc


def uc_listar_meus_pdbs(db: Session, usuario: User) -> List[dict]:
    """Retorna todos os PDBs baixados pelo usuário autenticado."""
    return svc.listar_downloads_usuario(db, usuario.id)


def uc_remover_meu_pdb(db: Session, usuario: User, pdb_id: str) -> None:
    """Remove o vínculo entre o usuário e o PDB. Lança KeyError se não encontrado."""
    encontrado = svc.remover_download_usuario(db, usuario.id, pdb_id)
    if not encontrado:
        raise KeyError(f"PDB {pdb_id} não encontrado nos downloads do usuário.")
