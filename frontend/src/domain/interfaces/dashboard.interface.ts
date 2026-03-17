// domain/interfaces/dashboard.interface.ts
import type { PdbResultModel } from "../models/search.model";
import type {
  DashboardFilters,
  DashboardResult,
} from "../models/dashboard.model";

export abstract class IDashboardUseCase {
  abstract processar(
    dados: PdbResultModel[],
    filtros: DashboardFilters,
    pagina: number,
    porPagina?: number,
  ): DashboardResult;

  abstract gerarCSV(filtrados: PdbResultModel[]): string;
}
