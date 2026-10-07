"""Modelo de rastreamento de jobs de docking de consenso."""

from datetime import datetime
from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, String, Text, UniqueConstraint
from sqlalchemy.orm import relationship

from app.domain.models.base import Base


class ConsensusJob(Base):
    __tablename__ = "consensus_jobs"

    __table_args__ = (
        UniqueConstraint("user_id", "admet_result_id", name="uq_consensus_user_admet"),
    )

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    admet_result_id = Column(Integer, ForeignKey("admet_results.id", ondelete="SET NULL"), nullable=True, index=True)

    status = Column(String(20), nullable=False, default="pending")
    target = Column(String(255), nullable=False)

    # Parâmetros do complexo PDB
    pdb_id = Column(String(10), nullable=False)
    ligand_resname = Column(String(10), nullable=False)
    ligand_resnum = Column(Integer, nullable=False)
    chain = Column(String(5), nullable=False)

    # Caminhos
    base_input_path = Column(String(512), nullable=False)
    base_docking_output_path = Column(String(512), nullable=False)
    base_selected_mols = Column(String(512), nullable=False)

    # Opções
    charge_type = Column(String(10), nullable=False, default="am1")
    prepare_complex = Column(Boolean, nullable=False, default=False)
    selected_categories = Column(Text, nullable=True)  # JSON: ["bbb_plus", "hia_plus", ...]
    mol_count = Column(Integer, nullable=True)

    # Resultado
    result_csv_path = Column(String(512), nullable=True)
    correlation_img_path = Column(String(512), nullable=True)

    error_msg = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    finished_at = Column(DateTime, nullable=True)

    user = relationship("User")
    admet_result = relationship("AdmetResult")
