// components/chembl/ChemblProgressCard.tsx
// Card de progresso SSE para um alvo no grupo ChEMBL.

import { Spinner } from "../ui/Spinner";

export interface ItemProgress {
  idx: number;
  item_id: number;
  target: string;
  status: "pending" | "running" | "done" | "error";
  etapa: string | null;
  molecules_count: number | null;
  error_msg: string | null;
}

const ETAPAS = ["targets", "bioatividades", "moleculas", "similares"] as const;
type Etapa = (typeof ETAPAS)[number];

const ETAPA_LABELS: Record<Etapa, string> = {
  targets: "Alvos",
  bioatividades: "Bioatividades",
  moleculas: "Moléculas",
  similares: "Similares",
};

interface Props {
  progress: ItemProgress;
}

export function ChemblProgressCard({ progress }: Props) {
  const { target, status, etapa, molecules_count, error_msg } = progress;

  const etapaIdx = etapa ? ETAPAS.indexOf(etapa as Etapa) : -1;
  const isRunning = status === "running";
  const isDone = status === "done";
  const isError = status === "error";

  const statusColor = isDone
    ? "var(--color-green)"
    : isError
      ? "var(--color-red)"
      : isRunning
        ? "var(--color-accent)"
        : "var(--color-foreground-subtle)";

  return (
    <div
      className="flex flex-col gap-3 rounded-xl border p-4 transition-all"
      style={{ borderColor: isError ? "color-mix(in srgb, var(--color-red) 30%, var(--color-outline))" : "var(--color-outline)" }}
    >
      <div className="flex items-center gap-2">
        {isRunning && <Spinner style={{ width: 14, height: 14, borderWidth: 2 }} />}
        {isDone && (
          <span style={{ color: "var(--color-green)", fontSize: 14 }}>✓</span>
        )}
        {isError && (
          <span style={{ color: "var(--color-red)", fontSize: 14 }}>✕</span>
        )}
        {status === "pending" && (
          <span
            className="h-2 w-2 rounded-full shrink-0"
            style={{ background: "var(--color-foreground-subtle)" }}
          />
        )}
        <span className="font-mono text-[13px] font-semibold text-foreground truncate flex-1">
          {target}
        </span>
        <span className="font-mono text-[11px] shrink-0" style={{ color: statusColor }}>
          {isDone && molecules_count != null
            ? `${molecules_count} mol.`
            : isError
              ? "erro"
              : isRunning
                ? etapa ? ETAPA_LABELS[etapa as Etapa] ?? etapa : "iniciando..."
                : "aguardando"}
        </span>
      </div>

      {/* Barra de etapas */}
      {(isRunning || isDone) && (
        <div className="flex gap-1">
          {ETAPAS.map((e, i) => {
            const passed = isDone || i < etapaIdx;
            const current = isRunning && i === etapaIdx;
            return (
              <div
                key={e}
                className="flex-1 rounded-full h-1 transition-all"
                style={{
                  background: passed
                    ? "var(--color-accent)"
                    : current
                      ? "color-mix(in srgb, var(--color-accent) 50%, transparent)"
                      : "var(--color-outline)",
                }}
                title={ETAPA_LABELS[e]}
              />
            );
          })}
        </div>
      )}

      {isError && error_msg && (
        <p
          className="font-mono text-[11px] leading-snug select-text cursor-text"
          style={{ color: "var(--color-red)" }}
        >
          {error_msg}
        </p>
      )}
    </div>
  );
}
