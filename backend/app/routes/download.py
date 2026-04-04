"""
routes/download.py — Download de arquivos .pdb do RCSB

GET /api/download/pdb/{pdb_id}
  - Verifica se o arquivo já existe no storage local
  - Se não: faz fetch em files.rcsb.org, salva no storage e atualiza o banco
  - Registra o download em user_pdb_downloads (apenas usuários logados)
  - Retorna o arquivo como stream com Content-Disposition: attachment
"""

import urllib.request
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app.infra.db.database import get_db
from app.infra.storage.storage_service import LocalStorageService, get_storage
from app.core.deps import get_usuario_opcional
from app.domain.models import User, Protein, UserPdbDownload

RCSB_PDB_URL = "https://files.rcsb.org/download/{}.pdb"

router = APIRouter(prefix="/api/download", tags=["Download"])


def _fetch_pdb_from_rcsb(pdb_id: str) -> bytes:
    url = RCSB_PDB_URL.format(pdb_id.upper())
    try:
        with urllib.request.urlopen(url, timeout=30) as resp:
            return resp.read()
    except Exception as exc:
        raise HTTPException(
            status_code=502,
            detail=f"Não foi possível baixar {pdb_id} do RCSB: {exc}",
        )


@router.get("/pdb/{pdb_id}")
def download_pdb(
    pdb_id: str,
    db: Session = Depends(get_db),
    storage: LocalStorageService = Depends(get_storage),
    usuario: Optional[User] = Depends(get_usuario_opcional),
):
    """
    Baixa o arquivo .pdb legado de uma estrutura do RCSB.
    Cacheia no servidor para servir na fase seguinte (visualizador no site).
    Registra o download para o usuário logado.
    """
    pdb_id = pdb_id.upper().strip()
    if not pdb_id or len(pdb_id) > 10:
        raise HTTPException(status_code=400, detail="PDB ID inválido.")

    key = f"{pdb_id}.pdb"

    # Busca o registro no banco para atualizar depois
    protein = db.query(Protein).filter(Protein.pdb_id == pdb_id).first()

    # Cacheia o arquivo se ainda não existe no storage
    if not storage.exists(key):
        data = _fetch_pdb_from_rcsb(pdb_id)
        storage.save(key, data)

        if protein:
            protein.pdb_file_cached = True
            protein.pdb_storage_key = key
            protein.pdb_file_size = len(data)
            db.commit()
    else:
        # Garante que o banco reflete o estado real do storage
        if protein and not protein.pdb_file_cached:
            protein.pdb_file_cached = True
            protein.pdb_storage_key = key
            db.commit()

    # Registra o download para o usuário logado
    if usuario and protein:
        existing = (
            db.query(UserPdbDownload)
            .filter_by(user_id=usuario.id, protein_id=protein.id)
            .first()
        )
        if existing:
            from datetime import datetime

            existing.downloaded_at = datetime.utcnow()
        else:
            db.add(UserPdbDownload(user_id=usuario.id, protein_id=protein.id))
        db.commit()

    # Serve o arquivo
    file_data = storage.read(key)

    def iterfile():
        yield file_data

    return StreamingResponse(
        iterfile(),
        media_type="chemical/x-pdb",
        headers={
            "Content-Disposition": f"attachment; filename={key}",
            "Content-Length": str(len(file_data)),
        },
    )
