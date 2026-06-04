"""Modelo de configuração do sistema (TTL, limites, flags)."""

from datetime import datetime
from sqlalchemy import Column, DateTime, Integer, String, Text

from app.domain.models.base import Base


class SystemConfig(Base):
    """
    Configurações do sistema persistidas no banco.
    Permite alterar TTL e parâmetros sem reiniciar o servidor.

    Chaves:
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
