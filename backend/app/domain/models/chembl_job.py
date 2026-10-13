"""Modelos de rastreamento de jobs de scraping ChEMBL."""

from datetime import datetime
from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import relationship

from app.domain.models.base import Base


class ChemblJob(Base):
    """Grupo de execução ChEMBL (pode conter múltiplos alvos)."""

    __tablename__ = "chembl_jobs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(
        Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True
    )
    # pending | running | done | error
    status = Column(String(20), nullable=False, default="pending")
    base_output_path = Column(String(512), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    finished_at = Column(DateTime, nullable=True)
    error_msg = Column(Text, nullable=True)

    user = relationship("User")
    items = relationship(
        "ChemblJobItem", back_populates="job", cascade="all, delete-orphan"
    )


class ChemblJobItem(Base):
    """Um alvo dentro de um grupo de execução ChEMBL."""

    __tablename__ = "chembl_job_items"

    id = Column(Integer, primary_key=True, index=True)
    job_id = Column(
        Integer, ForeignKey("chembl_jobs.id", ondelete="CASCADE"), nullable=False
    )
    target_name = Column(String(255), nullable=False)
    folder_name = Column(String(255), nullable=False)
    # pending | running | done | error
    status = Column(String(20), nullable=False, default="pending")
    target_filters = Column(Text, nullable=True)    # JSON
    bioact_filters = Column(Text, nullable=True)    # JSON
    mol_filters = Column(Text, nullable=True)       # JSON
    sim_filters = Column(Text, nullable=True)       # JSON
    molecules_count = Column(Integer, nullable=True)
    error_msg = Column(Text, nullable=True)
    started_at = Column(DateTime, nullable=True)
    finished_at = Column(DateTime, nullable=True)

    job = relationship("ChemblJob", back_populates="items")
