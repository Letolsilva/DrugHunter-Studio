// domain/models/admet.model.ts

export interface AdmetResultSummary {
  id: number;
  status: string;
  total_molecules: number | null;
  target: string | null;
  created_at: string;
}

export interface AdmetResultModel {
  id: number;
  status: "pending" | "running" | "done" | "error";
  source_type: string;
  chembl_job_item_id: number | null;
  target: string | null;
  base_output_path: string;
  total_molecules: number | null;
  excluded_toxic: number | null;
  bbb_plus: number | null;
  bbb_minus: number | null;
  hia_plus: number | null;
  pgp_plus: number | null;
  error_msg: string | null;
  created_at: string;
  finished_at: string | null;
}

export interface AdmetMoleculeModel {
  molecule_chembl_id: string;
  canonical_smiles: string;
  tpsa: number;
  wlogp: number;
  mw: number;
  hbd: number;
  hba: number;
  rb: number;
  bbb: "BBB+" | "BBB-";
  hia: "HIA+" | "HIA-";
  pgp: "PGP+" | "PGP-";
}

export interface AdmetMoleculesResponse {
  molecules: AdmetMoleculeModel[];
  total: number;
  page: number;
  per_page: number;
  pages: number;
}
