"""Re-exporta todos os schemas do domínio."""

from app.domain.schemas.search import ProteinSchema, CancelarRequest
from app.domain.schemas.auth import (
    RegistroRequest,
    RefreshRequest,
    AlterarSenhaRequest,
    HistoricoItemSchema,
    HistoricoDetalheSchema,
)
from app.domain.schemas.admin import ConfigUpdate

__all__ = [
    "ProteinSchema",
    "CancelarRequest",
    "RegistroRequest",
    "RefreshRequest",
    "AlterarSenhaRequest",
    "HistoricoItemSchema",
    "HistoricoDetalheSchema",
    "ConfigUpdate",
]
