"""
services/admet.py — Acesso a dados de resultados ADMET.

Responsabilidade: operações de banco. Não conhece HTTP nem usecases.
"""

from datetime import datetime
from typing import Optional

from sqlalchemy import and_
from sqlalchemy.orm import Session

from app.domain.models.admet_result import AdmetResult


def criar_ou_substituir(
    db: Session,
    user_id: int,
    chembl_job_item_id: int,
    base_output_path: str,
    source_type: str = "chembl_job",
) -> AdmetResult:
    """
    Retorna o AdmetResult para o item, resetando-o para 'running'.
    Update-in-place evita delete+insert e a janela de UNIQUE constraint.
    """
    anterior = (
        db.query(AdmetResult)
        .filter(
            and_(
                AdmetResult.user_id == user_id,
                AdmetResult.chembl_job_item_id == chembl_job_item_id,
            )
        )
        .first()
    )

    if anterior:
        anterior.source_type = source_type
        anterior.status = "running"
        anterior.base_output_path = base_output_path
        anterior.total_molecules = None
        anterior.excluded_toxic = None
        anterior.bbb_plus = None
        anterior.bbb_minus = None
        anterior.hia_plus = None
        anterior.pgp_plus = None
        anterior.error_msg = None
        anterior.created_at = datetime.utcnow()
        anterior.finished_at = None
        db.commit()
        db.refresh(anterior)
        return anterior

    result = AdmetResult(
        user_id=user_id,
        chembl_job_item_id=chembl_job_item_id,
        source_type=source_type,
        status="running",
        base_output_path=base_output_path,
    )
    db.add(result)
    db.commit()
    db.refresh(result)
    return result


def buscar_por_id(db: Session, result_id: int, user_id: int) -> Optional[AdmetResult]:
    return (
        db.query(AdmetResult)
        .filter(
            and_(AdmetResult.id == result_id, AdmetResult.user_id == user_id)
        )
        .first()
    )


def buscar_por_item(
    db: Session, chembl_job_item_id: int, user_id: int
) -> Optional[AdmetResult]:
    return (
        db.query(AdmetResult)
        .filter(
            and_(
                AdmetResult.chembl_job_item_id == chembl_job_item_id,
                AdmetResult.user_id == user_id,
            )
        )
        .first()
    )


def listar_por_usuario(db: Session, user_id: int):
    return (
        db.query(AdmetResult)
        .filter(AdmetResult.user_id == user_id, AdmetResult.status == "done")
        .order_by(AdmetResult.created_at.desc())
        .all()
    )


def marcar_concluido(
    db: Session,
    result_id: int,
    total_molecules: int,
    excluded_toxic: int,
    bbb_plus: int,
    bbb_minus: int,
    hia_plus: int,
    pgp_plus: int,
) -> None:
    result = db.query(AdmetResult).filter(AdmetResult.id == result_id).populate_existing().first()
    if result and result.status != "cancelled":
        result.status = "done"
        result.total_molecules = total_molecules
        result.excluded_toxic = excluded_toxic
        result.bbb_plus = bbb_plus
        result.bbb_minus = bbb_minus
        result.hia_plus = hia_plus
        result.pgp_plus = pgp_plus
        result.finished_at = datetime.utcnow()
        db.commit()


def marcar_erro(db: Session, result_id: int, mensagem: str) -> None:
    result = db.query(AdmetResult).filter(AdmetResult.id == result_id).populate_existing().first()
    if result and result.status != "cancelled":
        result.status = "error"
        result.error_msg = mensagem
        result.finished_at = datetime.utcnow()
        db.commit()
