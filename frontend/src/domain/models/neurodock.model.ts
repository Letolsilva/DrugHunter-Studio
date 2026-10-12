// domain/models/neurodock.model.ts

export interface NeuroDockModelModel {
  id: number;
  clustering_job_id: number | null;
  status: "running" | "done" | "error" | "cancelled";
  target: string;
  evaluation_name: string;
  fingerprint_type: string;
  consensus_type: string;
  base_input_mols: string;
  base_input_fingerprints: string;
  base_input_consensus: string;
  model_output_path: string;
  history_output_path: string;
  n_targets: number | null;
  n_train_mols: number | null;
  error_msg: string | null;
  created_at: string;
  finished_at: string | null;
}

export interface NeuroDockPredictionModel {
  id: number;
  model_id: number;
  status: "running" | "done" | "error" | "cancelled";
  input_dataset: string;
  library_csv_path: string;
  top_k: number;
  batch_size: number;
  fingerprint_type: string;
  base_output_path: string;
  n_screened: number | null;
  n_selected: number | null;
  result_dir: string | null;
  error_msg: string | null;
  created_at: string;
  finished_at: string | null;
}

export interface NeuroDockPlotInfo {
  count: number;
  files: string[];
}

export interface NeuroDockTopMolecule {
  id: string;       // zinc_id ou molecule_chembl_id
  smiles: string;
  product_score: number;
  [key: string]: string | number; // scores por alvo
}
