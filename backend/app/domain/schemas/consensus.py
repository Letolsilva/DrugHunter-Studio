"""Schemas Pydantic do módulo de Docking de Consenso."""

from datetime import datetime
from typing import List, Literal, Optional

from pydantic import BaseModel, ConfigDict


class ConsensusIniciarRequest(BaseModel):
    admet_result_id: int
    selected_categories: List[Literal["bbb_plus", "bbb_minus", "hia_plus", "toxic", "all"]]
    pdb_id: str
    ligand_resname: str
    ligand_resnum: int
    chain: str
    base_input_path: str
    base_docking_output_path: str
    charge_type: Literal["gas", "am1"] = "am1"
    prepare_complex: bool = False
    max_mols: Optional[int] = None


class ConsensusJobResponse(BaseModel):
    id: int
    admet_result_id: Optional[int]
    status: str
    target: str
    pdb_id: str
    ligand_resname: str
    ligand_resnum: int
    chain: str
    charge_type: str
    prepare_complex: bool
    selected_categories: Optional[str]
    base_input_path: str
    base_docking_output_path: str
    base_selected_mols: str
    mol_count: Optional[int]
    result_json: Optional[str]
    has_correlation: bool
    error_msg: Optional[str]
    created_at: datetime
    finished_at: Optional[datetime]

    model_config = ConfigDict(from_attributes=True)


class ConsensusRedockingJobItem(BaseModel):
    """Job de redocking simplificado — usado para pré-preencher o formulário de consenso."""
    id: int
    target: str
    base_input_path: str
    base_output_path: str
    charge_type: str
    csv_content: str
    status: str
    iniciado_em: datetime

    model_config = ConfigDict(from_attributes=True)


class ConsensusRedockingJobsResponse(BaseModel):
    jobs: List[ConsensusRedockingJobItem]
