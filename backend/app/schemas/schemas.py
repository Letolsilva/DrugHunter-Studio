"""
Schemas Pydantic — validação de entrada e saída
"""

from typing import Optional
from pydantic import BaseModel


class BuscaRequest(BaseModel):
    proteina: Optional[str] = None
    organismo: Optional[str] = None


class ProteinSchema(BaseModel):
    pdb_id: str
    titulo: Optional[str] = None
    organismo: Optional[str] = None
    classificacao: Optional[str] = None
    resolucao: Optional[float] = None
    metodo: Optional[str] = None
    tem_ligante: Optional[bool] = None
    num_cadeias: Optional[int] = None
    ramachandran: Optional[float] = None
    depositado_em: Optional[str] = None
    qualidade: Optional[str] = None
    link_pdb: Optional[str] = None

    class Config:
        from_attributes = True
