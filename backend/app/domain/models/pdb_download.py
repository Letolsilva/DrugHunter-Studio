"""Modelo de rastreamento de downloads de arquivos .pdb por usuário."""

from datetime import datetime
from sqlalchemy import Column, DateTime, ForeignKey, Integer, UniqueConstraint
from sqlalchemy.orm import relationship

from app.domain.models.base import Base


class UserPdbDownload(Base):
    """Registro de quais arquivos .pdb cada usuário logado baixou."""

    __tablename__ = "user_pdb_downloads"
    __table_args__ = (UniqueConstraint("user_id", "protein_id"),)

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(
        Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    protein_id = Column(
        Integer,
        ForeignKey("proteins.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    downloaded_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    user = relationship("User", back_populates="pdb_downloads")
    protein = relationship("Protein")
