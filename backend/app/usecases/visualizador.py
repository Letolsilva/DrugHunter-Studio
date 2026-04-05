"""
usecases/visualizador.py — Orquestração da visualização de arquivos PDB.

Não importa fastapi, Request ou Response.
"""

from app.domain.models import User, Protein
from app.infra.storage.storage_service import LocalStorageService
from app.services import visualizador as svc
from sqlalchemy.orm import Session


def uc_arvore(
    db: Session,
    storage: LocalStorageService,
    pdb_id: str,
    usuario: User,
) -> dict:
    """
    Retorna a árvore de grupos + metadados da proteína para o visualizador.
    Lança PermissionError se o usuário não tiver o PDB em seus downloads.
    Lança FileNotFoundError se o arquivo não estiver no storage.
    """
    from app.domain.models import UserPdbDownload

    pdb_id = pdb_id.upper().strip()

    protein = db.query(Protein).filter(Protein.pdb_id == pdb_id).first()
    if protein is None:
        raise KeyError(f"Proteína {pdb_id} não encontrada no banco.")

    tem_acesso = (
        db.query(UserPdbDownload)
        .filter_by(user_id=usuario.id, protein_id=protein.id)
        .first()
    )
    if tem_acesso is None:
        raise PermissionError(f"PDB {pdb_id} não pertence aos seus downloads.")

    arvore = svc.construir_arvore(storage, pdb_id)

    return {
        "pdb_id": pdb_id,
        "titulo": protein.titulo,
        "organismo": protein.organismo,
        "resolucao": protein.resolucao,
        "metodo": protein.metodo,
        "arvore": arvore,
    }


def uc_linhas_grupo(
    db: Session,
    storage: LocalStorageService,
    pdb_id: str,
    tipo: str,
    resname: str,
    chain: str,
    resnum: str,
    usuario: User,
) -> list[str]:
    """Retorna as linhas raw de um grupo específico (lazy load)."""
    from app.domain.models import UserPdbDownload

    pdb_id = pdb_id.upper().strip()
    protein = db.query(Protein).filter(Protein.pdb_id == pdb_id).first()
    if protein is None:
        raise KeyError(f"Proteína {pdb_id} não encontrada.")

    tem_acesso = (
        db.query(UserPdbDownload)
        .filter_by(user_id=usuario.id, protein_id=protein.id)
        .first()
    )
    if tem_acesso is None:
        raise PermissionError(f"PDB {pdb_id} não pertence aos seus downloads.")

    return svc.buscar_linhas_grupo(storage, pdb_id, tipo, resname, chain, resnum)
