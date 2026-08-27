// components/admet/AdmetSummaryCards.tsx
import type { AdmetResultModel } from "../../domain/models/admet.model";

interface CardProps {
  label: string;
  value: number | null;
  color?: string;
  dot?: string;
}

function Card({ label, value, color, dot }: CardProps) {
  return (
    <div
      className="flex flex-col gap-1 rounded-xl border border-outline bg-panel px-4 py-3 min-w-[100px]"
      style={color ? { borderColor: `color-mix(in srgb, ${color} 30%, var(--color-outline))`, background: `color-mix(in srgb, ${color} 8%, var(--color-panel))` } : {}}
    >
      <div className="flex items-center gap-1.5">
        {dot && (
          <span
            className="h-2 w-2 rounded-full shrink-0"
            style={{ background: dot }}
          />
        )}
        <span className="font-mono text-[10px] uppercase tracking-widest text-foreground-subtle">
          {label}
        </span>
      </div>
      <span
        className="font-mono text-[22px] font-bold leading-none"
        style={{ color: color ?? "var(--color-foreground)" }}
      >
        {value ?? "—"}
      </span>
    </div>
  );
}

interface Props {
  result: AdmetResultModel;
}

export function AdmetSummaryCards({ result }: Props) {
  return (
    <div className="flex flex-wrap gap-3">
      <Card label="Moléculas" value={result.total_molecules} />
      <Card
        label="Tóxicas excluídas"
        value={result.excluded_toxic}
        color="var(--color-red)"
      />
      <Card
        label="BBB+"
        value={result.bbb_plus}
        color="var(--color-green)"
        dot="#e05a5a"
      />
      <Card
        label="BBB-"
        value={result.bbb_minus}
        color="var(--color-foreground-subtle)"
        dot="#5a7be0"
      />
      <Card
        label="HIA+"
        value={result.hia_plus}
        color="var(--color-accent)"
      />
    </div>
  );
}
