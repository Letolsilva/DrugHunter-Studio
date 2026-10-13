// domain/models/clustering.model.ts

export interface ClusteringJobModel {
  id: number;
  admet_result_id: number | null;
  status: "running" | "done" | "error" | "cancelled";
  target: string;
  fingerprint_type: string;
  base_input_path: string;
  base_output_path: string;
  max_mols: number | null;
  n_clusters: number | null;
  silhouette_score: number | null;
  result_csv_path: string | null;
  error_msg: string | null;
  created_at: string;
  finished_at: string | null;
}

export interface ClusteringMoleculeRow {
  molecule_chembl_id: string;
  canonical_smiles: string;
  label: number;
}

export interface TsnePoint {
  id: string;
  smiles: string;
  label: number;
  x: number;
  y: number;
}
