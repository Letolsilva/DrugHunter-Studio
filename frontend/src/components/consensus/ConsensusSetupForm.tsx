// components/consensus/ConsensusSetupForm.tsx
import { useState } from "react";
import type { AdmetResultModel } from "../../domain/models/admet.model";
import type {
  ConsensusRedockingJobModel,
  PdbCodeRow,
} from "../../domain/models/consensus.model";

interface Props {
  admetResult: AdmetResultModel;
  redockingJobs: ConsensusRedockingJobModel[];
  // Categoria selecionada
  selectedCategories: string[];
  onToggleCategory: (cat: string) => void;
  // Formulário PDB
  pdbId: string;
  ligandResname: string;
  ligandResnum: string;
  chain: string;
  onPdbId: (v: string) => void;
  onLigandResname: (v: string) => void;
  onLigandResnum: (v: string) => void;
  onChain: (v: string) => void;
  // Caminhos e opções
  baseInputPath: string;
  baseDockingOutputPath: string;
  chargeType: string;
  prepareComplex: boolean;
  maxMols: number | null;
  onBaseInputPath: (v: string) => void;
  onBaseDockingOutputPath: (v: string) => void;
  onChargeType: (v: string) => void;
  onPrepareComplex: (v: boolean) => void;
  onMaxMols: (v: number | null) => void;
  // Submit
  onSubmit: () => void;
  submitting: boolean;
  submitError: string | null;
}

function parseCsvContent(csv: string): PdbCodeRow[] {
  const lines = csv.trim().split("\n").filter(Boolean);
  if (lines.length < 2) return [];
  const header = lines[0].toLowerCase().split(",").map((h) => h.trim());
  return lines.slice(1).map((line) => {
    const cols = line.split(",").map((c) => c.trim());
    const get = (name: string) => cols[header.indexOf(name)] ?? "";
    return {
      pdb_code: get("pdb_code"),
      ligand: get("ligand"),
      resnum: parseInt(get("resnum"), 10) || 0,
      chain: get("chain"),
      resolution: get("resolution"),
    };
  }).filter((r) => r.pdb_code);
}

const CATEGORIES = [
  { key: "bbb_plus",  label: "BBB+"  },
  { key: "bbb_minus", label: "BBB−"  },
  { key: "hia_plus",  label: "HIA+"  },
  { key: "toxic",     label: "Tóxicas" },
  { key: "all",       label: "Todas (não-tóxicas)" },
];

function getCatCount(result: AdmetResultModel, cat: string): number | null {
  if (cat === "bbb_plus")  return result.bbb_plus;
  if (cat === "bbb_minus") return result.bbb_minus;
  if (cat === "hia_plus")  return result.hia_plus;
  if (cat === "toxic")     return result.excluded_toxic;
  if (cat === "all")       return (result.total_molecules ?? 0) - (result.excluded_toxic ?? 0);
  return null;
}

