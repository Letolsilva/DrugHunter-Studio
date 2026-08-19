// templates/chembl/ChemblResultsTemplate.tsx
import { useNavigate } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import { Navbar, DropdownMenu } from "../../components/layout";
import { MiddleBar } from "../../components/nav/MiddleBar";
import { Spinner } from "../../components/ui/Spinner";
import {
  AppLogoIcon,
  ArrowLeftIcon,
  BioactivityIcon,
  HelpIcon,
  LogoutIcon,
  MenuIcon,
  RefreshIcon,
  SettingsIcon,
} from "../../components/icons";
import { ChemblResultsTable } from "../../components/chembl/ChemblResultsTable";
import { ChemblProgressCard } from "../../components/chembl/ChemblProgressCard";
import { MoleculeModal } from "../../components/chembl/MoleculeModal";
import { NetworkModal } from "../../components/chembl/NetworkModal";
import { AnalysisForm } from "../../components/chembl/AnalysisForm";
import type { UseChemblResultsPageReturn } from "../../pages/ChemblResultsPage/useChemblResultsPage";
import type { ChemblJobItemModel } from "../../domain/models/chembl.model";

function SummaryCard({ label, value, highlight }: { label: string; value: string | number; highlight?: boolean }) {
  return (
    <div
      className="flex flex-col gap-0.5 rounded-xl border border-outline bg-panel px-4 py-3 min-w-25"
      style={highlight ? { borderColor: "var(--color-accent-25)", background: "var(--color-accent-12)" } : {}}
    >
      <span className="font-mono text-[10px] uppercase tracking-widest text-foreground-subtle">{label}</span>
      <span
        className="font-mono text-[20px] font-bold leading-none"
        style={{ color: highlight ? "var(--color-accent)" : "var(--color-foreground)" }}
      >
        {value}
      </span>
    </div>
  );
}

