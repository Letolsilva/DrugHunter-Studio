"""Modelo de rastreamento de jobs de triagem virtual NeuroDock MAIA."""

from datetime import datetime
from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import relationship

from app.domain.models.base import Base


class NeuroDockPrediction(Base):
    __tablename__ = "neurodock_predictions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    model_id = Column(Integer, ForeignKey("neurodock_models.id", ondelete="CASCADE"), nullable=False, index=True)

    status = Column(String(20), nullable=False, default="running")

    # Biblioteca de candidatos
    input_dataset = Column(String(512), nullable=False)   # nome do dataset (ex: ZINC)
    library_csv_path = Column(String(512), nullable=False) # path absoluto do CSV da biblioteca

    # Parâmetros
    top_k = Column(Integer, nullable=False, default=50)
    batch_size = Column(Integer, nullable=False, default=10000)
    fingerprint_type = Column(String(20), nullable=False, default="morgan")

    # Paths DH-relativos
    base_output_path = Column(String(512), nullable=False)

    # Resultado
    n_screened = Column(Integer, nullable=True)
    n_selected = Column(Integer, nullable=True)
    result_dir = Column(String(512), nullable=True)
    error_msg = Column(Text, nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    finished_at = Column(DateTime, nullable=True)

    user = relationship("User")
    model = relationship("NeuroDockModel")
