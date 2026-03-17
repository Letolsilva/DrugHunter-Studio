// templates/dashboard/DashboardTemplate.tsx
import { QualityPieChart } from "../../components/charts/QualityPieChart";
import { MethodBarChart } from "../../components/charts/MethodBarChart";
import { ProteinBarChart } from "../../components/charts/ProteinBarChart";
import { StatsRow } from "../../components/dashboard/StatsRow";
import { FiltersBar } from "../../components/dashboard/FiltersBar";
import { ResultsTable } from "../../components/dashboard/ResultsTable";
import { Pagination } from "../../components/dashboard/Pagination";
import { Button } from "../../components/ui/Button";
import { DownloadIcon } from "../../components/icons";
import type { PdbResultModel } from "../../domain/models/search.model";
import type { UseDashboardReturn } from "../../hooks/useDashboard";

interface DashboardTemplateProps extends UseDashboardReturn {
  dados: PdbResultModel[];
  proteinas: string[];
  onNovaBusca: () => void;
}

export default function DashboardTemplate({
  dados,
  proteinas,
  onNovaBusca,
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
  organismos,
  filtrados,
  paginas,
  paginaAtual,
  dadosQualidade,
  dadosMetodo,
  dadosProteina,
  downloadCSV,
  limparFiltros,
}: DashboardTemplateProps) {
  return (
    <div className="flex flex-col gap-5 w-full fade-in">
      {/* Header de resultado */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-[22px] font-extrabold text-foreground tracking-tight">
            {dados.length} estruturas coletadas
          </h2>
          <p className="text-[12px] text-foreground-subtle font-mono mt-1">
            {proteinas.join(", ")}
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="ghost"
            onClick={downloadCSV}
            style={{ fontSize: 13, padding: "8px 16px" }}
          >
            <span className="inline-flex items-center gap-1.5">
              <DownloadIcon size={13} /> CSV
            </span>
          </Button>
          <Button
            variant="primary"
            onClick={onNovaBusca}
            style={{ fontSize: 13, padding: "8px 16px" }}
          >
            + Nova busca
          </Button>
        </div>
      </div>

      {/* Stats */}
      <StatsRow dados={dados} organismos={organismos} />

      {/* Gráficos */}
      <div
        className="grid gap-4"
        style={{ gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))" }}
      >
        <div className="bg-panel border border-outline rounded-xl p-5">
          <h3 className="text-[13px] font-bold text-foreground-muted uppercase tracking-[0.5px] mb-3">
            Distribuição de Qualidade
          </h3>
          <QualityPieChart data={dadosQualidade} />
        </div>
        <div className="bg-panel border border-outline rounded-xl p-5">
          <h3 className="text-[13px] font-bold text-foreground-muted uppercase tracking-[0.5px] mb-3">
            Método Experimental
          </h3>
          <MethodBarChart data={dadosMetodo} />
        </div>
        {proteinas.length > 1 && (
          <div className="bg-panel border border-outline rounded-xl p-5">
            <h3 className="text-[13px] font-bold text-foreground-muted uppercase tracking-[0.5px] mb-3">
              Estruturas por Proteína
            </h3>
            <ProteinBarChart data={dadosProteina} />
          </div>
        )}
      </div>

      {/* Filtros */}
      <FiltersBar
        busca={busca}
        setBusca={setBusca}
        filtroOrganismo={filtroOrganismo}
        setFiltroOrganismo={setFiltroOrganismo}
        filtroProteina={filtroProteina}
        setFiltroProteina={setFiltroProteina}
        filtroQualidade={filtroQualidade}
        setFiltroQualidade={setFiltroQualidade}
        filtroLigante={filtroLigante}
        setFiltroLigante={setFiltroLigante}
        ordem={ordem}
        setOrdem={setOrdem}
        proteinas={proteinas}
        organismos={organismos}
        onChangePage={onChangePage}
        onLimpar={limparFiltros}
      />

      <p className="text-[12px] text-foreground-subtle font-mono">
        Exibindo <b className="text-foreground-muted">{filtrados.length}</b> de{" "}
        <b className="text-foreground-muted">{dados.length}</b> estruturas
      </p>

      <ResultsTable rows={paginaAtual} />

      <Pagination
        pagina={pagina}
        paginas={paginas}
        onPrev={onPrevPage}
        onNext={onNextPage}
      />
    </div>
  );
}
