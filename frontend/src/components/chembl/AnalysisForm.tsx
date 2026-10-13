// components/chembl/AnalysisForm.tsx
// Formulário de análise de fingerprints e similaridade molecular.

import { Spinner } from "../ui/Spinner";

type Fingerprint = "morgan" | "maccs" | "pharmacophore";
type Metric = "Tanimoto" | "Dice" | "Cosine";

interface Props {
  fingerprint: Fingerprint;
  metric: Metric;
  loading: boolean;
  analysisRunning?: boolean;
  onFingerprintChange: (v: Fingerprint) => void;
  onMetricChange: (v: Metric) => void;
  onSubmit: () => void;
}

const FINGERPRINTS: Fingerprint[] = ["morgan", "maccs", "pharmacophore"];
const METRICS: Metric[] = ["Tanimoto", "Dice", "Cosine"];

function ToggleGroup<T extends string>({
  options,
  value,
  onChange,
}: {
  options: T[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex gap-1 flex-wrap">
      {options.map((opt) => (
        <button
          key={opt}
          type="button"
          onClick={() => onChange(opt)}
          className="cursor-pointer rounded border px-3 py-1 font-mono text-[12px] transition-colors"
          style={{
            background:
              value === opt ? "var(--color-accent-12)" : "transparent",
            borderColor:
              value === opt ? "var(--color-accent-25)" : "var(--color-outline)",
            color:
              value === opt ? "var(--color-accent)" : "var(--color-foreground-subtle)",
          }}
        >
          {opt}
        </button>
      ))}
    </div>
  );
}

export function AnalysisForm({
  fingerprint,
  metric,
  loading,
  analysisRunning,
  onFingerprintChange,
  onMetricChange,
  onSubmit,
}: Props) {
  const busy = loading || analysisRunning;
  return (
    <div className="flex flex-col gap-4 rounded-xl border border-outline bg-panel p-5">
      <span className="font-mono text-[11px] uppercase tracking-widest text-foreground-subtle">
        Análise molecular
      </span>

      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-3">
          <span className="font-mono text-[12px] text-foreground-subtle w-[110px] shrink-0">
            Fingerprint
          </span>
          <ToggleGroup
            options={FINGERPRINTS}
            value={fingerprint}
            onChange={onFingerprintChange}
          />
        </div>

        <div className="flex items-center gap-3">
          <span className="font-mono text-[12px] text-foreground-subtle w-[110px] shrink-0">
            Métrica
          </span>
          <ToggleGroup
            options={METRICS}
            value={metric}
            onChange={onMetricChange}
          />
        </div>
      </div>

      {analysisRunning && (
        <p className="font-mono text-[11px] text-foreground-subtle">
          Análise em andamento — atualizando automaticamente...
        </p>
      )}
      <button
        type="button"
        onClick={onSubmit}
        disabled={busy}
        className="cursor-pointer self-start flex items-center gap-2 rounded px-4 py-2 font-mono text-[13px] font-medium transition-colors disabled:opacity-50"
        style={{
          background: "var(--color-accent)",
          color: "var(--color-surface-primary)",
        }}
      >
        {busy && <Spinner style={{ width: 14, height: 14, borderWidth: 2, borderTopColor: "white" }} />}
        {busy ? "Executando..." : "Executar análise"}
      </button>
    </div>
  );
}
