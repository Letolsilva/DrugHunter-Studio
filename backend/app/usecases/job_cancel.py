"""
usecases/job_cancel.py — Cancelamento de jobs (todos os módulos).

Endpoint único: POST /api/jobs/{kind}/{id}/cancel

Fluxo: valida dono e estado → encerra o subprocesso (infra/job_control) → grava status "cancelled".
O thread/worker que ainda estiver terminando não sobrescreve o estado (os `marcar_*` dos services
preservam "cancelled") e não envia e-mail de falha.
"""
from __future__ import annotations

from datetime import datetime
from typing import Any

from sqlalchemy.orm import Session

from app.domain.models import (
    AdmetResult,
    ChemblJob,
    ClusteringJob,
    ConsensusJob,
    MDJob,
    MdAnalysisJob,
    NeuroDockModel,
    NeuroDockPrediction,
    RedockingJob,
    User,
)
from app.infra import job_control

MENSAGEM_CANCELADO = "Cancelado pelo usuário."
ESTADOS_CANCELAVEIS = ("pending", "running")

# kind -> (modelo ORM, atributo da mensagem de erro, atributo da data de término)
_KINDS: dict[str, tuple[Any, str, str]] = {
    "redocking": (RedockingJob, "erro_msg", "finalizado_em"),
    "chembl": (ChemblJob, "error_msg", "finished_at"),
    "admet": (AdmetResult, "error_msg", "finished_at"),
    "clustering": (ClusteringJob, "error_msg", "finished_at"),
    "consensus": (ConsensusJob, "error_msg", "finished_at"),
    "neurodock-model": (NeuroDockModel, "error_msg", "finished_at"),
    "neurodock-prediction": (NeuroDockPrediction, "error_msg", "finished_at"),
    "md": (MDJob, "error_msg", "finished_at"),
    "md-analysis": (MdAnalysisJob, "error_msg", "finished_at"),
}


class TipoJobInvalido(Exception):
    pass


class JobNaoEncontrado(Exception):
    pass


class JobNaoCancelavel(Exception):
    pass


def uc_cancelar_job(db: Session, kind: str, job_id: int, usuario: User) -> dict:
    if kind not in _KINDS:
        raise TipoJobInvalido(kind)
    model, attr_erro, attr_fim = _KINDS[kind]

    job = db.query(model).filter(model.id == job_id, model.user_id == usuario.id).first()
    if job is None:
        raise JobNaoEncontrado(f"{kind}/{job_id}")
    if job.status not in ESTADOS_CANCELAVEIS:
        raise JobNaoCancelavel(f"O job já terminou (status: {job.status}).")

    # 1) grava o estado terminal ANTES de encerrar o processo: o worker morre rápido e, se o
    #    estado ainda fosse "running", gravaria "error" na frente (os marcar_* preservam "cancelled").
    job.status = "cancelled"
    setattr(job, attr_erro, MENSAGEM_CANCELADO)
    setattr(job, attr_fim, datetime.utcnow())

    # ChEMBL: os itens que ainda não terminaram também são cancelados
    if kind == "chembl":
        for item in job.items:
            if item.status in ESTADOS_CANCELAVEIS:
                item.status = "cancelled"
                item.error_msg = MENSAGEM_CANCELADO
                item.finished_at = datetime.utcnow()

    db.commit()

    # 2) encerra o subprocesso (e todo o grupo de processos)
    job_control.cancel(kind, job_id)
    return {"id": job_id, "kind": kind, "status": "cancelled"}
