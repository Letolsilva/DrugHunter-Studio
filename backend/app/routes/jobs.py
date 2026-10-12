"""
routes/jobs.py — Operações comuns a todos os jobs (/api/jobs)

POST /api/jobs/{kind}/{job_id}/cancel — cancela um job em andamento (pending/running)

kind: redocking | chembl | admet | clustering | consensus |
      neurodock-model | neurodock-prediction | md | md-analysis
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.deps import get_usuario_atual
from app.domain.models import User
from app.infra.db.database import get_db
from app.usecases import job_cancel as uc

router = APIRouter(prefix="/api/jobs", tags=["Jobs"])


@router.post("/{kind}/{job_id}/cancel")
def cancelar_job(
    kind: str,
    job_id: int,
    db: Session = Depends(get_db),
    usuario: User = Depends(get_usuario_atual),
):
    try:
        return uc.uc_cancelar_job(db, kind, job_id, usuario)
    except uc.TipoJobInvalido:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Tipo de job desconhecido.")
    except uc.JobNaoEncontrado:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Job não encontrado.")
    except uc.JobNaoCancelavel as e:
        raise HTTPException(status.HTTP_409_CONFLICT, str(e))
