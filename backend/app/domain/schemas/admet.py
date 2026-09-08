"""Schemas Pydantic do módulo ADMET."""

from datetime import datetime
from typing import List, Literal, Optional

from pydantic import BaseModel, ConfigDict


# ── Requisições ───────────────────────────────────────────────────────────────

class AdmetRunRequest(BaseModel):
    chembl_job_item_id: int


# ── Molécula individual ───────────────────────────────────────────────────────

class AdmetMoleculeResponse(BaseModel):
    molecule_chembl_id: str
    canonical_smiles: str
    tpsa: float
    wlogp: float
    mw: float
    hbd: int
    hba: int
    rb: int
    bbb: Literal["BBB+", "BBB-"]
    hia: Literal["HIA+", "HIA-"]
    pgp: Literal["PGP+", "PGP-"]


class AdmetToxicMoleculeResponse(BaseModel):
    molecule_chembl_id: str
    canonical_smiles: str
    reason: str


# ── Resposta do resultado ─────────────────────────────────────────────────────

class AdmetResultResponse(BaseModel):
    id: int
    status: str
    source_type: str
    chembl_job_item_id: Optional[int]
    target: Optional[str] = None
    base_output_path: str
    total_molecules: Optional[int]
    excluded_toxic: Optional[int]
    bbb_plus: Optional[int]
    bbb_minus: Optional[int]
    hia_plus: Optional[int]
    pgp_plus: Optional[int]
    error_msg: Optional[str]
    created_at: datetime
    finished_at: Optional[datetime]

    model_config = ConfigDict(from_attributes=True)


class AdmetMoleculesListResponse(BaseModel):
    molecules: List[AdmetMoleculeResponse]
    total: int
    page: int
    per_page: int
    pages: int
