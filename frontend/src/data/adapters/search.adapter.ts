// data/adapters/search.adapter.ts
import type { PdbResultModel } from "../../domain/models/search.model";

export function adaptSearchResult(
  raw: Partial<PdbResultModel> & Record<string, unknown>,
): PdbResultModel {
  return {
    ...(raw as PdbResultModel),
    resolucao: raw.resolucao != null ? Number(raw.resolucao) : null,
    num_cadeias: raw.num_cadeias != null ? Number(raw.num_cadeias) : null,
    tem_ligante: Boolean(raw.tem_ligante),
  };
}
