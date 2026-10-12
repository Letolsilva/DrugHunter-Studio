"""Schemas Pydantic do módulo NeuroDock MAIA."""

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict


class NeuroDockTreinarRequest(BaseModel):
    clustering_job_id: int
    evaluation_name: str = "MorganBestModel"
    consensus_type: str = "min-max"
    model_output_path: str = "/resultados/neurodock/model"
    history_output_path: str = "/resultados/neurodock/plots"
    n_trials: int = 20


class NeuroDockModelResponse(BaseModel):
    id: int
    clustering_job_id: Optional[int]
    status: str
    target: str
    evaluation_name: str
    fingerprint_type: str
    consensus_type: str
    base_input_mols: str
    base_input_fingerprints: str
    base_input_consensus: str
    model_output_path: str
    history_output_path: str
    n_targets: Optional[int]
    n_train_mols: Optional[int]
    error_msg: Optional[str]
    created_at: datetime
    finished_at: Optional[datetime]

    model_config = ConfigDict(from_attributes=True)


class NeuroDockPredictRequest(BaseModel):
    library_csv_path: str          # path absoluto do CSV com moléculas candidatas
    input_dataset: str = "Library" # nome descritivo do dataset
    top_k: int = 50
    batch_size: int = 10000
    base_output_path: str = "/resultados/neurodock/predictions"


class NeuroDockPredictionResponse(BaseModel):
    id: int
    model_id: int
    status: str
    input_dataset: str
    library_csv_path: str
    top_k: int
    batch_size: int
    fingerprint_type: str
    base_output_path: str
    n_screened: Optional[int]
    n_selected: Optional[int]
    result_dir: Optional[str]
    error_msg: Optional[str]
    created_at: datetime
    finished_at: Optional[datetime]

    model_config = ConfigDict(from_attributes=True)
