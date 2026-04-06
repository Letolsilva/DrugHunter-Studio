// data/adapters/pdb_files.adapter.ts
import type { PdbFileModel } from "../../domain/models/pdb_files.model";

interface PdbFileRaw {
  pdb_id: string;
  titulo: string | null;
  organismo: string | null;
  resolucao: number | null;
  metodo: string | null;
  pdb_file_size: number | null;
  downloaded_at: string;
  formato?: string;
  tem_legacy?: boolean;
  tem_cif?: boolean;
}

export function adaptPdbFile(raw: PdbFileRaw): PdbFileModel {
  return {
    pdb_id: raw.pdb_id,
    titulo: raw.titulo ?? null,
    organismo: raw.organismo ?? null,
    resolucao: raw.resolucao ?? null,
    metodo: raw.metodo ?? null,
    pdb_file_size: raw.pdb_file_size ?? null,
    downloaded_at: raw.downloaded_at,
    formato: (raw.formato === "cif" ? "cif" : "legacy") as "legacy" | "cif",
    tem_legacy: raw.tem_legacy ?? true,
    tem_cif: raw.tem_cif ?? true,
  };
}
