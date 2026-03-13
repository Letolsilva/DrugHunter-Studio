"""
Modelos do banco de dados — SQLAlchemy (Fase 2)
Adicionado: SystemConfig para TTL configurável
"""

from datetime import datetime
from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import relationship, DeclarativeBase


class Base(DeclarativeBase):
    pass


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    username = Column(String(100), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    is_active = Column(Boolean, default=True)
    is_admin = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    searches = relationship("Search", back_populates="user")


class Protein(Base):
    """Cache de estruturas PDB — compartilhado entre todos os usuários."""

    __tablename__ = "proteins"

    id = Column(Integer, primary_key=True, index=True)
    pdb_id = Column(String(10), unique=True, index=True, nullable=False)
    proteina_buscada = Column(String(300), index=True)
    titulo = Column(Text)
    organismo = Column(String(500), index=True)
    classificacao = Column(String(200))
    resolucao = Column(Float)
    metodo = Column(String(100))
    tem_ligante = Column(Boolean, default=False)
    num_cadeias = Column(Integer)
    ramachandran = Column(Float)
    depositado_em = Column(String(20))
    qualidade = Column(String(50))
    link_pdb = Column(String(200))

    criado_em = Column(DateTime, default=datetime.utcnow, nullable=False)
    ultima_consulta = Column(DateTime, default=datetime.utcnow, nullable=False)
    total_consultas = Column(Integer, default=1, nullable=False)


class Search(Base):
    """Histórico de buscas por usuário."""

    __tablename__ = "searches"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    proteina_query = Column(String(500))
    organismo_query = Column(String(300))
    total_resultados = Column(Integer, default=0)
    veio_do_cache = Column(Boolean, default=False)
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


class SystemConfig(Base):
    """
    Configurações do sistema no banco.
    Permite alterar TTL e parâmetros sem reiniciar o servidor.

    Chaves existentes:
      ttl_dias            → dias sem consulta para expirar (padrão: 30)
      max_por_proteina    → max de resultados por proteína (padrão: 50)
      limpeza_automatica  → rodar limpeza TTL automaticamente (padrão: true)
    """

    __tablename__ = "system_config"

    id = Column(Integer, primary_key=True)
    chave = Column(String(100), unique=True, nullable=False, index=True)
    valor = Column(Text, nullable=False)
    descricao = Column(Text)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
