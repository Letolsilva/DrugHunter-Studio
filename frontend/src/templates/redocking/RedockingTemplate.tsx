// templates/redocking/RedockingTemplate.tsx
import { useRef, useState } from "react";
import { Navbar, DropdownMenu } from "../../components/layout";
import { Button } from "../../components/ui/Button";
import { Spinner } from "../../components/ui/Spinner";
import { Toast } from "../../components/ui/Toast";
import {
  AppLogoIcon,
  ArrowLeftIcon,
  ClockIcon,
  DownloadIcon,
  LogoutIcon,
  MenuIcon,
  SearchIcon,
} from "../../components/icons";
import { ResolutionBarChart } from "../../components/charts/ResolutionBarChart";
import { MethodBarChart } from "../../components/charts/MethodBarChart";
import { LigandDonutChart } from "../../components/charts/LigandDonutChart";
import { InfoTooltip } from "../../components/ui/InfoTooltip";
import type { UseRedockingPageReturn } from "../../pages/RedockingPage/useRedockingPage";

const STATUS_LABEL: Record<string, string> = {
  pending: "Aguardando",
  running: "Em execução",
  done: "Concluído",
  error: "Erro",
};

const STATUS_COLOR: Record<string, string> = {
  pending: "var(--color-foreground-subtle)",
  running: "var(--color-blue)",
  done: "var(--color-accent)",
  error: "var(--color-red)",
};

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  const utcStr = iso.endsWith("Z") || iso.includes("+") ? iso : iso + "Z";
  return new Date(utcStr).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function RedockingTemplate({
  csvLinhas,
  csvFileName,
  dashboard,
  config,
  submitting,
  jobs,
  userEmail,
  menuAberto,
  menuRef,
  toast,
  toastVariant,
  toggleMenu,
  irParaBusca,
  irParaHistorico,
  irParaMeusPdbs,
  handleImportarCsv,
  handleConfigChange,
  handleSubmit,
  handleLogout,
}: UseRedockingPageReturn) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [modalCsvAberto, setModalCsvAberto] = useState(false);

  const canSubmit =
    csvLinhas.length > 0 &&
    config.target.trim() !== "" &&
    config.base_input_path.trim() !== "" &&
    config.base_output_path.trim() !== "" &&
    !submitting;

  return (
    <div className="min-h-screen flex flex-col bg-surface-primary select-none">
      <Navbar>
        <Navbar.Left>
          <button
            type="button"
            onClick={irParaBusca}
            className="cursor-pointer rounded border-none bg-transparent p-[4px_6px] text-foreground-subtle transition-colors hover:text-foreground"
            title="Voltar à Busca"
          >
            <ArrowLeftIcon size={16} />
          </button>
          <span className="text-[17px] font-medium text-foreground-muted inline-flex items-center gap-1.5">
            <AppLogoIcon size={17} className="text-foreground-muted" />
            PDB<b className="text-foreground font-extrabold">Explorer</b>
          </span>
          <span className="ml-1 border-l border-outline pl-3 text-[13px] text-foreground-subtle">
            Redocking
          </span>
        </Navbar.Left>
        <Navbar.Right>
          <DropdownMenu
            isOpen={menuAberto}
            menuRef={menuRef}
            onToggle={toggleMenu}
            buttonTitle="Menu"
            trigger={<MenuIcon size={25} />}
          >
            <DropdownMenu.Item
              icon={<SearchIcon size={14} />}
              label="Busca"
              onClick={irParaBusca}
              divider
            />
            <DropdownMenu.Item
              icon={<ClockIcon size={14} />}
              label="Histórico"
              onClick={irParaHistorico}
              divider
            />
            <DropdownMenu.Item
              icon={<DownloadIcon size={14} />}
              label="Meus PDBs"
              onClick={irParaMeusPdbs}
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

      <main className="flex-1 max-w-[1200px] w-full mx-auto px-8 py-10 flex flex-col gap-8">
        {/* Cabeçalho */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex flex-col gap-0.5">
            <h1 className="text-[22px] font-extrabold text-foreground tracking-tight">
              Redocking
            </h1>
            {csvFileName ? (
              <p className="font-mono text-[13px] text-foreground-muted">
                {csvFileName} —{" "}
                <span className="text-foreground-subtle">
                  {csvLinhas.length} estrutura
                  {csvLinhas.length !== 1 ? "s" : ""}
                </span>
              </p>
            ) : (
              <p className="text-[13px] text-foreground-muted">
                Importe o <span className="font-mono">pdb_codes.csv</span>{" "}
                gerado pelo Visualizador para começar.
              </p>
            )}
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleImportarCsv(file);
              e.target.value = "";
            }}
          />
          <div className="flex items-center gap-2 flex-shrink-0">
            <Button
              variant="ghost"
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-1.5"
            >
              <DownloadIcon size={14} />
              {csvFileName ? "Novo arquivo" : "Importar arquivo"}
            </Button>
            {csvLinhas.length > 0 && (
              <Button
                variant="ghost"
                onClick={() => setModalCsvAberto(true)}
                className="flex items-center gap-1.5"
              >
                Visualizar CSV
              </Button>
            )}
          </div>
        </div>

        {/* Modal — Visualizador CSV */}
        {modalCsvAberto && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
            onClick={() => setModalCsvAberto(false)}
          >
            <div
              className="w-full max-w-3xl max-h-[80vh] rounded-xl border border-outline overflow-hidden flex flex-col shadow-menu"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Barra de título */}
              <div className="flex items-center gap-2 px-4 py-2.5 border-b border-outline bg-surface-secondary">
                <span className="font-mono text-[12px] text-foreground-muted">
                  {csvFileName}
                </span>
                <button
                  type="button"
                  onClick={() => setModalCsvAberto(false)}
                  className="ml-auto text-[18px] leading-none text-foreground-subtle hover:text-foreground transition-colors bg-transparent border-none cursor-pointer"
                >
                  ×
                </button>
              </div>

              {/* Conteúdo */}
              <div className="overflow-auto bg-panel">
                {/* Cabeçalho */}
                <div className="flex items-center border-b border-outline bg-surface-secondary sticky top-0 z-[1]">
                  <span className="font-mono text-[11px] select-none text-right pr-4 pl-3 min-w-[44px] text-foreground-subtle opacity-40">
                    #
                  </span>
                  <span className="w-px self-stretch bg-outline" />
                  {(
                    [
                      "PDB_CODE",
                      "LIGAND",
                      "RESNUM",
                      "CHAIN",
                      "RESOLUTION",
                      "RMSD",
                    ] as const
                  ).map((col) => (
                    <span
                      key={col}
                      className={`font-mono text-[11px] px-5 py-2 font-semibold uppercase tracking-widest text-foreground-subtle ${
                        col === "PDB_CODE" || col === "LIGAND"
                          ? "min-w-[110px]"
                          : col === "RESOLUTION" || col === "RMSD"
                            ? "min-w-[120px]"
                            : "min-w-[90px]"
                      }`}
                    >
                      {col}
                    </span>
                  ))}
                </div>

                {/* Linhas */}
                {csvLinhas.map((linha, i) => (
                  <div
                    key={i}
                    className="flex items-center hover:bg-surface-secondary transition-colors border-b border-outline"
                  >
                    <span className="font-mono text-[11px] select-none text-right pr-4 pl-3 min-w-[44px] text-foreground-subtle opacity-40">
                      {i + 1}
                    </span>
                    <span className="w-px self-stretch bg-outline" />
                    <span className="font-mono text-[12px] px-5 py-1.5 font-bold min-w-[110px] text-accent">
                      {linha.pdb_code}
                    </span>
                    <span className="font-mono text-[12px] px-5 py-1.5 min-w-[110px] text-foreground">
                      {linha.ligand}
                    </span>
                    <span className="font-mono text-[12px] px-5 py-1.5 min-w-[90px] text-foreground-muted">
                      {linha.resnum}
                    </span>
                    <span className="font-mono text-[12px] px-5 py-1.5 min-w-[90px] text-foreground-muted">
                      {linha.chain}
                    </span>
                    <span className="font-mono text-[12px] px-5 py-1.5 min-w-[120px] text-foreground-subtle">
                      {linha.resolution || "—"}
                    </span>
                    <span className="font-mono text-[12px] px-5 py-1.5 min-w-[120px] text-foreground-subtle">
                      {linha.rmsd ?? "—"}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Seção 2b — Dashboard */}
        {dashboard && (
          <section className="rounded-xl border border-outline bg-panel p-5 flex flex-col gap-5">
            <h2 className="text-[13px] font-semibold text-foreground-muted uppercase tracking-wide">
              Visão geral das estruturas
            </h2>

            {/* Stats row */}
            <div className="flex gap-3 flex-wrap">
              {[
                { label: "Total", value: dashboard.total },
                { label: "Ligantes únicos", value: dashboard.ligantesUnicos },
                { label: "Resolução média", value: dashboard.resolucaoMedia },
                { label: "Cadeias únicas", value: dashboard.cadeiaUnicas },
              ].map((s) => (
                <div
                  key={s.label}
                  className="flex-1 min-w-[100px] bg-surface-secondary border border-outline rounded-xl px-4 py-3.5 flex flex-col gap-1"
                >
                  <span className="font-mono font-extrabold leading-none text-[22px] text-accent">
                    {s.value}
                  </span>
                  <span className="uppercase tracking-wide text-[11px] text-foreground-subtle">
                    {s.label}
                  </span>
                </div>
              ))}
            </div>

            {/* Gráficos — 3 colunas */}
            <div className="grid grid-cols-3 gap-4">
              <div className="flex flex-col gap-2">
                <span className="uppercase tracking-wide font-medium text-[11px] text-foreground-subtle">
                  Distribuição de resolução
                </span>
                <ResolutionBarChart
                  data={dashboard.resolucaoFaixas}
                  height={160}
                />
              </div>
              <div className="flex flex-col gap-2">
                <span className="uppercase tracking-wide font-medium text-[11px] text-foreground-subtle flex items-center gap-1">
                  Top ligantes
                  <InfoTooltip text="Moléculas ligantes mais frequentes entre as estruturas filtradas. Cada fatia representa a proporção de estruturas que contém aquele ligante." />
                </span>
                <LigandDonutChart data={dashboard.topLigantes} />
              </div>
              {dashboard.porCadeia.length > 0 && (
                <div className="flex flex-col gap-2">
                  <span className="uppercase tracking-wide font-medium text-[11px] text-foreground-subtle">
                    Estruturas por cadeia
                  </span>
                  <MethodBarChart
                    data={dashboard.porCadeia}
                    height={160}
                    yAxisWidth={30}
                  />
                </div>
              )}
            </div>
          </section>
        )}

        {/* Seção 3 — Configuração */}
        <section className="rounded-xl border border-outline bg-panel p-5 flex flex-col gap-4">
          <h2 className="text-[13px] font-semibold text-foreground-muted uppercase tracking-wide">
            Configuração do redocking
          </h2>

          <div
            className="grid gap-4"
            style={{ gridTemplateColumns: "1fr 1fr" }}
          >
            {/* Alvo terapêutico */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[12px] text-foreground-subtle font-medium">
                Alvo terapêutico
              </label>
              <input
                type="text"
                value={config.target}
                onChange={(e) => handleConfigChange("target", e.target.value)}
                placeholder="ex: GlucanSynthase"
                className="rounded border border-outline bg-surface-secondary px-3 py-2 font-mono text-[12px] text-foreground placeholder:text-foreground-subtle focus:outline-none focus:border-outline-strong"
              />
            </div>

            {/* Pasta dos PDBs */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[12px] text-foreground-subtle font-medium">
                Pasta dos PDBs (entrada)
              </label>
              <input
                type="text"
                value={config.base_input_path}
                onChange={(e) =>
                  handleConfigChange("base_input_path", e.target.value)
                }
                placeholder="ex: /datasets/PDB"
                className="rounded border border-outline bg-surface-secondary px-3 py-2 font-mono text-[12px] text-foreground placeholder:text-foreground-subtle focus:outline-none focus:border-outline-strong"
              />
            </div>

            {/* Pasta de saída */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[12px] text-foreground-subtle font-medium">
                Pasta de saída (resultados)
              </label>
              <input
                type="text"
                value={config.base_output_path}
                onChange={(e) =>
                  handleConfigChange("base_output_path", e.target.value)
                }
                placeholder="ex: /resultados/redocking"
                className="rounded border border-outline bg-surface-secondary px-3 py-2 font-mono text-[12px] text-foreground placeholder:text-foreground-subtle focus:outline-none focus:border-outline-strong"
              />
            </div>

            {/* Tipo de carga */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[12px] text-foreground-subtle font-medium">
                Tipo de carga do ligante
              </label>
              <div className="flex gap-4 pt-1">
                {(["am1", "gas"] as const).map((ct) => (
                  <label
                    key={ct}
                    className="flex items-center gap-2 cursor-pointer"
                    style={{ fontSize: 13 }}
                  >
                    <input
                      type="radio"
                      name="charge_type"
                      value={ct}
                      checked={config.charge_type === ct}
                      onChange={() => handleConfigChange("charge_type", ct)}
                      className="[accent-color:var(--color-accent)]"
                    />
                    <span className="font-mono text-[12px] text-foreground">
                      {ct === "am1" ? "am1 — Amber" : "gas — Gasteiger"}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          {/* Info do e-mail */}
          {userEmail && (
            <p className="text-[12px] text-foreground-subtle">
              Notificação de conclusão será enviada para{" "}
              <span className="font-mono text-foreground-muted">
                {userEmail}
              </span>{" "}
              (e-mail do cadastro)
            </p>
          )}

          {/* Botão iniciar */}
          <div className="pt-1">
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!canSubmit}
              className={`btn-primary inline-flex items-center gap-2 ${
                canSubmit
                  ? "opacity-100 cursor-pointer"
                  : "opacity-40 cursor-not-allowed"
              }`}
            >
              {submitting ? (
                <>
                  <Spinner style={{ width: 14, height: 14, borderWidth: 2 }} />
                  Iniciando...
                </>
              ) : (
                "▶  Iniciar Redocking"
              )}
            </button>
          </div>
        </section>

        {/* Seção 4 — Histórico de jobs */}
        {jobs.length > 0 && (
          <section className="rounded-xl border border-outline bg-panel flex flex-col overflow-hidden">
            <div className="px-5 py-3 border-b border-outline">
              <h2 className="text-[13px] font-semibold text-foreground-muted uppercase tracking-wide">
                Histórico
              </h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b border-outline">
                    {[
                      "ID",
                      "Alvo",
                      "Status",
                      "Carga",
                      "Iniciado",
                      "Finalizado",
                    ].map((col) => (
                      <th
                        key={col}
                        className="px-4 py-2 text-left font-mono text-[11px] font-semibold text-foreground-subtle uppercase tracking-[0.05em] bg-panel"
                      >
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {jobs.map((job, i) => (
                    <tr
                      key={job.id}
                      className="border-b border-outline"
                      style={{
                        background:
                          i % 2 === 0
                            ? "var(--color-panel)"
                            : "var(--color-surface-secondary)",
                      }}
                    >
                      <td className="px-4 py-1.5 font-mono text-[12px] text-foreground-subtle">
                        #{job.id}
                      </td>
                      <td className="px-4 py-1.5 font-mono text-[12px] text-foreground">
                        {job.target}
                      </td>
                      <td className="px-4 py-1.5">
                        <span
                          className="text-[11px] font-semibold font-mono"
                          style={{
                            color:
                              STATUS_COLOR[job.status] ??
                              "var(--color-foreground-subtle)",
                          }}
                        >
                          {STATUS_LABEL[job.status] ?? job.status}
                        </span>
                      </td>
                      <td className="px-4 py-1.5 font-mono text-[12px] text-foreground-muted">
                        {job.charge_type}
                      </td>
                      <td className="px-4 py-1.5 font-mono text-[12px] text-foreground-subtle">
                        {formatDate(job.iniciado_em)}
                      </td>
                      <td className="px-4 py-1.5 font-mono text-[12px] text-foreground-subtle">
                        {formatDate(job.finalizado_em)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </main>
      <Toast message={toast} variant={toastVariant} />
    </div>
  );
}
