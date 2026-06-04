"""Modelo de proteína (cache de estruturas PDB)."""

from datetime import datetime
from sqlalchemy import Boolean, Column, DateTime, Float, Integer, String, Text

from app.domain.models.base import Base


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
    depositado_em = Column(String(20))
    link_pdb = Column(String(200))

    # Storage do arquivo .pdb legacy — chave relativa usada pelo StorageService
    pdb_file_cached = Column(Boolean, default=False, nullable=False)
    pdb_storage_key = Column(String(50), nullable=True)  # ex: "5ESG.pdb"
    pdb_file_size = Column(Integer, nullable=True)  # tamanho em bytes

    # Storage do arquivo .cif (PDBx/mmCIF)
    cif_file_cached = Column(Boolean, default=False, nullable=False)
    cif_storage_key = Column(String(50), nullable=True)  # ex: "5ESG.cif"
    cif_file_size = Column(Integer, nullable=True)  # tamanho em bytes

    # Disponibilidade de formatos no RCSB (verificado no scraping)
    tem_legacy = Column(Boolean, default=True, nullable=False)
    tem_cif = Column(Boolean, default=True, nullable=False)

    criado_em = Column(DateTime, default=datetime.utcnow, nullable=False)
    ultima_consulta = Column(DateTime, default=datetime.utcnow, nullable=False)
    total_consultas = Column(Integer, default=1, nullable=False)
