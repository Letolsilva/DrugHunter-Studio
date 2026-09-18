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
from app.domain.models.pdb_download import UserPdbDownload
from app.domain.models.redocking_job import RedockingJob
from app.domain.models.user_pdb_csv import UserPdbCsv
from app.domain.models.chembl_job import ChemblJob, ChemblJobItem
from app.domain.models.admet_result import AdmetResult
from app.domain.models.consensus_job import ConsensusJob
from app.domain.models.clustering_job import ClusteringJob
from app.domain.models.neurodock_model import NeuroDockModel
from app.domain.models.neurodock_prediction import NeuroDockPrediction

__all__ = [
    "Base",
    "User",
    "Protein",
    "Search",
    "SearchResult",
    "SystemConfig",
    "UserPdbDownload",
    "RedockingJob",
    "UserPdbCsv",
    "ChemblJob",
    "ChemblJobItem",
    "AdmetResult",
    "ConsensusJob",
    "ClusteringJob",
    "NeuroDockModel",
    "NeuroDockPrediction",
]
