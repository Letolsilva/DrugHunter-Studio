"""Modelo de rastreamento de resultados ADMET por alvo ChEMBL."""

from datetime import datetime
from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, Text, UniqueConstraint
from sqlalchemy.orm import relationship

from app.domain.models.base import Base


class AdmetResult(Base):
    """Resultado de uma análise ADMET para um alvo ChEMBL ou CSV avulso."""

    __tablename__ = "admet_results"

    __table_args__ = (
        # Um resultado por item ChEMBL por usuário (re-rodar sobrescreve)
        UniqueConstraint("user_id", "chembl_job_item_id", name="uq_admet_user_item"),
    )

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(
        Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    chembl_job_item_id = Column(
        Integer,
        ForeignKey("chembl_job_items.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    source_type = Column(String(20), nullable=False, default="chembl_job")  # chembl_job | upload
    # pending | running | done | error
    status = Column(String(20), nullable=False, default="pending")
    base_output_path = Column(String(512), nullable=False)

    # Contadores para os cards de resumo
    total_molecules = Column(Integer, nullable=True)
    excluded_toxic = Column(Integer, nullable=True)
    bbb_plus = Column(Integer, nullable=True)
    bbb_minus = Column(Integer, nullable=True)
    hia_plus = Column(Integer, nullable=True)
    pgp_plus = Column(Integer, nullable=True)

    error_msg = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    finished_at = Column(DateTime, nullable=True)

    user = relationship("User")
    chembl_job_item = relationship("ChemblJobItem")
