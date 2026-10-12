// components/clustering/ClusteringSetupForm.tsx
import { Spinner } from "../ui/Spinner";

interface Props {
  fingerprintType: string;
  onFingerprintType: (v: string) => void;
  baseOutputPath: string;
  onBaseOutputPath: (v: string) => void;
  onSubmit: () => void;
  submitting: boolean;
  submitError: string | null;
}

const FP_OPTIONS = [
  { value: "morgan", label: "Morgan (recomendado)" },
  { value: "maccs", label: "MACCS Keys" },
  { value: "pharmacophore", label: "Pharmacophore" },
];

export function ClusteringSetupForm({
  fingerprintType,
  onFingerprintType,
  baseOutputPath,
  onBaseOutputPath,
  onSubmit,
  submitting,
  submitError,
}: Props) {
  const labelClass = "block font-mono text-[11px] text-foreground-subtle uppercase tracking-wider mb-1";
  const inputClass =
    "w-full rounded-lg border border-outline bg-surface-secondary font-mono text-[12px] text-foreground px-3 py-2 focus:outline-none focus:ring-1 focus:ring-accent";

  return (
    <div className="flex justify-center">
      <div className="rounded-xl border border-outline bg-panel p-6 w-full max-w-md">
        <h2 className="font-mono text-[14px] font-semibold text-foreground mb-1">
          Configurar Clustering
        </h2>
        <p className="font-mono text-[11px] text-foreground-subtle mb-5 opacity-70">
          O clustering agrupa as moléculas por similaridade estrutural para selecionar representantes de cada grupo.
        </p>

        <div className="flex flex-col gap-4">
          {/* Fingerprint */}
          <div>
            <label className={labelClass}>Tipo de Fingerprint</label>
            <select
              value={fingerprintType}
              onChange={(e) => onFingerprintType(e.target.value)}
              className={inputClass}
            >
              {FP_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
            <p className="font-mono text-[10px] text-foreground-subtle mt-1 opacity-70">
              Morgan captura a topologia da molécula (raio 2, 2048 bits).
            </p>
          </div>

          {/* Caminho de saída */}
          <div>
            <label className={labelClass}>Caminho de saída</label>
            <input
              type="text"
              value={baseOutputPath}
              onChange={(e) => onBaseOutputPath(e.target.value)}
              className={inputClass}
              placeholder="/resultados/clustering"
            />
            <p className="font-mono text-[10px] text-foreground-subtle mt-1 opacity-70">
              Caminho relativo ao DrugHunter onde os resultados serão gravados.
            </p>
          </div>

          {submitError && (
            <div className="rounded-lg border border-red-400/30 bg-red-500/10 px-3 py-2">
              <p className="font-mono text-[11px] text-red-400">{submitError}</p>
            </div>
          )}

          <button
            onClick={onSubmit}
            disabled={submitting}
            className="flex items-center justify-center gap-2 rounded-xl border px-5 py-2.5 font-mono text-[12px] font-semibold transition-all disabled:opacity-60"
            style={{
              borderColor: "var(--color-accent-25)",
              color: "var(--color-accent)",
              background: "var(--color-accent-12)",
            }}
          >
            {submitting ? (
              <>
                <Spinner style={{ width: 12, height: 12, borderWidth: 2 }} />
                Iniciando...
              </>
            ) : (
              "Iniciar Clustering →"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
