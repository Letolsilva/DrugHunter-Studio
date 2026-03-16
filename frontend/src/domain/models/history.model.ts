// domain/models/history.model.ts
import type { PdbResultModel } from "./search.model";

/** Shape bruta retornada pela API (datas em ISO UTC). */
export interface SearchHistoryItemRaw {
  id: number;
  proteina_query: string;
  organismo_query?: string;
  total_resultados: number;
  veio_do_cache: boolean;
  teve_erro: boolean;
  mensagem_erro?: string;
  criado_em?: string; // "2026-03-16T02:15:00Z"
}

export interface SearchHistoryDetailRaw extends SearchHistoryItemRaw {
  proteinas: PdbResultModel[];
}

/** Modelo de domínio com datas já convertidas para o fuso local. */
export interface SearchHistoryItem {
  id: number;
  proteina_query: string;
  organismo_query?: string;
  total_resultados: number;
  veio_do_cache: boolean;
  teve_erro: boolean;
  mensagem_erro?: string;
  data_local: string; // "16/03/2026"  — para agrupamento e exibição
  hora_local: string; // "23:15"       — exibição no card
}

export interface SearchHistoryDetail extends SearchHistoryItem {
  proteinas: PdbResultModel[];
}
