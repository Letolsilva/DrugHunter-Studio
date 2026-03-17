// hooks/useDashboard.ts
import { useState, useMemo, useCallback } from "react";
import type { PdbResultModel } from "../domain/models/search.model";
import type { DashboardUseCase } from "../data/usecases/dashboard.usecase";

export interface UseDashboardReturn {
  filtroOrganismo: string;
  filtroProteina: string;
  filtroQualidade: string;
  filtroLigante: string;
  busca: string;
  ordem: string;
  pagina: number;
  setFiltroOrganismo: (v: string) => void;
  setFiltroProteina: (v: string) => void;
  setFiltroQualidade: (v: string) => void;
  setFiltroLigante: (v: string) => void;
  setBusca: (v: string) => void;
  setOrdem: (v: string) => void;
  onChangePage: (p: number) => void;
  onPrevPage: () => void;
  onNextPage: () => void;
  organismos: string[];
  filtrados: PdbResultModel[];
  paginas: number;
  paginaAtual: PdbResultModel[];
  dadosQualidade: { name: string; value: number }[];
  dadosMetodo: { name: string; value: number }[];
  dadosProteina: { name: string; value: number }[];
  downloadCSV: () => void;
  limparFiltros: () => void;
}

export function useDashboard(
  dados: PdbResultModel[],
  dashboardUseCase: DashboardUseCase,
): UseDashboardReturn {
  const [filtroOrganismo, setFiltroOrganismo] = useState("");
  const [filtroProteina, setFiltroProteina] = useState("");
  const [filtroQualidade, setFiltroQualidade] = useState("");
  const [filtroLigante, setFiltroLigante] = useState("");
  const [busca, setBusca] = useState("");
  const [ordem, setOrdem] = useState("resolucao");
  const [pagina, setPagina] = useState(1);

  const result = useMemo(
    () =>
      dashboardUseCase.processar(
        dados,
        {
          filtroOrganismo,
          filtroProteina,
          filtroQualidade,
          filtroLigante,
          busca,
          ordem,
        },
        pagina,
      ),
    [
      dados,
      filtroOrganismo,
      filtroProteina,
      filtroQualidade,
      filtroLigante,
      busca,
      ordem,
      pagina,
      dashboardUseCase,
    ],
  );

  const downloadCSV = useCallback(() => {
    const csv = dashboardUseCase.gerarCSV(result.filtrados);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = Object.assign(document.createElement("a"), {
      href: url,
      download: "pdb_resultados.csv",
    });
    a.click();
    URL.revokeObjectURL(url);
  }, [dashboardUseCase, result.filtrados]);

  const limparFiltros = useCallback(() => {
    setFiltroOrganismo("");
    setFiltroProteina("");
    setFiltroQualidade("");
    setFiltroLigante("");
    setBusca("");
    setPagina(1);
  }, []);

  const onChangePage = useCallback((p: number) => setPagina(p), []);
  const onPrevPage = useCallback(
    () => setPagina((p) => Math.max(1, p - 1)),
    [],
  );
  const onNextPage = useCallback(
    () => setPagina((p) => Math.min(result.paginas, p + 1)),
    [result.paginas],
  );

  return {
    filtroOrganismo,
    filtroProteina,
    filtroQualidade,
    filtroLigante,
    busca,
    ordem,
    pagina,
    setFiltroOrganismo,
    setFiltroProteina,
    setFiltroQualidade,
    setFiltroLigante,
    setBusca,
    setOrdem,
    onChangePage,
    onPrevPage,
    onNextPage,
    organismos: result.organismos,
    filtrados: result.filtrados,
    paginas: result.paginas,
    paginaAtual: result.paginaAtual,
    dadosQualidade: result.charts.qualidade,
    dadosMetodo: result.charts.metodo,
    dadosProteina: result.charts.proteina,
    downloadCSV,
    limparFiltros,
  };
}
