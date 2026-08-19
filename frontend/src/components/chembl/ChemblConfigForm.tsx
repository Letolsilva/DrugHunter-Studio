// components/chembl/ChemblConfigForm.tsx
import { useRef, useState } from "react";
import type {
  ChemblItemConfig,
  ChemblTargetFilters,
  ChemblBioactFilters,
  ChemblMolFilters,
  ChemblSimFilters,
} from "../../domain/models/chembl.model";

function FieldRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 min-w-0">
      <span className="font-mono text-[11px] text-foreground-subtle w-32.5 shrink-0">{label}</span>
      <div className="flex-1 min-w-0">{children}</div>
    </div>
  );
}

function TextInput({ value, onChange, placeholder }: {
  value: string; onChange: (v: string) => void; placeholder?: string;
}) {
  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full rounded border border-outline bg-surface-secondary px-3 py-1 font-mono text-[12px] text-foreground placeholder:text-foreground-subtle focus:outline-none focus:border-outline-strong"
    />
  );
}

function NumberInput({ value, onChange, min, max }: {
  value: number; onChange: (v: number) => void; min?: number; max?: number;
}) {
  return (
    <input
      type="number"
      value={value}
      min={min}
      max={max}
      onChange={(e) => onChange(Number(e.target.value))}
      className="w-full rounded border border-outline bg-surface-secondary px-3 py-1 font-mono text-[12px] text-foreground focus:outline-none focus:border-outline-strong"
    />
  );
}

function ToggleInput({ value, onChange, onLabel = "Sim", offLabel = "Não" }: {
  value: 0 | 1; onChange: (v: 0 | 1) => void; onLabel?: string; offLabel?: string;
}) {
  return (
    <div className="flex gap-1">
      {([0, 1] as const).map((opt) => (
        <button
          key={opt}
          type="button"
          onClick={() => onChange(opt)}
          className="cursor-pointer rounded border px-3 py-1 font-mono text-[12px] transition-colors"
          style={{
            background: value === opt ? "var(--color-accent-12)" : "transparent",
            borderColor: value === opt ? "var(--color-accent-25)" : "var(--color-outline)",
            color: value === opt ? "var(--color-accent)" : "var(--color-foreground-subtle)",
          }}
        >
          {opt === 1 ? onLabel : offLabel}
        </button>
      ))}
    </div>
  );
}

const STANDARD_TYPES = [
  "IC50", "Ki", "Kd", "EC50", "AC50",
  "Inhibition", "Activity", "MIC", "K", "Kr", "Ratio", "pIC50",
] as const;

function MultiTypeSelect({ values, onChange }: {
  values: string[];
  onChange: (v: string[]) => void;
}) {
  const toggle = (t: string) => {
    onChange(values.includes(t) ? values.filter((x) => x !== t) : [...values, t]);
  };
  return (
    <div className="flex flex-wrap gap-1">
      {STANDARD_TYPES.map((t) => {
        const active = values.includes(t);
        return (
          <button
            key={t}
            type="button"
            onClick={() => toggle(t)}
            className="cursor-pointer rounded border px-2 py-0.5 font-mono text-[11px] transition-colors"
            style={{
              background: active ? "color-mix(in srgb, var(--color-accent) 15%, transparent)" : "transparent",
              borderColor: active ? "var(--color-accent-25)" : "var(--color-outline)",
              color: active ? "var(--color-accent)" : "var(--color-foreground-subtle)",
            }}
          >
            {t}
          </button>
        );
      })}
    </div>
  );
}

function TagInput({ values, onChange }: {
  values: string[];
  onChange: (v: string[]) => void;
}) {
  const [input, setInput] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const addTag = (raw: string) => {
    const tag = raw.trim();
    if (tag && !values.includes(tag)) {
      onChange([...values, tag]);
    }
    setInput("");
  };

  const removeTag = (idx: number) => {
    onChange(values.filter((_, i) => i !== idx));
  };

  return (
    <div
      className="flex flex-wrap gap-1.5 rounded border border-outline bg-surface-secondary px-2 py-1.5 min-h-9.5 cursor-text transition-colors focus-within:border-outline-strong"
      onClick={() => inputRef.current?.focus()}
    >
      {values.map((tag, i) => (
        <span
          key={i}
          className="flex items-center gap-1 rounded px-2 py-0.5 font-mono text-[12px] shrink-0"
          style={{
            background: "color-mix(in srgb, var(--color-accent) 12%, transparent)",
            color: "var(--color-accent)",
          }}
        >
          {tag}
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); removeTag(i); }}
            className="cursor-pointer border-none bg-transparent p-0 font-mono text-[11px] leading-none opacity-60 hover:opacity-100 transition-opacity"
          >
            ×
          </button>
        </span>
      ))}
      <input
        ref={inputRef}
        type="text"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === "," || e.key === "Tab") {
            e.preventDefault();
            addTag(input);
          } else if (e.key === "Backspace" && !input && values.length > 0) {
            onChange(values.slice(0, -1));
          }
        }}
        onBlur={() => { if (input.trim()) addTag(input); }}
        placeholder={values.length === 0 ? "Ex: Acetylcholinesterase, ERG11…" : "Adicionar alvo…"}
        className="flex-1 min-w-40 border-none bg-transparent font-mono text-[12px] text-foreground placeholder:text-foreground-subtle focus:outline-none py-0.5"
      />
    </div>
  );
}

