// domain/models/pdb_files.model.ts

export interface PdbFileModel {
  pdb_id: string;
  titulo: string | null;
  organismo: string | null;
  resolucao: number | null;
  metodo: string | null;
  pdb_file_size: number | null;
  downloaded_at: string;
  formato: "legacy" | "cif";
  tem_legacy?: boolean;
  tem_cif?: boolean;
}
