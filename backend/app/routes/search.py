"""
routes/search.py — Rotas de busca de proteínas (/api/search)

Responsabilidade exclusiva: receber requisições HTTP/SSE,
extrair parâmetros e delegar para os use cases.
Não contém lógica de negócio.
"""

from typing import Optional
from fastapi import APIRouter, Depends, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app.infra.db.database import get_db
from app.core.deps import get_usuario_opcional
from app.domain.models import User
from app.domain.schemas.search import CancelarRequest
from app.usecases import search as uc

router = APIRouter(prefix="/api/search", tags=["Busca"])


@router.get("/stream")
async def buscar_stream(
    proteinas: str = Query(
        ..., description="Uma ou mais proteínas separadas por vírgula"
    ),
    forcar_novo: bool = Query(False, description="Ignorar cache e buscar novamente"),
    limite: Optional[int] = Query(
        None, ge=1, description="Máximo de estruturas por proteína (None = todas)"
    ),
    db: Session = Depends(get_db),
    usuario: Optional[User] = Depends(get_usuario_opcional),
):
    """
    Busca proteínas no PDB com progresso em tempo real via SSE.
    Funciona anônimo ou autenticado — quando logado, salva no histórico.
    """
    return StreamingResponse(
        uc.uc_buscar_stream(db, proteinas, forcar_novo, usuario, limite),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


@router.get("/csv")
def download_csv(
    proteinas: str = Query(...),
    organismo: Optional[str] = Query(None),
    qualidade: Optional[str] = Query(None),
    db: Session = Depends(get_db),
):
    """Retorna CSV dos resultados em cache com filtros opcionais."""
    conteudo, nome = uc.uc_download_csv(db, proteinas, organismo, qualidade)
    return StreamingResponse(
        iter([conteudo]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={nome}"},
    )


@router.get("/organismos")
def listar_organismos(db: Session = Depends(get_db)):
    """Lista todos os organismos únicos disponíveis no cache."""
    return {"organismos": uc.uc_listar_organismos(db)}


@router.delete("/cancelar-parcial")
def cancelar_busca_parcial(body: CancelarRequest, db: Session = Depends(get_db)):
    """Remove do banco proteínas salvas parcialmente ao cancelar uma busca."""
    return uc.uc_cancelar_busca_parcial(db, body.proteinas_query)
