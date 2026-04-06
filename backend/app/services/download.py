"""
services/download.py — Acesso a dados de downloads de arquivos PDB por usuário.

Responsabilidade: operações de banco. Não conhece HTTP nem usecases.
"""

from typing import List
from sqlalchemy.orm import Session

from app.domain.models import Protein, UserPdbDownload


def listar_downloads_usuario(db: Session, user_id: int) -> List[dict]:
    """Retorna todos os PDBs baixados pelo usuário, com dados da proteína e formato."""
    registros = (
        db.query(UserPdbDownload, Protein)
        .join(Protein, UserPdbDownload.protein_id == Protein.id)
        .filter(UserPdbDownload.user_id == user_id)
        .order_by(UserPdbDownload.downloaded_at.desc())
        .all()
    )
    return [
        {
            "pdb_id": protein.pdb_id,
            "titulo": protein.titulo,
            "organismo": protein.organismo,
            "resolucao": protein.resolucao,
            "metodo": protein.metodo,
            "pdb_file_size": (
                protein.pdb_file_size
                if download.formato == "legacy"
                else protein.cif_file_size
            ),
            "downloaded_at": download.downloaded_at.isoformat(),
            "formato": download.formato,
            "tem_legacy": protein.tem_legacy,
            "tem_cif": protein.tem_cif,
        }
        for download, protein in registros
    ]


def remover_download_usuario(
    db: Session, user_id: int, pdb_id: str, formato: str = "legacy"
) -> bool:
    """Remove o vínculo entre o usuário e o PDB no formato informado."""
    registro = (
        db.query(UserPdbDownload)
        .join(Protein, UserPdbDownload.protein_id == Protein.id)
        .filter(
            UserPdbDownload.user_id == user_id,
            Protein.pdb_id == pdb_id.upper(),
            UserPdbDownload.formato == formato,
        )
        .first()
    )
    if not registro:
        return False
    db.delete(registro)
    db.commit()
    return True
