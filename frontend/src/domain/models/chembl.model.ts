// domain/models/chembl.model.ts

export interface ChemblTargetFilters {
  organism: string;
  type__in: string[];
  relationship_type: string;
}

export interface ChemblBioactFilters {
  standard_type__in: string[];
  molecule_type: string;
  max_value_ref: number;
  standard_units: string;
}

export interface ChemblMolFilters {
  natural_product: 0 | 1;
  np_likeness: 0 | 1;
}

export interface ChemblSimFilters {
  similarity: number;
  natural_product: 0 | 1;
  np_likeness: 0 | 1;
  molecule_type: string;
  molecular_weight__lte: number;
}

export interface ChemblItemConfig {
  /** ID local para controle do grupo no frontend — não vai ao banco */
  id: string;
  target_names: string[];
  chembl_search_id: string; // ID ChEMBL opcional para busca (ex: CHEMBL1914)
  target_filters: ChemblTargetFilters;
  bioact_filters: ChemblBioactFilters;
  mol_filters: ChemblMolFilters;
  sim_filters: ChemblSimFilters;
}

export const DEFAULT_TARGET_FILTERS: ChemblTargetFilters = {
  organism: "Homo sapiens",
  type__in: ["SINGLE PROTEIN"],
  relationship_type: "DIRECT",
};

export const DEFAULT_BIOACT_FILTERS: ChemblBioactFilters = {
  standard_type__in: ["IC50", "Ki"],
  molecule_type: "small molecule",
  max_value_ref: 1000,
  standard_units: "nM",
};

export const DEFAULT_MOL_FILTERS: ChemblMolFilters = {
  natural_product: 0,
  np_likeness: 0,
};

export const DEFAULT_SIM_FILTERS: ChemblSimFilters = {
  similarity: 60,
  natural_product: 0,
  np_likeness: 0,
  molecule_type: "small molecule",
  molecular_weight__lte: 500,
};

export interface ChemblMoleculeModel {
  molecule_chembl_id: string;
  canonical_smiles: string | null;
  pchembl_value: number | null;
  value: number | null;
  type: string;
  units: string | null;
  target_organism: string | null;
  target_pref_name: string | null;
  molecule_pref_name: string | null;
}

export interface ChemblProgressEvent {
  tipo:
    | "inicio_grupo"
    | "item_inicio"
    | "etapa"
    | "item_fim"
    | "item_erro"
    | "fim_grupo"
    | "erro_fatal";
  idx?: number;
  item_id?: number;
  target?: string;
  etapa?: string;
  status?: string;
  job_id?: number;
  msg?: string;
  molecules_count?: number;
  total?: number;
}

export interface ChemblJobItemModel {
  id: number;
  target_name: string;
  folder_name: string;
  status: string;
  molecules_count: number | null;
  started_at: string | null;
  finished_at: string | null;
  error_msg: string | null;
  current_step: string | null;
}

export interface ChemblJobModel {
  id: number;
  status: string;
  base_output_path: string;
  created_at: string;
  finished_at: string | null;
  error_msg: string | null;
  items: ChemblJobItemModel[];
}

export interface SimBin {
  range: string;
  count: number;
}

export interface NetworkInfo {
  filename: string;
  item_folder: string;
  item_name: string;
  analysis_type: "SIMS" | "MOLS";
  metric: string;
  fingerprint: string;
  scaffold_smiles: string | null;
  mcc_count: number;
  total_nodes: number;
  has_plot: boolean;
  sim_bins: SimBin[];
}
