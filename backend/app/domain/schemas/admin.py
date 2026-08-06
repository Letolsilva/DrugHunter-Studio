"""Schemas Pydantic do módulo de administração."""

from typing import List, Optional
from pydantic import BaseModel, Field


class ConfigUpdate(BaseModel):
    valor: str = Field(..., description="Novo valor da configuração")


class AdminToggle(BaseModel):
    is_admin: bool = Field(..., description="Nova permissão de administrador")


class CheckItemDH(BaseModel):
    nome: str
    ok: bool
    mensagem: str
    como_corrigir: Optional[str] = None


class ValidacaoDrugHunterResponse(BaseModel):
    checks: List[CheckItemDH]
