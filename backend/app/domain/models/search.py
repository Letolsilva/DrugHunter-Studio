"""Modelos de busca: histórico de buscas e relação busca–proteína."""

from datetime import datetime
from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    ForeignKey,
    Integer,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import relationship

from app.domain.models.base import Base


class Search(Base):
    """Histórico de buscas por usuário."""

    __tablename__ = "searches"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    proteina_query = Column(String(500))
    organismo_query = Column(String(300))
    total_resultados = Column(Integer, default=0)
    veio_do_cache = Column(Boolean, default=False)
    teve_erro = Column(Boolean, default=False)
    mensagem_erro = Column(Text, nullable=True)
    criado_em = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="searches")
    resultados = relationship(
        "SearchResult", back_populates="search", cascade="all, delete-orphan"
    )


class SearchResult(Base):
    """Relacionamento N:N entre Search e Protein."""

    __tablename__ = "search_results"
    __table_args__ = (UniqueConstraint("search_id", "protein_id"),)

    id = Column(Integer, primary_key=True, index=True)
    search_id = Column(
        Integer, ForeignKey("searches.id", ondelete="CASCADE"), nullable=False
    )
    protein_id = Column(
        Integer, ForeignKey("proteins.id", ondelete="CASCADE"), nullable=False
    )

    search = relationship("Search", back_populates="resultados")
    protein = relationship("Protein")
