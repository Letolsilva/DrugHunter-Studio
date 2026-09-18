"""Modelo de rastreamento de jobs de clustering MAIA."""

from datetime import datetime
from sqlalchemy import Column, DateTime, Float, ForeignKey, Integer, String, Text, UniqueConstraint
from sqlalchemy.orm import relationship

from app.domain.models.base import Base


class ClusteringJob(Base):
    __tablename__ = "clustering_jobs"

    __table_args__ = (
        UniqueConstraint("user_id", "admet_result_id", "fingerprint_type", "max_mols", name="uq_clustering_user_admet_fp_mols"),
    )

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    admet_result_id = Column(Integer, ForeignKey("admet_results.id", ondelete="SET NULL"), nullable=True, index=True)

    status = Column(String(20), nullable=False, default="running")
    target = Column(String(255), nullable=False)
    fingerprint_type = Column(String(20), nullable=False, default="morgan")

    # Paths usados pelo worker (relativos ao dh_dir)
    base_input_path = Column(String(512), nullable=False)
    base_output_path = Column(String(512), nullable=False)

    # Configuração opcional
    max_mols = Column(Integer, nullable=True)

    # Resultado
    n_clusters = Column(Integer, nullable=True)
    silhouette_score = Column(Float, nullable=True)
    result_dir = Column(String(512), nullable=True)       # abs path a <dh_dir>/<base_output_path>/<target>/
    result_csv_path = Column(String(512), nullable=True)  # abs path ao CSV com labels
    error_msg = Column(Text, nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    finished_at = Column(DateTime, nullable=True)

    user = relationship("User")
    admet_result = relationship("AdmetResult")
