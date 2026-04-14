"""Schemas Pydantic do módulo de redocking."""

from datetime import datetime
from typing import List, Literal, Optional

from pydantic import BaseModel, ConfigDict


class IniciarRedockingRequest(BaseModel):
    target: str
    base_input_path: str
    base_output_path: str
    charge_type: Literal["am1", "gas"] = "am1"
    csv_content: str


class RedockingJobResponse(BaseModel):
    id: int
    status: str
    target: str
    charge_type: str
    email_notificacao: Optional[str]
    iniciado_em: datetime
    finalizado_em: Optional[datetime]
    erro_msg: Optional[str]

    model_config = ConfigDict(from_attributes=True)


class RedockingJobListResponse(BaseModel):
    jobs: List[RedockingJobResponse]


class SalvarCsvRequest(BaseModel):
    csv_content: str
    target: str = ""
    base_input_path: str = ""


class CsvResponse(BaseModel):
    csv_content: str
    target: Optional[str] = None
    base_input_path: Optional[str] = None
    updated_at: datetime


class RedockingDefaultsResponse(BaseModel):
    base_input_path: str
    last_target: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)
