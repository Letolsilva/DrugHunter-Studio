// components/clustering/ClusteringResultsView.tsx
import { useEffect, useState } from "react";
import { ClusteringCentroidGallery } from "./ClusteringCentroidGallery";
import type { ClusteringMoleculeRow } from "../../domain/models/clustering.model";

const PAGE_SIZE = 50;

interface Props {
  nClusters: number;
  silhouetteScore: number | null;
  centroidBlobUrls: Record<number, string>;
  molecules: ClusteringMoleculeRow[];
  filterCluster: number | null;
  onFilterCluster: (v: number | null) => void;
}

export function ClusteringResultsView({
  nClusters,
  silhouetteScore,
  centroidBlobUrls,
  molecules,
  filterCluster,
  onFilterCluster,
}: Props) {
  const uniqueClusters = Array.from(new Set(molecules.map((m) => m.label))).sort((a, b) => a - b);
  const filtered = filterCluster !== null ? molecules.filter((m) => m.label === filterCluster) : molecules;

  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  // Reset ao trocar filtro
  useEffect(() => { setVisibleCount(PAGE_SIZE); }, [filterCluster]);

  const visible = filtered.slice(0, visibleCount);
  const hasMore = visibleCount < filtered.length;

  return (
    <div className="flex flex-col gap-6">
      {/* Galeria de centroides */}
      <div className="rounded-xl border border-outline bg-panel p-4">
        <ClusteringCentroidGallery nClusters={nClusters} centroidBlobUrls={centroidBlobUrls} />
      </div>

      {/* Tabela de moléculas */}
      <div className="rounded-xl border border-outline bg-panel p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-mono text-[13px] font-semibold text-foreground">
            Moléculas por Cluster
          </h3>
          <div className="flex items-center gap-2">
            <span className="font-mono text-[10px] text-foreground-subtle">Filtrar:</span>
            <button
              onClick={() => onFilterCluster(null)}
              className="font-mono text-[10px] px-2 py-0.5 rounded-full border transition-colors"
              style={
                filterCluster === null
                  ? { background: "var(--color-accent-12)", borderColor: "var(--color-accent-25)", color: "var(--color-accent)" }
                  : { borderColor: "var(--color-outline)", color: "var(--color-foreground-subtle)" }
              }
            >
              Todos
            </button>
            {uniqueClusters.map((c) => (
              <button
                key={c}
                onClick={() => onFilterCluster(c)}
                className="font-mono text-[10px] px-2 py-0.5 rounded-full border transition-colors"
                style={
                  filterCluster === c
                    ? { background: "var(--color-accent-12)", borderColor: "var(--color-accent-25)", color: "var(--color-accent)" }
                    : { borderColor: "var(--color-outline)", color: "var(--color-foreground-subtle)" }
                }
              >
                {c}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-outline">
                <th className="font-mono text-[10px] text-foreground-subtle uppercase tracking-wider pb-2 pr-4">#</th>
                <th className="font-mono text-[10px] text-foreground-subtle uppercase tracking-wider pb-2 pr-4">ChEMBL ID</th>
                <th className="font-mono text-[10px] text-foreground-subtle uppercase tracking-wider pb-2 pr-4">Cluster</th>
                <th className="font-mono text-[10px] text-foreground-subtle uppercase tracking-wider pb-2">SMILES</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((row, i) => (
                <tr key={row.molecule_chembl_id} className="border-b border-outline/50 hover:bg-surface-secondary/50 transition-colors">
                  <td className="font-mono text-[11px] text-foreground-subtle py-2 pr-4">{i + 1}</td>
                  <td className="font-mono text-[11px] text-foreground py-2 pr-4">{row.molecule_chembl_id}</td>
                  <td className="py-2 pr-4">
                    <span
                      className="font-mono text-[10px] px-2 py-0.5 rounded-full"
                      style={{ background: "var(--color-accent-12)", color: "var(--color-accent)" }}
                    >
                      {row.label}
                    </span>
                  </td>
                  <td
                    className="font-mono text-[10px] text-foreground-subtle py-2 max-w-[280px] truncate"
                    title={row.canonical_smiles}
                  >
                    {row.canonical_smiles || "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <p className="font-mono text-[11px] text-foreground-subtle py-4 text-center">
              Nenhuma molécula encontrada.
            </p>
          )}
        </div>

        {/* Rodapé: contador + carregar mais */}
        <div className="flex items-center justify-between mt-3">
          <span className="font-mono text-[10px] text-foreground-subtle">
            Mostrando {visible.length.toLocaleString("pt-BR")} de {filtered.length.toLocaleString("pt-BR")} moléculas
          </span>
          {hasMore && (
            <button
              onClick={() => setVisibleCount((v) => v + PAGE_SIZE)}
              className="font-mono text-[11px] rounded-lg border px-3 py-1.5 transition-colors hover:bg-surface-secondary"
              style={{ borderColor: "var(--color-outline)", color: "var(--color-foreground-subtle)" }}
            >
              Carregar mais {Math.min(PAGE_SIZE, filtered.length - visibleCount).toLocaleString("pt-BR")}
            </button>
          )}
        </div>

        {silhouetteScore !== null && (
          <p className="font-mono text-[10px] text-foreground-subtle mt-3 opacity-70">
            Silhouette score: {silhouetteScore.toFixed(4)} — quanto mais próximo de 1, melhor a separação entre clusters.
          </p>
        )}
      </div>
    </div>
  );
}