interface Props {
  item: ChemblItemConfig;
  index: number;
  onChange: (id: string, patch: Partial<ChemblItemConfig>) => void;
  onRemove: (id: string) => void;
  canRemove: boolean;
}

export function ChemblConfigForm({ item, index, onChange, onRemove, canRemove }: Props) {
  const patchTarget = (p: Partial<ChemblTargetFilters>) =>
    onChange(item.id, { target_filters: { ...item.target_filters, ...p } });
  const patchBioact = (p: Partial<ChemblBioactFilters>) =>
    onChange(item.id, { bioact_filters: { ...item.bioact_filters, ...p } });
  const patchMol = (p: Partial<ChemblMolFilters>) =>
    onChange(item.id, { mol_filters: { ...item.mol_filters, ...p } });
  const patchSim = (p: Partial<ChemblSimFilters>) =>
    onChange(item.id, { sim_filters: { ...item.sim_filters, ...p } });

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-outline bg-panel p-5">
      {/* Cabeçalho */}
      <div className="flex items-center gap-3">
        <span
          className="flex h-6 w-6 items-center justify-center rounded-full font-mono text-[11px] font-bold shrink-0"
          style={{
            background: "color-mix(in srgb, var(--color-accent) 15%, transparent)",
            color: "var(--color-accent)",
          }}
        >
          {index + 1}
        </span>
        <span className="font-mono text-[12px] text-foreground-muted font-semibold flex-1">
          Grupo de configuração
          {item.target_names.length > 0 && (
            <span className="ml-2 text-foreground-subtle font-normal">
              — {item.target_names.length} {item.target_names.length === 1 ? "alvo" : "alvos"}
            </span>
          )}
        </span>
        {canRemove && (
          <button
            type="button"
            onClick={() => onRemove(item.id)}
            className="cursor-pointer rounded border-none bg-transparent p-1 font-mono text-[12px] text-foreground-subtle hover:text-red transition-colors"
            title="Remover grupo"
          >
            ✕
          </button>
        )}
      </div>

      {/* Alvos */}
      <div className="flex flex-col gap-1">
        <span className="font-mono text-[10px] uppercase tracking-wider text-foreground-subtle">
          Alvos — Enter ou vírgula para adicionar cada um
        </span>
        <TagInput
          values={item.target_names}
          onChange={(v) => onChange(item.id, { target_names: v })}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {/* Filtros de alvo */}
        <div className="flex flex-col gap-2">
          <span className="font-mono text-[10px] uppercase tracking-wider text-foreground-subtle">
            Alvos
          </span>
          <FieldRow label="Organismo">
            <TextInput
              value={item.target_filters.organism}
              onChange={(v) => patchTarget({ organism: v })}
              placeholder="Homo sapiens"
            />
          </FieldRow>
        </div>

        {/* Bioatividades */}
        <div className="flex flex-col gap-2">
          <span className="font-mono text-[10px] uppercase tracking-wider text-foreground-subtle">
            Bioatividades
          </span>
          <FieldRow label="Tipo">
            <MultiTypeSelect
              values={item.bioact_filters.standard_type__in}
              onChange={(v) => patchBioact({ standard_type__in: v })}
            />
          </FieldRow>
          <FieldRow label="Valor máx. (nM)">
            <NumberInput
              value={item.bioact_filters.max_value_ref}
              onChange={(v) => patchBioact({ max_value_ref: v })}
              min={1}
            />
          </FieldRow>
        </div>

        {/* Moléculas */}
        <div className="flex flex-col gap-2">
          <span className="font-mono text-[10px] uppercase tracking-wider text-foreground-subtle">
            Moléculas
          </span>
          <FieldRow label="Natural">
            <ToggleInput
              value={item.mol_filters.natural_product}
              onChange={(v) => patchMol({ natural_product: v })}
            />
          </FieldRow>
          <FieldRow label="NP-likeness">
            <ToggleInput
              value={item.mol_filters.np_likeness}
              onChange={(v) => patchMol({ np_likeness: v })}
            />
          </FieldRow>
        </div>

        {/* Similares */}
        <div className="flex flex-col gap-2">
          <span className="font-mono text-[10px] uppercase tracking-wider text-foreground-subtle">
            Similares
          </span>
          <FieldRow label="Similaridade (%)">
            <NumberInput
              value={item.sim_filters.similarity}
              onChange={(v) => patchSim({ similarity: v })}
              min={1}
              max={100}
            />
          </FieldRow>
          <FieldRow label="Peso mol. máx.">
            <NumberInput
              value={item.sim_filters.molecular_weight__lte}
              onChange={(v) => patchSim({ molecular_weight__lte: v })}
              min={50}
            />
          </FieldRow>
        </div>
      </div>
    </div>
  );
}
