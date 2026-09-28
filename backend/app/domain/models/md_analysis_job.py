"""Modelo de rastreamento de jobs de Análise de Dinâmica Molecular."""

from datetime import datetime
from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import relationship

from app.domain.models.base import Base


class MdAnalysisJob(Base):
    """Registro de cada execução de análise de trajetória de dinâmica molecular."""

    __tablename__ = "md_analysis_jobs"

    id        = Column(Integer, primary_key=True, index=True)
    user_id   = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    md_job_id = Column(Integer, ForeignKey("md_jobs.id", ondelete="CASCADE"), nullable=False, index=True)

    # pending | running | done | error
    status    = Column(String(20), nullable=False, default="pending")

    error_msg   = Column(Text, nullable=True)
    created_at  = Column(DateTime, default=datetime.utcnow, nullable=False)
    finished_at = Column(DateTime, nullable=True)

    user   = relationship("User")
    md_job = relationship("MDJob")
