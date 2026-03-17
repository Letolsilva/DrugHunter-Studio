"""
Re-exporta todos os modelos do domínio.

Importar de aqui garante que todos os modelos sejam registrados
no metadata do SQLAlchemy antes de criar as tabelas.
"""

from app.domain.models.base import Base
from app.domain.models.user import User
from app.domain.models.protein import Protein
from app.domain.models.search import Search, SearchResult
from app.domain.models.config import SystemConfig

__all__ = ["Base", "User", "Protein", "Search", "SearchResult", "SystemConfig"]
