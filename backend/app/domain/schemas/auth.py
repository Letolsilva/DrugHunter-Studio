"""Schemas Pydantic do módulo de autenticação."""

from typing import Optional, List
from pydantic import BaseModel, EmailStr, Field

from app.domain.schemas.search import ProteinSchema


class RegistroRequest(BaseModel):
    email: EmailStr
    username: str = Field(..., min_length=3, max_length=50)
    password: str = Field(..., min_length=6)


class RefreshRequest(BaseModel):
    refresh_token: str


class AlterarSenhaRequest(BaseModel):
    senha_atual: str
    nova_senha: str = Field(..., min_length=6)


class HistoricoItemSchema(BaseModel):
    id: int
    proteina_query: Optional[str]
    organismo_query: Optional[str]
    total_resultados: int
    veio_do_cache: bool
    teve_erro: bool
    mensagem_erro: Optional[str]
    criado_em: Optional[str]


class HistoricoDetalheSchema(BaseModel):
    id: int
    proteina_query: Optional[str]
    organismo_query: Optional[str]
    total_resultados: int
    veio_do_cache: bool
    criado_em: Optional[str]
    proteinas: List[ProteinSchema]
