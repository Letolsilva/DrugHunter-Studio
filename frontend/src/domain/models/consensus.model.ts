// domain/models/consensus.model.ts

export interface ConsensusJobModel {
  id: number;
  admet_result_id: number | null;
  status: "pending" | "running" | "done" | "error";
  target: string;
  pdb_id: string;
  ligand_resname: string;
  ligand_resnum: number;
  chain: string;
  charge_type: string;
  prepare_complex: boolean;
  selected_categories: string | null; // JSON string
  base_input_path: string;
  base_docking_output_path: string;
  base_selected_mols: string;
  mol_count: number | null;
  result_json: string | null;         // JSON string com lista de linhas
  has_correlation: boolean;
  error_msg: string | null;
  created_at: string;
  finished_at: string | null;
}

export interface ConsensusResultRowModel {
  molecule: string;
  vina: number;
  dock6: number;
  "z-score": number;
  "min-max": number;
}

export interface ConsensusRedockingJobModel {
  id: number;
  target: string;
  base_input_path: string;
  base_output_path: string;
  charge_type: string;
  csv_content: string;
  status: string;
  iniciado_em: string;
}

export interface ConsensusRedockingJobsResponse {
  jobs: ConsensusRedockingJobModel[];
}

/** Linha do csv_content do RedockingJob já parseada */
export interface PdbCodeRow {
  pdb_code: string;
  ligand: string;
  resnum: number;
  chain: string;
  resolution: string;
}
