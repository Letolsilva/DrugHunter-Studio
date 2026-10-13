"""Modelo de rastreamento de jobs de Dinâmica Molecular."""

from datetime import datetime
from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import relationship

from app.domain.models.base import Base


class MDJob(Base):
    """Registro de cada execução de dinâmica molecular disparada por um usuário."""

    __tablename__ = "md_jobs"

    id      = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)

    # pending | running | done | error
    status  = Column(String(20), nullable=False, default="pending")

    # --- Identificação da molécula ---
    molecule_id = Column(String(255), nullable=False)
    smiles      = Column(Text, nullable=True)

    # --- Fonte do ligante ---
    # "consensus": mol2 localizado a partir de consensus_job_id + ligand_filename (Dock6/flex/)
    # "upload":    arquivo enviado pelo usuário, path em ligand_file_path
    ligand_source    = Column(String(15), nullable=False, default="consensus")
    consensus_job_id = Column(Integer, ForeignKey("consensus_jobs.id", ondelete="SET NULL"), nullable=True)
    ligand_filename  = Column(String(255), nullable=True)   # nome do .mol2 em Dock6/flex/
    ligand_file_path = Column(String(512), nullable=True)   # path absoluto do upload

    # --- Receptor ---
    # receptor_source: "dh_prepared" | "upload" | "manual"
    receptor_source   = Column(String(12), nullable=False, default="dh_prepared")
    target            = Column(String(255), nullable=True)
    receptor_path     = Column(String(512), nullable=True)
    receptor_filename = Column(String(255), nullable=True)

    # --- Parâmetros MD (todos como JSON) ---
    params_json = Column(Text, nullable=True)

    # --- Paths de saída ---
    base_output_path = Column(String(512), nullable=True)

    # --- Estado ---
    error_msg   = Column(Text, nullable=True)
    created_at  = Column(DateTime, default=datetime.utcnow, nullable=False)
    finished_at = Column(DateTime, nullable=True)

    user          = relationship("User")
    consensus_job = relationship("ConsensusJob")
