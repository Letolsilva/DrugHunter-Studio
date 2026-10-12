"""Schemas Pydantic do módulo de Clustering MAIA."""

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict


class ClusteringIniciarRequest(BaseModel):
    admet_result_id: int
    fingerprint_type: str = "morgan"
    base_output_path: str = "/resultados/clustering"
    max_mols: Optional[int] = None


class ClusteringJobResponse(BaseModel):
    id: int
    admet_result_id: Optional[int]
    status: str
    target: str
    fingerprint_type: str
    base_input_path: str
    base_output_path: str
    max_mols: Optional[int]
    n_clusters: Optional[int]
    silhouette_score: Optional[float]
    result_csv_path: Optional[str]
    error_msg: Optional[str]
    created_at: datetime
    finished_at: Optional[datetime]

    model_config = ConfigDict(from_attributes=True)
