// components/chembl/NetworkModal.tsx
// Modal de rede de similaridade: plot + scaffold (MCS) + histograma de Tanimoto.

import { useEffect, useRef } from "react";
import SmilesDrawer from "smiles-drawer";
import type { NetworkInfo } from "../../domain/models/chembl.model";
import { CloseIcon } from "../icons";

interface Props {
  network: NetworkInfo;
  plotUrl: string;
  onClose: () => void;
}

function ScaffoldCanvas({ smiles }: { smiles: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current) return;
    const drawer = new SmilesDrawer.Drawer({ width: 240, height: 170 });
    SmilesDrawer.parse(
      smiles,
      (tree: unknown) => {
        if (canvasRef.current) drawer.draw(tree, canvasRef.current, "light");
      },
      () => {
        const ctx = canvasRef.current?.getContext("2d");
        if (ctx) {
          ctx.font = "13px monospace";
          ctx.fillStyle = "#888";
          ctx.fillText("Estrutura indisponível", 10, 100);
        }
      },
    );
  }, [smiles]);

  return <canvas ref={canvasRef} width={240} height={170} className="rounded bg-white w-full" style={{ maxWidth: 240 }} />;
}

function SimHistogram({ bins }: { bins: NetworkInfo["sim_bins"] }) {
  if (!bins.length) return null;
  const max = Math.max(...bins.map((b) => b.count));
  const total = bins.reduce((s, b) => s + b.count, 0);

  return (
    <div className="flex flex-col gap-2">
      {bins.map((bin) => {
        const pct = max > 0 ? (bin.count / max) * 100 : 0;
        const pctOfTotal = total > 0 ? ((bin.count / total) * 100).toFixed(1) : "0";
        return (
          <div key={bin.range} className="flex flex-col gap-0.5">
            <div className="flex items-center justify-between">
              <span className="font-mono text-[12px] font-semibold text-foreground">
                {bin.range}
              </span>
              <span className="font-mono text-[11px] text-foreground-subtle">
                {bin.count.toLocaleString("pt-BR")}
                <span className="ml-1 opacity-60">({pctOfTotal}%)</span>
              </span>
            </div>
            <div
              className="w-full h-4 rounded overflow-hidden"
              style={{ background: "var(--color-surface-secondary)" }}
            >
              <div
                className="h-full rounded transition-all"
                style={{
                  width: `${pct}%`,
                  background: "var(--color-accent)",
                  opacity: 0.8,
                }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function NetworkModal({ network, plotUrl, onClose }: Props) {
  const typeLabel = network.analysis_type === "SIMS" ? "Similaridade" : "Propriedade Molecular";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto py-8 px-4"
      style={{ background: "rgba(0,0,0,0.65)" }}
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-4xl rounded-xl border border-outline bg-panel shadow-menu flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3 px-6 pt-5 pb-4 border-b border-outline">
          <div className="flex flex-col gap-1 min-w-0">
            <span className="text-[15px] font-extrabold text-foreground tracking-tight truncate">
              {network.item_name}
            </span>
            <span className="font-mono text-[12px] text-foreground-subtle">
              Rede por {typeLabel}
              <span className="mx-2 opacity-40">·</span>
              <span style={{ color: "var(--color-green)", fontWeight: 600 }}>
                {network.mcc_count.toLocaleString("pt-BR")} mol. no MCC
              </span>
              <span className="mx-2 opacity-40">·</span>
              {network.total_nodes.toLocaleString("pt-BR")} total
              <span className="mx-2 opacity-40">·</span>
              <span className="opacity-60">{network.fingerprint} · {network.metric}</span>
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="cursor-pointer rounded border-none bg-transparent p-1.5 text-foreground-subtle hover:text-foreground transition-colors shrink-0 mt-0.5"
          >
            <CloseIcon size={18} />
          </button>
        </div>

        {/* Corpo */}
        <div className="flex flex-col lg:flex-row min-h-0">

          {/* Gráfico da rede — coluna principal */}
          <div className="flex-1 p-5 flex flex-col gap-3 min-w-0">
            <span className="font-mono text-[11px] uppercase tracking-widest text-foreground-subtle">
              Gráfico da Rede
            </span>
            {network.has_plot ? (
              <div className="overflow-hidden rounded-xl border border-outline bg-white">
                <img
                  src={plotUrl}
                  alt={`Rede ${network.filename}`}
                  className="w-full h-auto object-contain"
                />
              </div>
            ) : (
              <div
                className="flex items-center justify-center rounded-xl border border-outline h-48"
                style={{ background: "var(--color-surface-secondary)" }}
              >
                <span className="font-mono text-[13px] text-foreground-subtle italic">
                  Plot indisponível
                </span>
              </div>
            )}
          </div>

          {/* Painel lateral */}
          <div className="lg:w-76 shrink-0 flex flex-col gap-5 p-5 border-t lg:border-t-0 lg:border-l border-outline">

            {/* Scaffold MCS */}
            <div className="flex flex-col gap-3">
              <span className="font-mono text-[11px] uppercase tracking-widest text-foreground-subtle">
                Scaffold (MCS)
              </span>
              {network.scaffold_smiles ? (
                <div className="flex flex-col gap-2">
                  <div className="flex justify-center">
                    <ScaffoldCanvas smiles={network.scaffold_smiles} />
                  </div>
                  <div
                    className="rounded-lg border border-outline px-3 py-2"
                    style={{ background: "var(--color-surface-secondary)" }}
                  >
                    <span className="font-mono text-[11px] break-all leading-relaxed text-foreground-subtle">
                      {network.scaffold_smiles}
                    </span>
                  </div>
                </div>
              ) : (
                <div
                  className="flex items-center justify-center h-24 rounded-xl border border-outline"
                  style={{ background: "var(--color-surface-secondary)" }}
                >
                  <span className="font-mono text-[13px] text-foreground-subtle italic">
                    Scaffold indisponível
                  </span>
                </div>
              )}
            </div>

            {/* Distribuição Tanimoto */}
            {network.sim_bins.length > 0 && (
              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-0.5">
                  <span className="font-mono text-[11px] uppercase tracking-widest text-foreground-subtle">
                    Distribuição {network.metric}
                  </span>
                  <span className="font-mono text-[11px] text-foreground-subtle opacity-70">
                    Similaridade entre pares de moléculas
                  </span>
                </div>
                <SimHistogram bins={network.sim_bins} />
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  );
}
