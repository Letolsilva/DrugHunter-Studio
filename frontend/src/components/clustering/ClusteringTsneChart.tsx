// components/clustering/ClusteringTsneChart.tsx
import { useMemo, useState } from "react";
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import type { TsnePoint } from "../../domain/models/clustering.model";

// Paleta tab10 do matplotlib — mesmas cores do PNG gerado pelo DrugHunter
const CLUSTER_COLORS = [
  "#1f77b4", // azul
  "#ff7f0e", // laranja
  "#2ca02c", // verde
  "#d62728", // vermelho
  "#9467bd", // roxo
  "#8c564b", // marrom
  "#e377c2", // rosa
  "#7f7f7f", // cinza
  "#bcbd22", // amarelo-verde
  "#17becf", // ciano
  "#aec7e8", // azul claro
  "#ffbb78", // laranja claro
  "#98df8a", // verde claro
  "#ff9896", // vermelho claro
  "#c5b0d5", // lilás
  "#c49c94", // marrom claro
  "#f7b6d2", // rosa claro
  "#c7c7c7", // cinza claro
  "#dbdb8d", // amarelo claro
  "#9edae5", // ciano claro
];

function clusterColor(label: number): string {
  return CLUSTER_COLORS[label % CLUSTER_COLORS.length];
}

interface TooltipProps {
  active?: boolean;
  payload?: Array<{ payload: TsnePoint }>;
}

function TsneTooltip({ active, payload }: TooltipProps) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;
  return (
    <div
      className="rounded-lg border p-3 font-mono text-[11px] max-w-[260px]"
      style={{
        background: "var(--color-panel)",
        borderColor: "var(--color-outline)",
        color: "var(--color-foreground)",
      }}
    >
      <p className="font-semibold mb-1">{p.id}</p>
      <p style={{ color: "var(--color-foreground-subtle)" }} className="mb-1">
        Cluster {p.label}
      </p>
      <p
        className="break-all leading-tight opacity-70"
        style={{ color: "var(--color-foreground-subtle)" }}
      >
        {p.smiles.length > 80 ? p.smiles.slice(0, 80) + "…" : p.smiles}
      </p>
    </div>
  );
}

interface Props {
  points: TsnePoint[];
  fingerprintType: string;
}

export function ClusteringTsneChart({ points, fingerprintType }: Props) {
  const clusters = useMemo(
    () => Array.from(new Set(points.map((p) => p.label))).sort((a, b) => a - b),
    [points],
  );

  const [hidden, setHidden] = useState<Set<number>>(new Set());

  const byCluster = useMemo(() => {
    const map: Record<number, TsnePoint[]> = {};
    for (const p of points) {
      if (!hidden.has(p.label)) {
        (map[p.label] ??= []).push(p);
      }
    }
    return map;
  }, [points, hidden]);

  const toggleCluster = (label: number) => {
    setHidden((prev) => {
      const next = new Set(prev);
      next.has(label) ? next.delete(label) : next.add(label);
      return next;
    });
  };

  return (
    <div className="flex flex-col gap-3">
      {/* Legenda clicável */}
      <div className="flex flex-wrap gap-2">
        {clusters.map((c) => (
          <button
            key={c}
            onClick={() => toggleCluster(c)}
            className="flex items-center gap-1.5 rounded-full px-2.5 py-0.5 font-mono text-[10px] border transition-opacity"
            style={{
              borderColor: hidden.has(c)
                ? "var(--color-outline)"
                : clusterColor(c) + "88",
              background: hidden.has(c)
                ? "transparent"
                : clusterColor(c) + "22",
              color: hidden.has(c)
                ? "var(--color-foreground-subtle)"
                : clusterColor(c),
              opacity: hidden.has(c) ? 0.45 : 1,
            }}
          >
            <span
              className="inline-block rounded-full"
              style={{
                width: 7,
                height: 7,
                background: clusterColor(c),
                opacity: hidden.has(c) ? 0.3 : 1,
              }}
            />
            C{c}
          </button>
        ))}
        {hidden.size > 0 && (
          <button
            onClick={() => setHidden(new Set())}
            className="font-mono text-[10px] px-2.5 py-0.5 rounded-full border transition-colors hover:bg-surface-secondary"
            style={{
              borderColor: "var(--color-outline)",
              color: "var(--color-foreground-subtle)",
            }}
          >
            Mostrar todos
          </button>
        )}
      </div>

      {/* Gráfico */}
      <ResponsiveContainer width="100%" height={460}>
        <ScatterChart margin={{ top: 10, right: 20, bottom: 28, left: 20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#cccccc" opacity={0.5} />
          <XAxis
            dataKey="x"
            type="number"
            domain={["auto", "auto"]}
            name="t-SNE 1"
            tick={{ fontFamily: "monospace", fontSize: 10, fill: "#666" }}
            tickLine={false}
            axisLine={{ stroke: "#aaa" }}
            label={{
              value: "PC1 (t-SNE)",
              position: "insideBottom",
              offset: -16,
              style: { fontFamily: "monospace", fontSize: 11, fill: "#555" },
            }}
          />
          <YAxis
            dataKey="y"
            type="number"
            domain={["auto", "auto"]}
            name="t-SNE 2"
            tick={{ fontFamily: "monospace", fontSize: 10, fill: "#666" }}
            tickLine={false}
            axisLine={{ stroke: "#aaa" }}
            label={{
              value: "PC2 (t-SNE)",
              angle: -90,
              position: "insideLeft",
              offset: 14,
              style: { fontFamily: "monospace", fontSize: 11, fill: "#555" },
            }}
          />
          <Tooltip
            content={<TsneTooltip />}
            cursor={{ strokeDasharray: "3 3" }}
          />
          {clusters.map((c) => {
            const color = clusterColor(c);
            return (
              <Scatter
                key={c}
                name={`C${c}`}
                data={byCluster[c] ?? []}
                fill={color}
                shape={(props: { cx?: number; cy?: number }) => (
                  <circle
                    cx={props.cx}
                    cy={props.cy}
                    r={2}
                    fill={color}
                    fillOpacity={0.85}
                    stroke="none"
                  />
                )}
              />
            );
          })}
        </ScatterChart>
      </ResponsiveContainer>

      <p className="font-mono text-[10px] text-foreground-subtle opacity-60">
        t-SNE · fingerprint {fingerprintType} ·{" "}
        {points.length.toLocaleString("pt-BR")} moléculas · {clusters.length}{" "}
        clusters — passe o mouse sobre os pontos para ver detalhes
      </p>
    </div>
  );
}
