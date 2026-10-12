"""Modelo de rastreamento de jobs de treinamento NeuroDock MAIA."""

from datetime import datetime
from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, Text, UniqueConstraint
from sqlalchemy.orm import relationship

from app.domain.models.base import Base


class NeuroDockModel(Base):
    __tablename__ = "neurodock_models"

    __table_args__ = (
        UniqueConstraint("user_id", "clustering_job_id", name="uq_neurodock_user_clustering"),
    )

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    clustering_job_id = Column(Integer, ForeignKey("clustering_jobs.id", ondelete="SET NULL"), nullable=True, index=True)

    status = Column(String(20), nullable=False, default="running")
    target = Column(String(255), nullable=False)
    evaluation_name = Column(String(255), nullable=False)
    fingerprint_type = Column(String(20), nullable=False, default="morgan")
    consensus_type = Column(String(20), nullable=False, default="min-max")

    # Paths DH-relativos usados pelo worker
    base_input_mols = Column(String(512), nullable=False)
    base_input_fingerprints = Column(String(512), nullable=False)
    base_input_consensus = Column(String(512), nullable=False)
    model_output_path = Column(String(512), nullable=False)
    history_output_path = Column(String(512), nullable=False)

    # Resultado
    n_targets = Column(Integer, nullable=True)
    n_train_mols = Column(Integer, nullable=True)
    error_msg = Column(Text, nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    finished_at = Column(DateTime, nullable=True)

    user = relationship("User")
    clustering_job = relationship("ClusteringJob")
