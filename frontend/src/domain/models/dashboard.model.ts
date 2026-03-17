// domain/models/dashboard.model.ts
import type { PdbResultModel } from "./search.model";

export interface DashboardFilters {
  filtroOrganismo: string;
  filtroProteina: string;
  filtroQualidade: string;
  /** "" | "sim" | "nao" */
  filtroLigante: string;
  busca: string;
  /** "resolucao" | "qualidade" | "data" */
  ordem: string;
}

export interface DashboardChartData {
  qualidade: { name: string; value: number }[];
  metodo: { name: string; value: number }[];
  proteina: { name: string; value: number }[];
}

export interface DashboardResult {
  filtrados: PdbResultModel[];
  paginaAtual: PdbResultModel[];
  paginas: number;
  organismos: string[];
  charts: DashboardChartData;
}
