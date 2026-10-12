// templates/clustering/ClusteringTemplate.tsx
import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Navbar, DropdownMenu } from "../../components/layout";
import { MiddleBar } from "../../components/nav/MiddleBar";
import { Spinner } from "../../components/ui/Spinner";
import { CancelJobButton } from "../../components/ui/CancelJobButton";
import {
  ArrowLeftIcon,
  HelpIcon,
  LogoutIcon,
  MenuIcon,
  SettingsIcon,
} from "../../components/icons";
import { ClusteringSetupForm } from "../../components/clustering/ClusteringSetupForm";
import { ClusteringResultsView } from "../../components/clustering/ClusteringResultsView";
import { ClusteringTsneChart } from "../../components/clustering/ClusteringTsneChart";
import type { UseClusteringPageReturn } from "../../pages/ClusteringPage/useClusteringPage";

export default function ClusteringTemplate(props: UseClusteringPageReturn) {
  const {
    mode,
    job,
    error,
    fingerprintType,
    onFingerprintType,
    baseOutputPath,
    onBaseOutputPath,
    onSubmit,
    submitting,
    submitError,
    molecules,
    filterCluster,
    onFilterCluster,
    showPlot,
    onOpenPlot,
    onClosePlot,
    tsnePoints,
    plotBlobUrl,
    centroidBlobUrls,
    onRerun,
    handleCancelar,
    handleLogout,
  } = props;

  const navigate = useNavigate();
  const [menuAberto, setMenuAberto] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const titulo = job ? `Clustering — ${job.target}` : "Clustering de Moléculas";

  return (
    <div className="min-h-screen bg-surface-primary">
      <Navbar>
        <Navbar.Left>
          <button
            className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 font-mono text-[12px] text-foreground-subtle hover:bg-surface-secondary transition-colors"
            onClick={() => navigate(-1)}
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
        <div className="mb-6">
          <h1 className="font-mono text-[18px] font-bold text-foreground">
            {titulo}
          </h1>
          <p className="font-mono text-[12px] text-foreground-subtle mt-0.5">
            PCA · KMeans · t-SNE · Subestrutura Comum (MCS)
          </p>
        </div>

        {/* ── Loading ──────────────────────────────────────────────────────── */}
        {mode === "loading" && (
          <div className="flex justify-center py-20">
            <Spinner style={{ width: 28, height: 28, borderWidth: 3 }} />
          </div>
        )}

        {/* ── Setup ────────────────────────────────────────────────────────── */}
        {mode === "setup" && (
          <ClusteringSetupForm
            fingerprintType={fingerprintType}
            onFingerprintType={onFingerprintType}
            baseOutputPath={baseOutputPath}
            onBaseOutputPath={onBaseOutputPath}
            onSubmit={onSubmit}
            submitting={submitting}
            submitError={submitError}
          />
        )}

        {/* ── Running ──────────────────────────────────────────────────────── */}
        {mode === "running" && (
          <div className="flex flex-col items-center justify-center gap-5 min-h-[60vh] text-center">
            <Spinner style={{ width: 36, height: 36, borderWidth: 3 }} />
            <div className="flex flex-col gap-1">
              <p className="font-mono text-[14px] font-semibold text-foreground">
                Clustering em execução
              </p>
              <p className="font-mono text-[12px] text-foreground-subtle">
                PCA, KMeans e t-SNE estão sendo calculados. Pode demorar alguns
                minutos.
              </p>
              <p className="font-mono text-[11px] text-foreground-subtle opacity-60">
                Você pode sair desta página e voltar depois — o processamento
                continua em segundo plano.
              </p>
            </div>
            <div className="flex gap-2 items-center">
              <button
                onClick={() => navigate(-1)}
                className="font-mono text-[12px] rounded-lg border px-4 py-2 transition-colors hover:bg-surface-secondary"
                style={{
                  borderColor: "var(--color-outline)",
                  color: "var(--color-foreground-subtle)",
                }}
              >
                ← Voltar
              </button>
              <CancelJobButton onCancel={handleCancelar} />
            </div>
          </div>
        )}

        {/* ── Cancelado ────────────────────────────────────────────────────── */}
        {mode === "cancelled" && (
          <div className="rounded-xl border border-outline bg-panel px-4 py-4 flex items-start justify-between gap-4">
            <div>
              <p className="font-mono text-[13px] font-semibold text-foreground mb-1">
                Processamento cancelado
              </p>
              <p className="font-mono text-[12px] text-foreground-subtle">
                O clustering foi interrompido a pedido do usuário.
              </p>
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
                  Rodar novamente
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

        {/* ── Erro ─────────────────────────────────────────────────────────── */}
        {mode === "error" && (
          <div className="rounded-xl border border-red-400/30 bg-red-500/10 px-4 py-4 flex items-start justify-between gap-4">
            <div>
              <p className="font-mono text-[13px] font-semibold text-red-400 mb-1">
                Erro no clustering
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

        {/* ── Resultados ───────────────────────────────────────────────────── */}
        {mode === "results" && job && (
          <div className="flex flex-col gap-6">
            {/* Cards de resumo + ações */}
            <div className="flex gap-3 flex-wrap items-center">
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
                  Clusters
                </p>
                <p className="font-mono text-[20px] font-bold text-foreground">
                  {job.n_clusters ?? "—"}
                </p>
              </div>
              <div className="rounded-xl border border-outline bg-panel px-4 py-3">
                <p className="font-mono text-[10px] text-foreground-subtle uppercase tracking-wider">
                  Silhouette
                </p>
                <p
                  className="font-mono text-[20px] font-bold text-foreground"
                  style={{ color: "#22c55e" }}
                >
                  {job.silhouette_score !== null
                    ? job.silhouette_score.toFixed(4)
                    : "—"}
                </p>
              </div>
              <div className="rounded-xl border border-outline bg-panel px-4 py-3">
                <p className="font-mono text-[10px] text-foreground-subtle uppercase tracking-wider">
                  Moléculas
                </p>
                <p className="font-mono text-[20px] font-bold text-foreground">
                  {molecules.length.toLocaleString("pt-BR")}
                </p>
              </div>
              <div className="rounded-xl border border-outline bg-panel px-4 py-3">
                <p className="font-mono text-[10px] text-foreground-subtle uppercase tracking-wider">
                  Fingerprint
                </p>
                <p className="font-mono text-[13px] font-bold text-foreground capitalize">
                  {job.fingerprint_type}
                </p>
              </div>
              {job.max_mols && (
                <div className="rounded-xl border border-outline bg-panel px-4 py-3">
                  <p className="font-mono text-[10px] text-foreground-subtle uppercase tracking-wider">
                    Limite
                  </p>
                  <p className="font-mono text-[13px] font-bold text-foreground">
                    {job.max_mols.toLocaleString("pt-BR")} mol.
                  </p>
                </div>
              )}

              {/* Ações */}
              <div className="ml-auto flex gap-2 items-center">
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
                {(tsnePoints || plotBlobUrl) && (
                  <button
                    onClick={onOpenPlot}
                    className="font-mono text-[12px] rounded-xl border px-4 py-3 font-semibold transition-all hover:opacity-80"
                    style={{
                      borderColor: "var(--color-accent-25)",
                      color: "var(--color-accent)",
                      background: "var(--color-accent-12)",
                    }}
                  >
                    Ver t-SNE
                  </button>
                )}

                <button
                  onClick={() => navigate(`/neurodock?clustering_id=${job.id}`)}
                  disabled={job.status !== "done"}
                  className="font-mono text-[12px] rounded-xl border px-4 py-3 font-semibold transition-all hover:opacity-80 disabled:opacity-40 disabled:cursor-not-allowed"
                  style={{
                    borderColor: "var(--color-accent-25)",
                    color: "var(--color-accent)",
                    background: "var(--color-accent-12)",
                  }}
                >
                  NeuroDock →
                </button>
              </div>
            </div>

            {/* Resultados: galeria + tabela */}
            <ClusteringResultsView
              nClusters={job.n_clusters ?? 0}
              silhouetteScore={job.silhouette_score}
              centroidBlobUrls={centroidBlobUrls}
              molecules={molecules}
              filterCluster={filterCluster}
              onFilterCluster={onFilterCluster}
            />
          </div>
        )}
      </main>

      {/* Modal t-SNE */}
      {showPlot && (tsnePoints || plotBlobUrl) && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ background: "rgba(0,0,0,0.7)" }}
          onClick={onClosePlot}
        >
          <div
            className="relative rounded-xl border border-outline bg-panel p-4 overflow-y-auto"
            style={{ width: "min(92vw, 860px)", maxHeight: "92vh" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-mono text-[13px] font-semibold text-foreground">
                t-SNE — Clustering por {job?.fingerprint_type ?? "fingerprint"}
              </h3>
              <button
                onClick={onClosePlot}
                className="font-mono text-[12px] text-foreground-subtle hover:text-foreground transition-colors ml-8"
              >
                ✕ Fechar
              </button>
            </div>

            {tsnePoints ? (
              <ClusteringTsneChart
                points={tsnePoints}
                fingerprintType={job?.fingerprint_type ?? "fingerprint"}
              />
            ) : plotBlobUrl ? (
              <img
                src={plotBlobUrl}
                alt="t-SNE clustering"
                style={{ maxWidth: "100%", maxHeight: "75vh", objectFit: "contain" }}
              />
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}
