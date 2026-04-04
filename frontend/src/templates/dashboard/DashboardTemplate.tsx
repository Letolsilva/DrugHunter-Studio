// templates/dashboard/DashboardTemplate.tsx
import { ResolutionBarChart } from "../../components/charts/ResolutionBarChart";
import { MethodBarChart } from "../../components/charts/MethodBarChart";
import { ProteinBarChart } from "../../components/charts/ProteinBarChart";
import { StatsRow } from "../../components/dashboard/StatsRow";
import { FiltersBar } from "../../components/dashboard/FiltersBar";
import { ResultsTable } from "../../components/dashboard/ResultsTable";
import { Pagination } from "../../components/dashboard/Pagination";
import { DownloadProgressBar } from "../../components/dashboard/DownloadProgressBar";
import { Toast } from "../../components/ui/Toast";
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
  filtroResolucaoMax,
  filtroLigante,
  busca,
  ordem,
  pagina,
  setFiltroOrganismo,
  setFiltroProteina,
  setFiltroResolucaoMax,
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
  dadosResolucao,
  dadosMetodo,
  dadosProteina,
  downloadCSV,
  limparFiltros,
  selectedIds,
  toggleSelected,
  toggleSelectAll,
  isAllSelected,
  batchProgress,
  downloadBatch,
  downloadSingle,
  downloadingIds,
  recentlyDownloadedIds,
  failedIds,
  toast,
  toastVariant,
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
          {selectedIds.size > 0 && !batchProgress && (
            <Button
              variant="ghost"
              onClick={downloadBatch}
              style={{ fontSize: 13, padding: "8px 16px" }}
            >
              <span className="inline-flex items-center gap-1.5">
                <DownloadIcon size={13} />
                Baixar {selectedIds.size} .pdb{selectedIds.size > 1 ? "s" : ""}
              </span>
            </Button>
          )}
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

      {/* GrÃ¡ficos */}
      <div
        className="grid gap-4"
        style={{ gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))" }}
      >
        <div className="bg-panel border border-outline rounded-xl p-5">
          <h3 className="text-[13px] font-bold text-foreground-muted uppercase tracking-[0.5px] mb-3">
            Distribuição de Resolução
          </h3>
          <ResolutionBarChart data={dadosResolucao} />
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
              Estruturas por ProteÃ­na
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
        filtroResolucaoMax={filtroResolucaoMax}
        setFiltroResolucaoMax={setFiltroResolucaoMax}
        filtroLigante={filtroLigante}
        setFiltroLigante={setFiltroLigante}
        ordem={ordem}
        setOrdem={setOrdem}
        proteinas={proteinas}
        organismos={organismos}
        onChangePage={onChangePage}
        onLimpar={limparFiltros}
      />

      {/* Barra de seleção + progresso */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <p className="text-[12px] text-foreground-subtle font-mono">
          Exibindo <b className="text-foreground-muted">{filtrados.length}</b>{" "}
          de <b className="text-foreground-muted">{dados.length}</b> estruturas
          {selectedIds.size > 0 && (
            <span className="ml-2 text-accent font-bold">
              · {selectedIds.size} selecionado{selectedIds.size > 1 ? "s" : ""}
            </span>
          )}
        </p>
      </div>

      {/* Progresso do download em lote */}
      {batchProgress && (
        <DownloadProgressBar
          atual={batchProgress.atual}
          total={batchProgress.total}
        />
      )}

      <ResultsTable
        rows={paginaAtual}
        selectedIds={selectedIds}
        isAllSelected={isAllSelected}
        onToggleSelected={toggleSelected}
        onToggleSelectAll={toggleSelectAll}
        onDownloadSingle={downloadSingle}
        downloadingIds={downloadingIds}
        recentlyDownloadedIds={recentlyDownloadedIds}
        failedIds={failedIds}
      />

      <Pagination
        pagina={pagina}
        paginas={paginas}
        onPrev={onPrevPage}
        onNext={onNextPage}
      />

      <Toast message={toast} variant={toastVariant} />
    </div>
  );
}
