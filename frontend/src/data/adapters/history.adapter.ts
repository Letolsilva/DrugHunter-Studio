// data/adapters/history.adapter.ts
import type {
  SearchHistoryItemRaw,
  SearchHistoryDetailRaw,
  SearchHistoryItem,
  SearchHistoryDetail,
} from "../../domain/models/history.model";
import type { PdbResultModel } from "../../domain/models/search.model";
import { adaptSearchResult } from "./search.adapter";

function isoParaDia(iso?: string): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("pt-BR");
}

function isoParaHora(iso?: string): string {
  if (!iso) return "";
  return new Date(iso).toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function adaptHistoryItem(raw: SearchHistoryItemRaw): SearchHistoryItem {
  return {
    id: raw.id,
    proteina_query: raw.proteina_query,
    organismo_query: raw.organismo_query,
    total_resultados: raw.total_resultados,
    veio_do_cache: raw.veio_do_cache,
    teve_erro: raw.teve_erro ?? false,
    mensagem_erro: raw.mensagem_erro,
    data_local: isoParaDia(raw.criado_em),
    hora_local: isoParaHora(raw.criado_em),
  };
}

export function adaptHistoryDetail(
  raw: SearchHistoryDetailRaw,
): SearchHistoryDetail {
  return {
    ...adaptHistoryItem(raw),
    proteinas: raw.proteinas.map((p) =>
      adaptSearchResult(p as Partial<PdbResultModel> & Record<string, unknown>),
    ),
  };
}