export function ConsensusSetupForm(props: Props) {
  const {
    admetResult,
    redockingJobs,
    selectedCategories,
    onToggleCategory,
    pdbId, ligandResname, ligandResnum, chain,
    onPdbId, onLigandResname, onLigandResnum, onChain,
    baseInputPath, baseDockingOutputPath, chargeType, prepareComplex, maxMols,
    onBaseInputPath, onBaseDockingOutputPath, onChargeType, onPrepareComplex, onMaxMols,
    onSubmit, submitting, submitError,
  } = props;

  const [selectedJobId, setSelectedJobId] = useState<number | "">("");
  const [pdbRows, setPdbRows] = useState<PdbCodeRow[]>([]);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const allSelected = selectedCategories.includes("all");
  const filteredRedockingJobs = admetResult.target
    ? redockingJobs.filter((j) => j.target === admetResult.target)
    : redockingJobs;

  function onSelectJob(id: number | "") {
    setSelectedJobId(id);
    if (id === "") { setPdbRows([]); return; }
    const job = redockingJobs.find((j) => j.id === id);
    if (!job) return;
    const rows = parseCsvContent(job.csv_content);
    setPdbRows(rows);
    onBaseInputPath(job.base_input_path);
    onChargeType(job.charge_type);
  }

  function onSelectPdbRow(row: PdbCodeRow) {
    onPdbId(row.pdb_code);
    onLigandResname(row.ligand);
    onLigandResnum(String(row.resnum));
    onChain(row.chain);
  }

  const canSubmit =
    selectedCategories.length > 0 &&
    pdbId.trim() &&
    ligandResname.trim() &&
    ligandResnum.trim() &&
    chain.trim() &&
    baseInputPath.trim() &&
    baseDockingOutputPath.trim() &&
    !submitting;

  const inputClass = "w-full rounded-lg border px-3 py-2 font-mono text-[12px] bg-surface-primary text-foreground placeholder:text-foreground-subtle focus:outline-none focus:ring-1 focus:ring-[var(--color-accent)]";
  const labelClass = "font-mono text-[11px] text-foreground-subtle mb-1 block";

  return (
    <div className="flex flex-col gap-6">
      {/* ── Seção 1: Moléculas ───────────────────────────────────────────────── */}
      <div className="rounded-xl border border-outline bg-panel p-4">
        <h2 className="font-mono text-[13px] font-semibold text-foreground mb-3">
          1. Selecionar moléculas
        </h2>
        <p className="font-mono text-[11px] text-foreground-subtle mb-3">
          Alvo: <span className="text-foreground">{admetResult.target ?? `#${admetResult.chembl_job_item_id}`}</span>
        </p>
        <div className="flex flex-col gap-2">
          {CATEGORIES.map((cat) => {
            const count = getCatCount(admetResult, cat.key);
            const checked = selectedCategories.includes(cat.key);
            const disabled = allSelected && cat.key !== "all";
            return (
              <label
                key={cat.key}
                className={`flex items-center gap-3 rounded-lg px-3 py-2 cursor-pointer transition-colors hover:bg-surface-secondary ${disabled ? "opacity-40 cursor-not-allowed" : ""}`}
                style={{ border: "1px solid var(--color-outline)" }}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  disabled={disabled}
                  onChange={() => onToggleCategory(cat.key)}
                  className="accent-[var(--color-accent)] w-3.5 h-3.5"
                />
                <span className="font-mono text-[12px] text-foreground flex-1">{cat.label}</span>
                {count !== null && (
                  <span className="font-mono text-[11px] text-foreground-subtle">{count.toLocaleString("pt-BR")} mol.</span>
                )}
              </label>
            );
          })}
        </div>
        {allSelected && (
          <p className="font-mono text-[11px] text-foreground-subtle mt-2 opacity-70">
            ⚠ Ao selecionar "Todas", as outras opções são ignoradas.
          </p>
        )}

        {/* Limite de moléculas — visível aqui por ser uma decisão de seleção, não técnica */}
        <div className="mt-4 pt-4 border-t border-outline">
          <label className={labelClass}>Top N melhores moléculas</label>
          <input
            className={inputClass}
            type="number"
            min={1}
            placeholder="deixe vazio para usar todas"
            value={maxMols ?? ""}
            onChange={(e) => onMaxMols(e.target.value === "" ? null : Math.max(1, parseInt(e.target.value, 10) || 1))}
          />
          <p className="font-mono text-[10px] text-foreground-subtle mt-1">
            {maxMols !== null
              ? `As ${maxMols} moléculas com menor peso molecular (MW) serão selecionadas.`
              : "Sem limite — todas as moléculas filtradas pelo ADMET serão usadas."}
          </p>
        </div>
      </div>

      {/* ── Seção 2: Complexo PDB ────────────────────────────────────────────── */}
      <div className="rounded-xl border border-outline bg-panel p-4">
        <h2 className="font-mono text-[13px] font-semibold text-foreground mb-3">
          2. Complexo PDB
        </h2>

        {/* Pré-preencher via redocking */}
        <div className="mb-4 flex flex-col gap-2">
          <label className={labelClass}>Pré-preencher a partir de um Redocking</label>
          {filteredRedockingJobs.length === 0 ? (
            <p className="font-mono text-[11px] text-foreground-subtle opacity-60">
              Nenhum job de redocking encontrado para este alvo.
            </p>
          ) : (
            <>
              <select
                className={inputClass}
                value={selectedJobId}
                onChange={(e) => onSelectJob(e.target.value === "" ? "" : Number(e.target.value))}
              >
                <option value="">— selecionar job de redocking —</option>
                {filteredRedockingJobs.map((j) => (
                  <option key={j.id} value={j.id}>
                    {j.target} ({new Date(j.iniciado_em).toLocaleDateString("pt-BR")})
                  </option>
                ))}
              </select>
              {pdbRows.length > 0 && (
                <select
                  className={inputClass}
                  defaultValue=""
                  onChange={(e) => {
                    const idx = Number(e.target.value);
                    if (!isNaN(idx)) onSelectPdbRow(pdbRows[idx]);
                  }}
                >
                  <option value="">— selecionar código PDB —</option>
                  {pdbRows.map((r, i) => (
                    <option key={i} value={i}>
                      {r.pdb_code} | {r.ligand} | res {r.resnum} | cadeia {r.chain}
                    </option>
                  ))}
                </select>
              )}
            </>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2 sm:col-span-1">
            <label className={labelClass}>PDB Code *</label>
            <input className={inputClass} placeholder="ex: 1P0I" maxLength={4} value={pdbId} onChange={(e) => onPdbId(e.target.value.toUpperCase())} />
          </div>
          <div className="col-span-2 sm:col-span-1">
            <label className={labelClass}>Ligante (resname) *</label>
            <input className={inputClass} placeholder="ex: BUA" value={ligandResname} onChange={(e) => onLigandResname(e.target.value.toUpperCase())} />
          </div>
          <div>
            <label className={labelClass}>Número do resíduo *</label>
            <input className={inputClass} placeholder="ex: 606" type="number" value={ligandResnum} onChange={(e) => onLigandResnum(e.target.value)} />
          </div>
          <div>
            <label className={labelClass}>Cadeia *</label>
            <input className={inputClass} placeholder="ex: A" maxLength={2} value={chain} onChange={(e) => onChain(e.target.value.toUpperCase())} />
          </div>
        </div>
      </div>

      {/* ── Seção 3: Caminhos e opções ───────────────────────────────────────── */}
      <div className="rounded-xl border border-outline bg-panel p-4">
        <button
          type="button"
          onClick={() => setShowAdvanced((v) => !v)}
          className="flex items-center gap-2 font-mono text-[13px] font-semibold text-foreground w-full text-left mb-1"
        >
          <span>{showAdvanced ? "▾" : "▸"}</span>
          3. Caminhos e opções
        </button>
        {!showAdvanced && (baseInputPath || baseDockingOutputPath) && (
          <p className="font-mono text-[11px] text-foreground-subtle mt-1">
            {baseInputPath || "—"} · {baseDockingOutputPath || "—"}
          </p>
        )}

        {showAdvanced && (
          <div className="flex flex-col gap-3 mt-3">
            <div>
              <label className={labelClass}>Base input path * (pasta com estruturas PDB)</label>
              <input className={inputClass} placeholder="/datasets/PDB" value={baseInputPath} onChange={(e) => onBaseInputPath(e.target.value)} />
            </div>
            <div>
              <label className={labelClass}>Base docking output path * (onde o DrugHunter grava resultados)</label>
              <input className={inputClass} placeholder="/resultados/docking" value={baseDockingOutputPath} onChange={(e) => onBaseDockingOutputPath(e.target.value)} />
            </div>
            <div className="flex items-center gap-6">
              <div>
                <label className={labelClass}>Tipo de carga</label>
                <div className="flex gap-4 mt-1">
                  {["am1", "gas"].map((ct) => (
                    <label key={ct} className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="radio"
                        name="charge_type"
                        value={ct}
                        checked={chargeType === ct}
                        onChange={() => onChargeType(ct)}
                        className="accent-[var(--color-accent)]"
                      />
                      <span className="font-mono text-[12px] text-foreground">{ct}</span>
                    </label>
                  ))}
                </div>
              </div>
              <label className="flex items-center gap-2 cursor-pointer mt-3">
                <input
                  type="checkbox"
                  checked={prepareComplex}
                  onChange={(e) => onPrepareComplex(e.target.checked)}
                  className="accent-[var(--color-accent)] w-3.5 h-3.5"
                />
                <span className="font-mono text-[12px] text-foreground">Preparar complexo</span>
              </label>
            </div>
          </div>
        )}
      </div>

      {/* ── Erro + Submit ────────────────────────────────────────────────────── */}
      {submitError && (
        <p className="font-mono text-[12px] text-red-400 px-1">{submitError}</p>
      )}
      <button
        onClick={onSubmit}
        disabled={!canSubmit}
        className="btn-primary w-full py-3 font-mono text-[13px] font-semibold disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {submitting ? "Iniciando..." : "Iniciar Docking de Consenso →"}
      </button>
    </div>
  );
}
