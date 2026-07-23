// domain/models/redocking.model.ts

export type RedockingStatus = "pending" | "running" | "done" | "error";

export interface RedockingJobModel {
  id: number;
  status: RedockingStatus;
  target: string;
  charge_type: "am1" | "gas";
  email_notificacao: string | null;
  iniciado_em: string;
  finalizado_em: string | null;
  erro_msg: string | null;
}

export interface IniciarRedockingPayload {
  target: string;
  base_input_path: string;
  base_output_path: string;
  charge_type: "am1" | "gas";
  csv_content: string;
}

export interface CsvLinha {
  pdb_code: string;
  ligand: string;
  resnum: string;
  chain: string;
  resolution: string;
  rmsd?: string;
}

export interface ProntidaoItem {
  codigo: string;
  presente: boolean;
  formato_ok: boolean;
  origem: "pasta" | "cache" | "rcsb" | "faltando" | null;
}

export interface ProntidaoResponse {
  pasta: string;
  itens: ProntidaoItem[];
  prontos: number;
  total: number;
}

/** Parseia uma string CSV (com header) em array de CsvLinha */
export function parseCsvContent(content: string): CsvLinha[] {
  return content
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .slice(1) // pula o header
    .map((linha) => {
      const [pdb_code, ligand, resnum, chain, resolution, rmsd] = linha.split(",");
      return {
        pdb_code: pdb_code?.trim() ?? "",
        ligand: ligand?.trim() ?? "",
        resnum: resnum?.trim() ?? "",
        chain: chain?.trim() ?? "",
        resolution: resolution?.trim() ?? "",
        rmsd: rmsd?.trim() || undefined,
      };
    });
}
