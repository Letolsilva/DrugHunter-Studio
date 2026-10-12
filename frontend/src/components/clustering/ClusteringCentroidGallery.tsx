// components/clustering/ClusteringCentroidGallery.tsx
import { useState } from "react";

interface Props {
  nClusters: number;
  centroidBlobUrls: Record<number, string>;
}

export function ClusteringCentroidGallery({ nClusters, centroidBlobUrls }: Props) {
  const [modalCluster, setModalCluster] = useState<number | null>(null);

  if (nClusters === 0) return null;

  return (
    <>
      <div>
        <h3 className="font-mono text-[12px] font-semibold text-foreground mb-3">
          Centroides por Cluster (Subestrutura Comum — MCS)
        </h3>
        <div className="flex flex-wrap gap-3">
          {Array.from({ length: nClusters }, (_, i) => (
            <div
              key={i}
              className="rounded-xl border border-outline bg-panel p-3 flex flex-col items-center gap-2"
              style={{ minWidth: 160 }}
            >
              <span
                className="font-mono text-[10px] font-semibold px-2 py-0.5 rounded-full"
                style={{ background: "var(--color-accent-12)", color: "var(--color-accent)" }}
              >
                Cluster {i}
              </span>
              {centroidBlobUrls[i] ? (
                <img
                  src={centroidBlobUrls[i]}
                  alt={`Centroide cluster ${i}`}
                  style={{ maxWidth: 180, maxHeight: 140, objectFit: "contain", cursor: "zoom-in" }}
                  onClick={() => setModalCluster(i)}
                />
              ) : (
                <div
                  className="rounded-lg flex items-center justify-center font-mono text-[10px] text-foreground-subtle"
                  style={{ width: 180, height: 140, background: "var(--color-surface-secondary)" }}
                >
                  carregando...
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {modalCluster !== null && centroidBlobUrls[modalCluster] && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ background: "rgba(0,0,0,0.75)" }}
          onClick={() => setModalCluster(null)}
        >
          <div
            className="relative rounded-2xl border border-outline bg-panel p-6 flex flex-col items-center gap-3 shadow-2xl"
            style={{ maxWidth: "90vw", maxHeight: "90vh" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between w-full gap-6">
              <span
                className="font-mono text-[11px] font-semibold px-2 py-0.5 rounded-full"
                style={{ background: "var(--color-accent-12)", color: "var(--color-accent)" }}
              >
                Cluster {modalCluster} — MCS
              </span>
              <button
                onClick={() => setModalCluster(null)}
                className="font-mono text-[18px] text-foreground-subtle hover:text-foreground leading-none"
              >
                ×
              </button>
            </div>
            <img
              src={centroidBlobUrls[modalCluster]}
              alt={`Centroide cluster ${modalCluster}`}
              style={{ maxWidth: "80vw", maxHeight: "75vh", objectFit: "contain" }}
            />
            <div className="flex gap-2">
              {modalCluster > 0 && centroidBlobUrls[modalCluster - 1] && (
                <button
                  onClick={() => setModalCluster(modalCluster - 1)}
                  className="font-mono text-[11px] rounded-lg border px-3 py-1.5 transition-colors hover:bg-surface-secondary"
                  style={{ borderColor: "var(--color-outline)", color: "var(--color-foreground-subtle)" }}
                >
                  ← Cluster {modalCluster - 1}
                </button>
              )}
              {modalCluster < nClusters - 1 && centroidBlobUrls[modalCluster + 1] && (
                <button
                  onClick={() => setModalCluster(modalCluster + 1)}
                  className="font-mono text-[11px] rounded-lg border px-3 py-1.5 transition-colors hover:bg-surface-secondary"
                  style={{ borderColor: "var(--color-outline)", color: "var(--color-foreground-subtle)" }}
                >
                  Cluster {modalCluster + 1} →
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
