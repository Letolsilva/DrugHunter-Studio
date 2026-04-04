// data/adapters/search.adapter.ts
import type { PdbResultModel } from "../../domain/models/search.model";

function normalizarOrganismo(organismo: unknown): string {
  if (!organismo || typeof organismo !== "string") return "N/A";
  // Capitaliza cada segmento separado por " | " com title-case científico:
  // primeira letra maiúscula, restante minúsculo
  return organismo
    .split(" | ")
    .map((seg) => {
      const s = seg.trim().toLowerCase();
      return s.charAt(0).toUpperCase() + s.slice(1);
    })
    .join(" | ");
}

export function adaptSearchResult(
  raw: Partial<PdbResultModel> & Record<string, unknown>,
): PdbResultModel {
  return {
    ...(raw as PdbResultModel),
    organismo: normalizarOrganismo(raw.organismo),
    resolucao: raw.resolucao != null ? Number(raw.resolucao) : null,
    tem_ligante: Boolean(raw.tem_ligante),
  };
}
