"""Schemas Pydantic do módulo de administração."""

from pydantic import BaseModel, Field


class ConfigUpdate(BaseModel):
    valor: str = Field(..., description="Novo valor da configuração")
