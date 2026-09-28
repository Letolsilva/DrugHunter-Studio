// domain/models/molecular_dynamics.model.ts

export interface MDParamsModel {
  // Grupo 3 — Preparação do Sistema
  receptor_keepWater: boolean;
  ph_value: number;
  padding_value: number;
  ionic_strength: number;
  neutralize: boolean;
  solvatation: boolean;
  water_model: string;
  box_shape: string;
  // Grupo 4 — Campo de Força
  protein_forcefield: string;
  solvent_forcefield: string;
  ligand_forcefield: string;
  constraints: string;
  rigidWater: boolean;
  removeCMMotion: boolean;
  use_periodic_boundary: boolean;
  nonbondedCutoff: number;
  ewaldErrorTolerance: number;
  useDispersionCorrection: boolean;
  hydrogenMass: number | null;
  // Grupo 5 — Barostato
  barostat_pressure: number;
  barostat_frequency: number;
  // Grupo 6 — Simulação
  simulation_temperature: number;
  friction_coeff: number;
  integration_step: number;
  integrator_tolerance: number;
  equilibration_duration_steps: number;
  production_duration_ns: number;
  // Grupo 7 — Restrições Externas
  use_HMR: boolean;
  externalForce_constrain_kJ: number | null;
  restraint_target_atoms: string[];
  restraint_axes: string[];
  standard_amino_acids: string[];
  // Grupo 8 — Hardware
  platform_name: string;
  // Grupo 9 — Saída
  reporting_interval_steps: number;
  checkpoint_interval_steps: number;
  enforcePeriodicBox_dcd: boolean;
  seed: number;
}

export const DEFAULT_MD_PARAMS: MDParamsModel = {
  receptor_keepWater: false,
  ph_value: 7.4,
  padding_value: 1.0,
  ionic_strength: 0.1,
  neutralize: true,
  solvatation: true,
  water_model: "TIP3P",
  box_shape: "dodecahedron",
  protein_forcefield: "AMBER_FF14SB",
  solvent_forcefield: "TIP3P_STANDARD",
  ligand_forcefield: "OPENFF_2_2_0",
  constraints: "HBonds",
  rigidWater: true,
  removeCMMotion: true,
  use_periodic_boundary: true,
  nonbondedCutoff: 1.0,
  ewaldErrorTolerance: 5e-4,
  useDispersionCorrection: true,
  hydrogenMass: null,
  barostat_pressure: 1.0,
  barostat_frequency: 25,
  simulation_temperature: 310.0,
  friction_coeff: 1.0,
  integration_step: 2.0,
  integrator_tolerance: 1e-5,
  equilibration_duration_steps: 100000,
  production_duration_ns: 50.0,
  use_HMR: false,
  externalForce_constrain_kJ: null,
  restraint_target_atoms: ["CA", "N", "C", "O"],
  restraint_axes: ["x", "y", "z"],
  standard_amino_acids: [
    "ALA", "ARG", "ASN", "ASP", "CYS", "GLU", "GLN", "GLY", "HIS",
    "ILE", "LEU", "LYS", "MET", "PHE", "PRO", "SER", "THR", "TRP",
    "TYR", "VAL",
  ],
  platform_name: "CUDA",
  reporting_interval_steps: 1000,
  checkpoint_interval_steps: 1000,
  enforcePeriodicBox_dcd: true,
  seed: 73,
};

export interface MDJobModel {
  id: number;
  status: "pending" | "running" | "done" | "error";
  molecule_id: string;
  smiles: string | null;
  target: string | null;
  ligand_source: "consensus" | "upload";
  consensus_job_id: number | null;
  ligand_filename: string | null;
  receptor_source: "dh_prepared" | "upload" | "manual";
  receptor_path: string | null;
  receptor_filename: string | null;
  base_output_path: string | null;
  output_path_absolute: string | null;
  error_msg: string | null;
  created_at: string;
  finished_at: string | null;
  params: MDParamsModel | null;
}

export interface MDConsensusJobOption {
  id: number;
  target: string;
  status: string;
  criado_em: string | null;
}

export interface MDLiganteInfo {
  filename: string;
  label: string;
}

export interface MDReceptorInfo {
  filename: string;
}

export interface MDUploadResponse {
  file_path: string;
  filename: string;
}

export interface MdAnalysisJobModel {
  id: number;
  md_job_id: number;
  status: "pending" | "running" | "done" | "error";
  error_msg: string | null;
  created_at: string;
  finished_at: string | null;
}

export interface MdAnalysisFilesModel {
  analysis: string[];
  visualization: string[];
}

export interface IniciarMDPayload {
  molecule_id: string;
  smiles?: string;
  ligand_source: "consensus" | "upload";
  consensus_job_id?: number;
  ligand_filename?: string;
  ligand_file_path?: string;
  receptor_source: "dh_prepared" | "upload" | "manual";
  receptor_path?: string;
  receptor_filename?: string;
  params: MDParamsModel;
}
