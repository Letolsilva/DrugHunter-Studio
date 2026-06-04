"""Modelo de rastreamento de jobs de redocking."""

from datetime import datetime
from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import relationship

from app.domain.models.base import Base


class RedockingJob(Base):
    """Registro de cada execução de redocking disparada por um usuário."""

    __tablename__ = "redocking_jobs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(
        Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    # pending | running | done | error
    status = Column(String(20), nullable=False, default="pending")
    target = Column(String(255), nullable=False)
    base_input_path = Column(String(512), nullable=False)
    base_output_path = Column(String(512), nullable=False)
    charge_type = Column(String(10), nullable=False, default="am1")  # am1 | gas
    email_notificacao = Column(String(255), nullable=True)
    csv_content = Column(Text, nullable=True)
    erro_msg = Column(String(1000), nullable=True)
    iniciado_em = Column(DateTime, default=datetime.utcnow, nullable=False)
    finalizado_em = Column(DateTime, nullable=True)

    user = relationship("User")
