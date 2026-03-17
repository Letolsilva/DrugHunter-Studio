// data/usecases/dashboard.usecase.ts
import { IDashboardUseCase } from "../../domain/interfaces/dashboard.interface";
import type { PdbResultModel } from "../../domain/models/search.model";
import type {
  DashboardFilters,
  DashboardResult,
} from "../../domain/models/dashboard.model";
import {
  getOrganismos,
  aplicarFiltros,
  paginar,
  getChartData,
  gerarCSVString,
} from "../adapters/dashboard.adapter";

const POR_PAGINA = 20;

export class DashboardUseCase extends IDashboardUseCase {
  processar(
    dados: PdbResultModel[],
    filtros: DashboardFilters,
    pagina: number,
    porPagina = POR_PAGINA,
  ): DashboardResult {
    const organismos = getOrganismos(dados);
    const filtrados = aplicarFiltros(dados, filtros);
    const { paginaAtual, paginas } = paginar(filtrados, pagina, porPagina);
    const charts = getChartData(filtrados);
    return { filtrados, paginaAtual, paginas, organismos, charts };
  }

  gerarCSV(filtrados: PdbResultModel[]): string {
    return gerarCSVString(filtrados);
  }
}
