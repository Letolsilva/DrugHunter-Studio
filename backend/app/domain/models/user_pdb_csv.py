"""Modelo para armazenar o CSV de PDB codes por usuário (um por usuário)."""

from datetime import datetime
from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import relationship

from app.domain.models.base import Base


class UserPdbCsv(Base):
    """Armazena o pdb_codes.csv mais recente de cada usuário."""

    __tablename__ = "user_pdb_csv"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(
        Integer,
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        unique=True,
        index=True,
    )
    csv_content = Column(Text, nullable=False)
    target = Column(String(255), nullable=True)
    base_input_path = Column(String(512), nullable=True)
    updated_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    user = relationship("User")
