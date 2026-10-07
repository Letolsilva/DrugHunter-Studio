// templates/consensus/ConsensusTemplate.tsx
import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Navbar, DropdownMenu } from "../../components/layout";
import { MiddleBar } from "../../components/nav/MiddleBar";
import { Spinner } from "../../components/ui/Spinner";
import {
  ArrowLeftIcon,
  HelpIcon,
  LogoutIcon,
  MenuIcon,
  SettingsIcon,
} from "../../components/icons";
import { ConsensusSetupForm } from "../../components/consensus/ConsensusSetupForm";
import { ConsensusResultsTable } from "../../components/consensus/ConsensusResultsTable";
import { ConsensusCorrelationModal } from "../../components/consensus/ConsensusCorrelationModal";
import type { UseConsensusPageReturn } from "../../pages/ConsensusPage/useConsensusPage";

export default function ConsensusTemplate(props: UseConsensusPageReturn) {
  const {
    mode,
    job,
    admetResult,
    resultRows,
    redockingJobs,
    error,
    selectedCategories,
    onToggleCategory,
    pdbId,
    onPdbId,
    ligandResname,
    onLigandResname,
    ligandResnum,
    onLigandResnum,
    chain,
    onChain,
    baseInputPath,
    onBaseInputPath,
    baseDockingOutputPath,
    onBaseDockingOutputPath,
    chargeType,
    onChargeType,
    prepareComplex,
    onPrepareComplex,
    maxMols,
    onMaxMols,
    onSubmit,
    submitting,
    submitError,
    showCorrelation,
    onOpenCorrelation,
    onCloseCorrelation,
    onDownload,
    onRerun,
    onGoCluster,
    handleLogout,
    voltarAdmet,
  } = props;

  const navigate = useNavigate();
  const [menuAberto, setMenuAberto] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const titulo = job ? `Consenso — ${job.target}` : "Docking de Consenso";

  return (
    <div className="min-h-screen bg-surface-primary">
      <Navbar>
        <Navbar.Left>
          <button
            className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 font-mono text-[12px] text-foreground-subtle hover:bg-surface-secondary transition-colors"
            onClick={voltarAdmet}
          >
            <ArrowLeftIcon size={14} />
            Voltar
          </button>
        </Navbar.Left>
        <Navbar.Middle>
          <MiddleBar activeModule="chembl" />
        </Navbar.Middle>
        <Navbar.Right>
          <DropdownMenu
            isOpen={menuAberto}
            menuRef={menuRef}
            onToggle={() => setMenuAberto((v) => !v)}
            trigger={<MenuIcon size={18} />}
          >
            <DropdownMenu.Item
              icon={<SettingsIcon size={14} />}
              label="Configurações"
              onClick={() => navigate("/configuracoes")}
            />
            <DropdownMenu.Item
              icon={<HelpIcon size={14} />}
              label="Ajuda"
              onClick={() => navigate("/ajuda")}
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

      <main className="mx-auto max-w-5xl px-4 pb-12 pt-6">
        {/* Cabeçalho */}
        <div className="mb-6">
          <h1 className="font-mono text-[18px] font-bold text-foreground">
            {titulo}
          </h1>
          <p className="font-mono text-[12px] text-foreground-subtle mt-0.5">
            Vina · Dock6 · Ranking por score de consenso
          </p>
        </div>

        {/* ── Loading inicial ───────────────────────────────────────────────── */}
        {mode === "loading" && (
          <div className="flex justify-center py-20">
            <Spinner style={{ width: 28, height: 28, borderWidth: 3 }} />
          </div>
        )}

        {/* ── Formulário de setup ───────────────────────────────────────────── */}
        {mode === "setup" && admetResult && (
          <ConsensusSetupForm
            admetResult={admetResult}
            redockingJobs={redockingJobs}
            selectedCategories={selectedCategories}
            onToggleCategory={onToggleCategory}
            pdbId={pdbId}
            onPdbId={onPdbId}
            ligandResname={ligandResname}
            onLigandResname={onLigandResname}
            ligandResnum={ligandResnum}
            onLigandResnum={onLigandResnum}
            chain={chain}
            onChain={onChain}
            baseInputPath={baseInputPath}
            onBaseInputPath={onBaseInputPath}
            baseDockingOutputPath={baseDockingOutputPath}
            onBaseDockingOutputPath={onBaseDockingOutputPath}
            chargeType={chargeType}
            onChargeType={onChargeType}
            prepareComplex={prepareComplex}
            onPrepareComplex={onPrepareComplex}
            maxMols={maxMols}
            onMaxMols={onMaxMols}
            onSubmit={onSubmit}
            submitting={submitting}
            submitError={submitError}
          />
        )}

        {/* ── Running ───────────────────────────────────────────────────────── */}
        {mode === "running" && (
          <div className="flex flex-col items-center justify-center gap-5 min-h-[60vh] text-center">
            <Spinner style={{ width: 36, height: 36, borderWidth: 3 }} />
            <div className="flex flex-col gap-1">
              <p className="font-mono text-[14px] font-semibold text-foreground">
                Docking de consenso em execução
              </p>
              <p className="font-mono text-[12px] text-foreground-subtle">
                Vina e Dock6 estão processando
                {job?.mol_count
                  ? ` ${job.mol_count.toLocaleString("pt-BR")} moléculas`
                  : ""}
                . Pode demorar vários minutos.
              </p>
              <p className="font-mono text-[11px] text-foreground-subtle opacity-60">
                Você pode sair desta página e voltar depois — o processamento
                continua em segundo plano.
              </p>
            </div>
            <button
              onClick={voltarAdmet}
              className="font-mono text-[12px] rounded-lg border px-4 py-2 transition-colors hover:bg-surface-secondary"
              style={{
                borderColor: "var(--color-outline)",
                color: "var(--color-foreground-subtle)",
              }}
            >
              ← Voltar para ADMET
            </button>
          </div>
        )}

        {/* ── Erro ─────────────────────────────────────────────────────────── */}
        {mode === "error" && (
          <div className="rounded-xl border border-red-400/30 bg-red-500/10 px-4 py-4 flex items-start justify-between gap-4">
            <div>
              <p className="font-mono text-[13px] font-semibold text-red-400 mb-1">
                Erro no docking de consenso
              </p>
              <p className="font-mono text-[12px] text-red-400/80">{error}</p>
            </div>
            <div className="flex gap-2 flex-wrap">
              {job && (
                <button
                  onClick={onRerun}
                  className="cursor-pointer shrink-0 font-mono text-[11px] rounded-lg border px-3 py-1.5 transition-colors hover:bg-surface-secondary"
                  style={{
                    borderColor: "var(--color-outline)",
                    color: "var(--color-foreground-subtle)",
                  }}
                >
                  Tentar novamente
                </button>
              )}
              <button
                onClick={() => window.history.back()}
                className="cursor-pointer shrink-0 font-mono text-[11px] rounded-lg border px-3 py-1.5 transition-colors hover:bg-surface-secondary"
                style={{
                  borderColor: "var(--color-outline)",
                  color: "var(--color-foreground-subtle)",
                }}
              >
                ← Voltar
              </button>
            </div>
          </div>
        )}

        {/* ── Resultados ────────────────────────────────────────────────────── */}
        {mode === "results" && job && (
          <div className="flex flex-col gap-6">
            {/* Cards de resumo */}
            <div className="flex gap-3 flex-wrap">
              <div className="rounded-xl border border-outline bg-panel px-4 py-3">
                <p className="font-mono text-[10px] text-foreground-subtle uppercase tracking-wider">
                  Moléculas
                </p>
                <p className="font-mono text-[20px] font-bold text-foreground">
                  {(job.mol_count ?? 0).toLocaleString("pt-BR")}
                </p>
              </div>
              <div className="rounded-xl border border-outline bg-panel px-4 py-3">
                <p className="font-mono text-[10px] text-foreground-subtle uppercase tracking-wider">
                  Melhor z-score
                </p>
                <p
                  className="font-mono text-[20px] font-bold text-foreground"
                  style={{ color: "#22c55e" }}
                >
                  {resultRows[0]?.["z-score"].toFixed(2) ?? "—"}
                </p>
              </div>
              <div className="rounded-xl border border-outline bg-panel px-4 py-3">
                <p className="font-mono text-[10px] text-foreground-subtle uppercase tracking-wider">
                  Alvo
                </p>
                <p className="font-mono text-[14px] font-bold text-foreground">
                  {job.target}
                </p>
              </div>
              <div className="rounded-xl border border-outline bg-panel px-4 py-3">
                <p className="font-mono text-[10px] text-foreground-subtle uppercase tracking-wider">
                  PDB
                </p>
                <p className="font-mono text-[14px] font-bold text-foreground">
                  {job.pdb_id}
                </p>
              </div>

              {/* Ações */}
              <div className="ml-auto flex gap-2 items-center flex-wrap">
                <button
                  onClick={onRerun}
                  className="font-mono text-[11px] rounded-xl border px-3 py-3 transition-colors hover:bg-surface-secondary"
                  style={{
                    borderColor: "var(--color-outline)",
                    color: "var(--color-foreground-subtle)",
                  }}
                >
                  ↺ Rodar novamente
                </button>
                {resultRows.length > 1 && (
                  <button
                    onClick={onOpenCorrelation}
                    className="font-mono text-[12px] rounded-xl border px-4 py-3 font-semibold transition-all hover:opacity-80"
                    style={{
                      borderColor: "var(--color-accent-25)",
                      color: "var(--color-accent)",
                      background: "var(--color-accent-12)",
                    }}
                  >
                    Ver correlação
                  </button>
                )}

                <button
                  onClick={onGoCluster}
                  className="font-mono text-[12px] rounded-xl border px-4 py-3 font-semibold transition-all hover:opacity-80"
                  style={{
                    borderColor: "var(--color-accent-25)",
                    color: "var(--color-accent)",
                    background: "var(--color-accent-12)",
                  }}
                >
                  Clustering →
                </button>
              </div>
            </div>

            {/* Tabela */}
            <div className="rounded-xl border border-outline bg-panel p-4">
              <h2 className="font-mono text-[13px] font-semibold text-foreground mb-4">
                Ranking de consenso
              </h2>
              <ConsensusResultsTable rows={resultRows} />
            </div>
          </div>
        )}
      </main>

      {/* Modal de correlação */}
      {showCorrelation && (
        <ConsensusCorrelationModal
          rows={resultRows}
          onClose={onCloseCorrelation}
        />
      )}
    </div>
  );
}