export default function ChemblResultsTemplate(props: UseChemblResultsPageReturn) {
  const {
    job, jobLoading,
    allMolecules, filteredMolecules, displayedMolecules,
    molLoading, molPage, molTotalPages, onMolPageChange,
    summary, uniqueTypes,
    minPchembl, setMinPchembl,
    selectedTypes, setSelectedTypes, toggleType,
    sortDesc, setSortDesc,
    analysisStatus, analysisStatusLoading,
    mccSet, mccSimsSet, mccMolsSet,
    mccFilter, setMccFilter,
    analysisLoading, analysisSubmitted,
    fingerprint, metric,
    onFingerprintChange, onMetricChange, onRunAnalysis,
    networks, networksLoading, selectedNetwork, onOpenNetwork, onCloseNetwork, getPlotUrl,
    selectedMol, onSelectMol, onCloseMol,
    handleLogout, voltarChembl,
  } = props;

  const navigate = useNavigate();
  const [menuAberto, setMenuAberto] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const [filterOpen, setFilterOpen] = useState(false);
  const filterRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!filterOpen) return;
    function onClickOutside(e: MouseEvent) {
      if (filterRef.current && !filterRef.current.contains(e.target as Node)) {
        setFilterOpen(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [filterOpen]);

  const jobDate = job
    ? new Date(job.created_at).toLocaleDateString("pt-BR", {
        day: "2-digit", month: "short", year: "numeric",
      })
    : "";

  const isFiltered =
    minPchembl > 0 || selectedTypes.length > 0 || mccFilter !== "all";

  const activeFilterCount =
    (minPchembl > 0 ? 1 : 0) + selectedTypes.length + (mccFilter !== "all" ? 1 : 0);

  const displayStart = (molPage - 1) * 50 + 1;
  const displayEnd = Math.min(molPage * 50, filteredMolecules.length);

  return (
    <div className="min-h-screen flex flex-col bg-surface-primary">
      <Navbar>
        <Navbar.Left>
          <button
            type="button"
            onClick={voltarChembl}
            className="cursor-pointer rounded border-none bg-transparent p-[4px_6px] text-foreground-subtle transition-colors hover:text-foreground"
            title="Voltar"
          >
            <ArrowLeftIcon size={16} />
          </button>
          <button
            type="button"
            onClick={() => navigate("/home")}
            className="cursor-pointer rounded border-none bg-transparent text-[17px] font-medium text-foreground-muted inline-flex items-center gap-1.5 hover:text-foreground transition-colors"
          >
            <AppLogoIcon size={17} className="text-foreground-muted" />
            PDB<b className="text-foreground font-extrabold">Explorer</b>
          </button>
          <span className="ml-1 border-l border-outline pl-3 inline-flex items-center gap-1.5 font-mono text-[12px] text-foreground-subtle">
            <BioactivityIcon size={13} />
            Resultados
            {job && (
              <span className="text-foreground-subtle opacity-60">— job #{job.id}</span>
            )}
          </span>
        </Navbar.Left>

        <Navbar.Middle>
          <MiddleBar activeModule="chembl" />
        </Navbar.Middle>

        <Navbar.Right>
          <DropdownMenu
            isOpen={menuAberto}
            menuRef={menuRef}
            onToggle={() => setMenuAberto((v) => !v)}
            buttonTitle="Menu"
            trigger={<MenuIcon size={25} />}
          >
            <DropdownMenu.Item
              icon={<RefreshIcon size={14} />}
              label="Redocking"
              onClick={() => { setMenuAberto(false); navigate("/redocking"); }}
              divider
            />
            <DropdownMenu.Item
              icon={<SettingsIcon size={14} />}
              label="Configurações"
              onClick={() => { setMenuAberto(false); navigate("/configuracoes"); }}
              divider
            />
            <DropdownMenu.Item
              icon={<HelpIcon size={14} />}
              label="Ajuda"
              onClick={() => { setMenuAberto(false); navigate("/ajuda"); }}
              divider
            />
            <DropdownMenu.Item
              icon={<LogoutIcon size={14} />}
              label="Sair"
              onClick={handleLogout}
            />
          </DropdownMenu>
        </Navbar.Right>
      </Navbar>

      <main className="flex-1 max-w-350 w-full mx-auto px-8 py-8 flex flex-col gap-6">
        {jobLoading ? (
          <div className="flex justify-center py-16">
            <Spinner style={{ width: 28, height: 28, borderWidth: 3 }} />
          </div>
        ) : job?.status === "running" ? (
          /* ── Job em andamento: mostra progresso por item ─────────────── */
          <div className="flex flex-col gap-6">
            <div className="flex items-center gap-3">
              <Spinner style={{ width: 20, height: 20, borderWidth: 2 }} />
              <div>
                <h1 className="text-[20px] font-extrabold text-foreground tracking-tight">
                  Coletando bioatividades...
                </h1>
                <p className="font-mono text-[12px] text-foreground-subtle mt-0.5">
                  Você pode fechar esta página — a execução continua no servidor.
                </p>
              </div>
            </div>
            <div className="flex flex-col gap-2">
              {job.items.map((it: ChemblJobItemModel, idx: number) => (
                <ChemblProgressCard
                  key={it.id}
                  progress={{
                    idx,
                    item_id: it.id,
                    target: it.target_name,
                    status: it.status as "pending" | "running" | "done" | "error",
                    etapa: it.current_step ?? null,
                    molecules_count: it.molecules_count,
                    error_msg: it.error_msg,
                  }}
                />
              ))}
            </div>
          </div>
        ) : (
          <>
            {/* ── Cabeçalho ───────────────────────────────────────────────── */}
            <div className="flex flex-col gap-1">
              <h1 className="text-[20px] font-extrabold text-foreground tracking-tight">
                {job?.items.map((it) => it.target_name).join(", ")}
              </h1>
              <div className="flex items-center gap-3 font-mono text-[12px] text-foreground-subtle flex-wrap">
                <span>{jobDate}</span>
                <span className="text-outline">·</span>
                <span>{job?.items.length} alvo(s)</span>
                {!analysisStatusLoading && analysisStatus && (
                  <>
                    <span className="text-outline">·</span>
                    {analysisStatus.has_analysis ? (
                      <span
                        className="inline-flex items-center gap-1 rounded px-2 py-0.5 text-[10px] font-bold tracking-wider"
                        style={{
                          background: "var(--color-green-12, rgba(34,197,94,0.12))",
                          color: "var(--color-green)",
                        }}
                      >
                        ANÁLISE CONCLUÍDA
                        {analysisStatus.centroids_count > 0 &&
                          ` · ${analysisStatus.centroids_count} mol. no MCC`}
                      </span>
                    ) : (
                      <span
                        className="inline-flex items-center gap-1 rounded px-2 py-0.5 text-[10px] font-bold tracking-wider"
                        style={{
                          background: "var(--color-outline)",
                          color: "var(--color-foreground-subtle)",
                        }}
                      >
                        SEM ANÁLISE
                      </span>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* ── Cards de resumo ──────────────────────────────────────────── */}
            {!molLoading && summary && (
              <div className="flex gap-3 flex-wrap">
                <SummaryCard label="Total" value={summary.total.toLocaleString("pt-BR")} />
                <SummaryCard label="Com pChEMBL" value={summary.comPchembl.toLocaleString("pt-BR")} />
                <SummaryCard label="pChEMBL médio" value={summary.pchemblMedio} />
                <SummaryCard
                  label="Ativos (≥ 6)"
                  value={summary.ativos.toLocaleString("pt-BR")}
                  highlight={summary.ativos > 0}
                />
                <SummaryCard label="Tipos de ensaio" value={summary.tiposUnicos} />
              </div>
            )}

            {/* ── Grid: Tabela + Sidebar ───────────────────────────────────── */}
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_320px]">

              {/* Coluna principal */}
              <div className="flex flex-col gap-3">

                {/* Botão de filtros */}
                {!molLoading && allMolecules.length > 0 && (
                  <div className="relative" ref={filterRef}>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setFilterOpen((v) => !v)}
                        className="cursor-pointer inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 font-mono text-[12px] transition-colors"
                        style={{
                          background: filterOpen || isFiltered ? "var(--color-accent-12)" : "transparent",
                          borderColor: filterOpen || isFiltered ? "var(--color-accent-25)" : "var(--color-outline)",
                          color: filterOpen || isFiltered ? "var(--color-accent)" : "var(--color-foreground-subtle)",
                        }}
                      >
                        Filtros
                        {activeFilterCount > 0 && (
                          <span
                            className="inline-flex items-center justify-center rounded-full w-4 h-4 text-[10px] font-bold"
                            style={{ background: "var(--color-accent)", color: "var(--color-surface-primary)" }}
                          >
                            {activeFilterCount}
                          </span>
                        )}
                        <span className="text-[10px] opacity-60">{filterOpen ? "▲" : "▼"}</span>
                      </button>

                      {/* Ordenar por pChEMBL — fora do dropdown, sempre visível */}
                      <button
                        type="button"
                        onClick={() => setSortDesc(!sortDesc)}
                        className="cursor-pointer rounded-lg border px-3 py-1.5 font-mono text-[12px] transition-colors"
                        style={{
                          background: sortDesc ? "var(--color-accent-12)" : "transparent",
                          borderColor: sortDesc ? "var(--color-accent-25)" : "var(--color-outline)",
                          color: sortDesc ? "var(--color-accent)" : "var(--color-foreground-subtle)",
                        }}
                        title="Ordenar por pChEMBL decrescente"
                      >
                        ↓ pChEMBL
                      </button>

                      {isFiltered && (
                        <button
                          type="button"
                          onClick={() => { setMinPchembl(0); setSelectedTypes([]); setMccFilter("all"); }}
                          className="cursor-pointer rounded border-none bg-transparent font-mono text-[11px] text-foreground-subtle hover:text-foreground underline transition-colors"
                        >
                          limpar filtros
                        </button>
                      )}
                    </div>

                    {/* Painel dropdown */}
                    {filterOpen && (
                      <div
                        className="absolute top-full left-0 mt-1.5 z-20 rounded-xl border border-outline bg-panel shadow-lg p-4 flex flex-col gap-4 min-w-72"
                        style={{ background: "var(--color-surface-secondary)" }}
                      >
                        {/* pChEMBL mínimo */}
                        <div className="flex flex-col gap-2">
                          <span className="font-mono text-[10px] uppercase tracking-widest text-foreground-subtle">
                            pChEMBL mínimo
                          </span>
                          <input
                            type="number"
                            min={0}
                            max={10}
                            step={0.5}
                            value={minPchembl === 0 ? "" : minPchembl}
                            placeholder="Sem mínimo"
                            onChange={(e) => {
                              const v = parseFloat(e.target.value);
                              setMinPchembl(isNaN(v) ? 0 : Math.max(0, Math.min(10, v)));
                            }}
                            className="w-full rounded-lg border border-outline bg-transparent px-3 py-1.5 font-mono text-[12px] text-foreground outline-none focus:border-accent transition-colors"
                            style={{ colorScheme: "auto" }}
                          />
                        </div>

                        {/* Tipos de ensaio */}
                        {uniqueTypes.length > 0 && (
                          <div className="flex flex-col gap-2">
                            <span className="font-mono text-[10px] uppercase tracking-widest text-foreground-subtle">
                              Tipo de ensaio
                            </span>
                            <div className="flex flex-wrap gap-1.5">
                              {uniqueTypes.map((t) => {
                                const active = selectedTypes.includes(t);
                                return (
                                  <button
                                    key={t}
                                    type="button"
                                    onClick={() => toggleType(t)}
                                    className="cursor-pointer rounded-lg border px-2.5 py-1 font-mono text-[11px] transition-colors"
                                    style={{
                                      background: active ? "var(--color-accent-12)" : "transparent",
                                      borderColor: active ? "var(--color-accent-25)" : "var(--color-outline)",
                                      color: active ? "var(--color-accent)" : "var(--color-foreground-subtle)",
                                    }}
                                  >
                                    {t}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        {/* Filtro MCC */}
                        {mccSet.size > 0 && (
                          <div className="flex flex-col gap-2">
                            <span className="font-mono text-[10px] uppercase tracking-widest text-foreground-subtle">
                              MCC
                            </span>
                            <div className="flex flex-wrap gap-1.5">
                              {(
                                [
                                  { value: "mols", label: "● MOLS", bg: "rgba(34,197,94,0.15)", color: "var(--color-green, #16a34a)" },
                                  { value: "sims", label: "● SIMS", bg: "rgba(168,85,247,0.15)", color: "#9333ea" },
                                  { value: "both", label: "● SIMS+MOLS", bg: "rgba(234,179,8,0.15)", color: "#b45309" },
                                ] as const
                              ).map((opt) => {
                                const active = mccFilter === opt.value;
                                return (
                                  <button
                                    key={opt.value}
                                    type="button"
                                    onClick={() => setMccFilter(active ? "all" : opt.value)}
                                    className="cursor-pointer rounded-lg border px-2.5 py-1 font-mono text-[11px] font-semibold transition-colors"
                                    style={{
                                      background: active ? opt.bg : "transparent",
                                      borderColor: active ? opt.color : "var(--color-outline)",
                                      color: active ? opt.color : "var(--color-foreground-subtle)",
                                    }}
                                  >
                                    {opt.label}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Cabeçalho da tabela com contagem e paginação */}
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[11px] uppercase tracking-widest text-foreground-subtle">
                    Moléculas
                    {filteredMolecules.length > 0 && (
                      <span className="ml-2 normal-case text-foreground-subtle">
                        ({displayStart.toLocaleString("pt-BR")}–
                        {displayEnd.toLocaleString("pt-BR")} de{" "}
                        {filteredMolecules.length.toLocaleString("pt-BR")}
                        {isFiltered && allMolecules.length !== filteredMolecules.length && (
                          <span className="opacity-60"> de {allMolecules.length.toLocaleString("pt-BR")} total</span>
                        )}
                        )
                      </span>
                    )}
                  </span>

                  {molTotalPages > 1 && (
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => onMolPageChange(molPage - 1)}
                        disabled={molPage === 1}
                        className="cursor-pointer rounded border border-outline px-2 py-0.5 font-mono text-[11px] text-foreground-subtle hover:text-foreground transition-colors disabled:opacity-30"
                      >
                        ←
                      </button>
                      <span className="font-mono text-[11px] text-foreground-subtle">
                        {molPage}/{molTotalPages}
                      </span>
                      <button
                        type="button"
                        onClick={() => onMolPageChange(molPage + 1)}
                        disabled={molPage === molTotalPages}
                        className="cursor-pointer rounded border border-outline px-2 py-0.5 font-mono text-[11px] text-foreground-subtle hover:text-foreground transition-colors disabled:opacity-30"
                      >
                        →
                      </button>
                    </div>
                  )}
                </div>

                {molLoading ? (
                  <div className="flex justify-center py-16">
                    <Spinner style={{ width: 24, height: 24, borderWidth: 2 }} />
                  </div>
                ) : displayedMolecules.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 gap-2">
                    <span className="font-mono text-[13px] text-foreground-subtle italic">
                      {allMolecules.length === 0
                        ? "Nenhuma molécula encontrada."
                        : "Nenhuma molécula corresponde aos filtros."}
                    </span>
                    {isFiltered && (
                      <button
                        type="button"
                        onClick={() => { setMinPchembl(0); setSelectedTypes([]); setMccFilter("all"); setFilterOpen(false); }}
                        className="cursor-pointer font-mono text-[11px] text-foreground-subtle underline hover:text-foreground transition-colors"
                      >
                        Limpar filtros
                      </button>
                    )}
                  </div>
                ) : (
                  <ChemblResultsTable
                    molecules={displayedMolecules}
                    onSelectMolecule={onSelectMol}
                    mccSimsSet={mccSimsSet.size > 0 ? mccSimsSet : undefined}
                    mccMolsSet={mccMolsSet.size > 0 ? mccMolsSet : undefined}
                  />
                )}

                {/* Paginação inferior */}
                {!molLoading && molTotalPages > 1 && (
                  <div className="flex items-center justify-center gap-3 mt-1">
                    <button
                      type="button"
                      onClick={() => onMolPageChange(molPage - 1)}
                      disabled={molPage === 1}
                      className="cursor-pointer rounded border border-outline px-3 py-1 font-mono text-[12px] text-foreground-subtle hover:text-foreground transition-colors disabled:opacity-30"
                    >
                      ← Anterior
                    </button>
                    <span className="font-mono text-[12px] text-foreground-subtle">
                      página {molPage} de {molTotalPages}
                    </span>
                    <button
                      type="button"
                      onClick={() => onMolPageChange(molPage + 1)}
                      disabled={molPage === molTotalPages}
                      className="cursor-pointer rounded border border-outline px-3 py-1 font-mono text-[12px] text-foreground-subtle hover:text-foreground transition-colors disabled:opacity-30"
                    >
                      Próxima →
                    </button>
                  </div>
                )}
              </div>

              {/* Sidebar */}
              <div className="flex flex-col gap-4">
                {/* Alvos coletados + botões de rede */}
                <div className="rounded-xl border border-outline bg-panel p-4 flex flex-col gap-3">
                  <span className="font-mono text-[11px] uppercase tracking-widest text-foreground-subtle">
                    Alvos coletados
                  </span>
                  {job?.items.map((it) => {
                    const simsNet = networks.find(
                      (n) => n.item_folder === it.folder_name && n.analysis_type === "SIMS",
                    );
                    const molsNet = networks.find(
                      (n) => n.item_folder === it.folder_name && n.analysis_type === "MOLS",
                    );
                    return (
                      <div key={it.id} className="flex flex-col gap-1.5">
                        <div className="flex items-center gap-2">
                          <span
                            className="h-1.5 w-1.5 rounded-full shrink-0"
                            style={{
                              background:
                                it.status === "done"
                                  ? "var(--color-green)"
                                  : it.status === "error"
                                    ? "var(--color-red)"
                                    : "var(--color-foreground-subtle)",
                            }}
                          />
                          <span className="font-mono text-[12px] text-foreground truncate flex-1">
                            {it.target_name}
                          </span>
                          {it.molecules_count != null && (
                            <span className="font-mono text-[11px] text-foreground-subtle shrink-0">
                              {it.molecules_count.toLocaleString("pt-BR")} mol.
                            </span>
                          )}
                        </div>
                        {/* Botões de rede (aparecem após análise) */}
                        {!networksLoading && (simsNet || molsNet) && (
                          <div className="flex flex-col gap-1.5 pl-3.5">
                            {simsNet && (
                              <button
                                type="button"
                                onClick={() => onOpenNetwork(simsNet)}
                                className="cursor-pointer rounded-lg border-2 px-3 py-2 font-mono text-[12px] font-semibold transition-colors w-full text-left flex items-center justify-between gap-2"
                                style={{
                                  borderColor: "rgba(168,85,247,0.35)",
                                  color: "#9333ea",
                                  background: "rgba(168,85,247,0.10)",
                                }}
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.background = "rgba(168,85,247,0.20)";
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.background = "rgba(168,85,247,0.10)";
                                }}
                              >
                                <span>Ver rede por similaridade</span>
                                <span className="opacity-70 text-[10px] font-normal shrink-0">
                                  SIMS · {simsNet.mcc_count.toLocaleString("pt-BR")} MCC
                                </span>
                              </button>
                            )}
                            {molsNet && (
                              <button
                                type="button"
                                onClick={() => onOpenNetwork(molsNet)}
                                className="cursor-pointer rounded-lg border-2 px-3 py-2 font-mono text-[12px] font-semibold transition-colors w-full text-left flex items-center justify-between gap-2"
                                style={{
                                  borderColor: "rgba(34,197,94,0.35)",
                                  color: "var(--color-green, #16a34a)",
                                  background: "rgba(34,197,94,0.10)",
                                }}
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.background = "rgba(34,197,94,0.20)";
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.background = "rgba(34,197,94,0.10)";
                                }}
                              >
                                <span>Ver rede por propriedade</span>
                                <span className="opacity-70 text-[10px] font-normal shrink-0">
                                  MOLS · {molsNet.mcc_count.toLocaleString("pt-BR")} MCC
                                </span>
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Análise molecular */}
                {job && (
                  <AnalysisForm
                    fingerprint={fingerprint}
                    metric={metric}
                    loading={analysisLoading || analysisSubmitted}
                    analysisRunning={analysisStatus?.analysis_running}
                    onFingerprintChange={onFingerprintChange}
                    onMetricChange={onMetricChange}
                    onSubmit={onRunAnalysis}
                  />
                )}

                {/* Painel MCC */}
                {analysisStatus?.has_analysis && mccSet.size > 0 && (
                  <div className="rounded-xl border border-outline bg-panel p-4 flex flex-col gap-2">
                    <span className="font-mono text-[11px] uppercase tracking-widest text-foreground-subtle">
                      Máx. Componente Conectado
                    </span>
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-[12px] text-foreground-subtle">Moléculas no MCC</span>
                      <span className="font-mono text-[13px] font-bold text-foreground">
                        {mccSet.size.toLocaleString("pt-BR")}
                      </span>
                    </div>
                    <div className="flex flex-col gap-1 font-mono text-[11px] text-foreground-subtle">
                      <div className="flex items-center gap-1.5">
                        <span className="inline-flex items-center rounded px-1.5 py-0.5 font-bold text-[10px]" style={{ background: "rgba(34,197,94,0.15)", color: "var(--color-green, #16a34a)" }}>● MOLS</span>
                        <span>rede de propriedade</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="inline-flex items-center rounded px-1.5 py-0.5 font-bold text-[10px]" style={{ background: "rgba(168,85,247,0.15)", color: "#9333ea" }}>● SIMS</span>
                        <span>rede de similaridade</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="inline-flex items-center rounded px-1.5 py-0.5 font-bold text-[10px]" style={{ background: "rgba(234,179,8,0.15)", color: "#b45309" }}>● SIMS+MOLS</span>
                        <span>em ambas as redes</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </main>

      {selectedMol && <MoleculeModal molecule={selectedMol} onClose={onCloseMol} />}
      {selectedNetwork && (
        <NetworkModal
          network={selectedNetwork}
          plotUrl={getPlotUrl(selectedNetwork.filename)}
          onClose={onCloseNetwork}
        />
      )}
    </div>
  );
}
