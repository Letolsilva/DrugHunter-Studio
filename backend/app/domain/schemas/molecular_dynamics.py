"""Schemas Pydantic do módulo Dinâmica Molecular."""

from datetime import datetime
from typing import List, Literal, Optional

from pydantic import BaseModel, ConfigDict, model_validator


class MDParams(BaseModel):
    # Grupo 3 — Preparação do Sistema
    receptor_keepWater: bool = False
    ph_value: float = 7.4
    padding_value: float = 1.0          # nm
    ionic_strength: float = 0.1         # mol/L
    neutralize: bool = True
    solvatation: bool = True
    water_model: str = "TIP3P"
    box_shape: str = "dodecahedron"

    # Grupo 4 — Campo de Força
    protein_forcefield: str = "AMBER_FF14SB"
    solvent_forcefield: str = "TIP3P_STANDARD"
    ligand_forcefield: str = "OPENFF_2_2_0"
    constraints: str = "HBonds"
    rigidWater: bool = True
    removeCMMotion: bool = True
    use_periodic_boundary: bool = True
    nonbondedCutoff: float = 1.0        # nm
    ewaldErrorTolerance: float = 5e-4
    useDispersionCorrection: bool = True
    hydrogenMass: Optional[float] = None  # amu

    # Grupo 5 — Barostato (NPT)
    barostat_pressure: float = 1.0      # atm
    barostat_frequency: int = 25

    # Grupo 6 — Parâmetros da Simulação
    simulation_temperature: float = 310.0  # K
    friction_coeff: float = 1.0            # /ps
    integration_step: float = 2.0          # fs
    integrator_tolerance: float = 1e-5
    equilibration_duration_steps: int = 100000
    production_duration_ns: float = 50.0

    # Grupo 7 — Restrições Externas
    use_HMR: bool = False
    externalForce_constrain_kJ: Optional[float] = None
    restraint_target_atoms: List[str] = ["CA", "N", "C", "O"]
    restraint_axes: List[str] = ["x", "y", "z"]
    standard_amino_acids: List[str] = [
        "ALA", "ARG", "ASN", "ASP", "CYS", "GLU", "GLN", "GLY", "HIS",
        "ILE", "LEU", "LYS", "MET", "PHE", "PRO", "SER", "THR", "TRP",
        "TYR", "VAL",
    ]

    # Grupo 8 — Hardware
    platform_name: str = "CUDA"

    # Grupo 9 — Saída e Reprodutibilidade
    reporting_interval_steps: int = 1000
    checkpoint_interval_steps: int = 1000
    enforcePeriodicBox_dcd: bool = True
    seed: int = 73


class IniciarMDRequest(BaseModel):
    molecule_id: str
    smiles: Optional[str] = None

    # --- Fonte do ligante ---
    ligand_source: Literal["consensus", "upload"]
    consensus_job_id: Optional[int] = None    # obrigatório se ligand_source="consensus"
    ligand_filename: Optional[str] = None     # obrigatório se ligand_source="consensus"
    ligand_file_path: Optional[str] = None   # preenchido pelo backend após upload

    # --- Fonte do receptor ---
    receptor_source: Literal["dh_prepared", "upload", "manual"] = "dh_prepared"
    receptor_path: Optional[str] = None       # obrigatório se "upload" ou "manual"
    receptor_filename: Optional[str] = None   # obrigatório se "manual"

    params: MDParams = MDParams()

    @model_validator(mode="after")
    def _validar_fontes(self) -> "IniciarMDRequest":
        if self.ligand_source == "consensus":
            if not self.consensus_job_id:
                raise ValueError("consensus_job_id é obrigatório quando ligand_source='consensus'.")
            if not self.ligand_filename:
                raise ValueError("ligand_filename é obrigatório quando ligand_source='consensus'.")
        elif self.ligand_source == "upload":
            if not self.ligand_file_path:
                raise ValueError("ligand_file_path é obrigatório quando ligand_source='upload'.")

        if self.receptor_source == "manual":
            if not self.receptor_path:
                raise ValueError("receptor_path é obrigatório quando receptor_source='manual'.")
            if not self.receptor_filename:
                raise ValueError("receptor_filename é obrigatório quando receptor_source='manual'.")
        elif self.receptor_source == "upload":
            if not self.receptor_path:
                raise ValueError("receptor_path é obrigatório quando receptor_source='upload'.")

        return self


class UploadFileResponse(BaseModel):
    file_path: str
    filename: str


class MDLiganteInfo(BaseModel):
    filename: str
    label: str


class MDReceptorInfo(BaseModel):
    filename: str


class MDJobResponse(BaseModel):
    id: int
    status: str
    molecule_id: str
    smiles: Optional[str]
    target: Optional[str]
    ligand_source: str
    consensus_job_id: Optional[int] = None
    ligand_filename: Optional[str]
    receptor_source: str
    receptor_path: Optional[str]
    receptor_filename: Optional[str]
    base_output_path: Optional[str]
    output_path_absolute: Optional[str] = None
    error_msg: Optional[str]
    warnings: list[str] = []
    created_at: datetime
    finished_at: Optional[datetime]
    params: Optional[dict] = None

    model_config = ConfigDict(from_attributes=True)


class MdAnalysisJobResponse(BaseModel):
    id: int
    md_job_id: int
    status: str
    error_msg: Optional[str]
    created_at: datetime
    finished_at: Optional[datetime]
    model_config = ConfigDict(from_attributes=True)
