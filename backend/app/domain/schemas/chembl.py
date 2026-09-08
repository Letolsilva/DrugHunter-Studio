"""Schemas Pydantic do módulo ChEMBL."""

from datetime import datetime
from typing import List, Literal, Optional

from pydantic import BaseModel, ConfigDict, Field


# ── Filtros de entrada ────────────────────────────────────────────────────────

class ChemblTargetFilters(BaseModel):
    organism: str = "Homo sapiens"
    type__in: List[str] = Field(default_factory=lambda: ["SINGLE PROTEIN"])
    relationship_type: str = "DIRECT"


class ChemblBioactFilters(BaseModel):
    standard_type__in: List[str] = Field(default_factory=lambda: ["Ki"])
    molecule_type: str = "small molecule"
    max_value_ref: int = 1000
    standard_units: str = "nM"


class ChemblMolFilters(BaseModel):
    natural_product: int = 0
    np_likeness: int = 0


class ChemblSimFilters(BaseModel):
    similarity: int = 60
    natural_product: int = 0
    np_likeness: int = 0
    molecule_type: str = "small molecule"
    molecular_weight__lte: int = 500


class ChemblItemRequest(BaseModel):
    target_name: str
    folder_name: str
    chembl_search_id: Optional[str] = None  # ID ChEMBL para busca (ex: CHEMBL1914) quando o nome não é encontrado
    target_filters: ChemblTargetFilters = Field(default_factory=ChemblTargetFilters)
    bioact_filters: ChemblBioactFilters = Field(default_factory=ChemblBioactFilters)
    mol_filters: ChemblMolFilters = Field(default_factory=ChemblMolFilters)
    sim_filters: ChemblSimFilters = Field(default_factory=ChemblSimFilters)


class ChemblRunRequest(BaseModel):
    items: List[ChemblItemRequest]
    base_output_path: str


# ── Análise molecular ─────────────────────────────────────────────────────────

class ChemblAnalysisRequest(BaseModel):
    job_id: int
    fingerprint: Literal["morgan", "maccs", "pharmacophore"] = "morgan"
    metric: Literal["Tanimoto", "Dice", "Cosine"] = "Tanimoto"
    base_output_path: str


# ── Respostas ─────────────────────────────────────────────────────────────────

class ChemblJobItemResponse(BaseModel):
    id: int
    target_name: str
    folder_name: str
    status: str
    molecules_count: Optional[int]
    started_at: Optional[datetime]
    finished_at: Optional[datetime]
    error_msg: Optional[str]
    current_step: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class ChemblJobResponse(BaseModel):
    id: int
    status: str
    base_output_path: str
    created_at: datetime
    finished_at: Optional[datetime]
    error_msg: Optional[str]
    items: List[ChemblJobItemResponse]

    model_config = ConfigDict(from_attributes=True)


class ChemblJobListResponse(BaseModel):
    jobs: List[ChemblJobResponse]


# ── Moléculas e status de análise ─────────────────────────────────────────────

class ChemblMoleculeResponse(BaseModel):
    molecule_chembl_id: str
    canonical_smiles: Optional[str]
    molecule_pref_name: Optional[str]
    pchembl_value: Optional[float]
    value: Optional[float]
    type: Optional[str]
    units: Optional[str]
    target_organism: Optional[str]
    target_pref_name: Optional[str]


class ChemblMoleculesListResponse(BaseModel):
    molecules: List[ChemblMoleculeResponse]
    total: int
    page: int
    per_page: int


class ChemblAnalysisStatusResponse(BaseModel):
    has_analysis: bool
    analysis_running: bool = False
    centroids_count: int
    similarity_files: List[str]
    mcc_ids: List[str] = Field(default_factory=list)
    mcc_sims_ids: List[str] = Field(default_factory=list)
    mcc_mols_ids: List[str] = Field(default_factory=list)


class SimBin(BaseModel):
    range: str
    count: int


class ChemblNetworkInfo(BaseModel):
    filename: str
    item_folder: str
    item_name: str
    analysis_type: str
    metric: str
    fingerprint: str
    scaffold_smiles: Optional[str]
    mcc_count: int
    total_nodes: int
    has_plot: bool
    sim_bins: List[SimBin]


class ChemblNetworksResponse(BaseModel):
    networks: List[ChemblNetworkInfo]
