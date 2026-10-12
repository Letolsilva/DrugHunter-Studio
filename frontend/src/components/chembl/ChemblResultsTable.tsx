// components/chembl/ChemblResultsTable.tsx
// Tabela de moléculas do resultado ChEMBL.

import type { ChemblMoleculeModel } from "../../domain/models/chembl.model";

interface Props {
  molecules: ChemblMoleculeModel[];
  onSelectMolecule: (mol: ChemblMoleculeModel) => void;
  /** IDs das moléculas que pertencem ao MCC da rede SIMS */
  mccSimsSet?: Set<string>;
  /** IDs das moléculas que pertencem ao MCC da rede MOLS */
  mccMolsSet?: Set<string>;
}

const COLS = [
  { key: "molecule_chembl_id", label: "ChEMBL ID", mono: true },
  { key: "molecule_pref_name", label: "Nome" },
  { key: "type", label: "Tipo" },
  { key: "value", label: "Valor" },
  { key: "units", label: "Unidade", mono: true },
  { key: "pchembl_value", label: "pChEMBL" },
] as const;

const MCC_STYLES = {
  BOTH: {
    bg: "rgba(234,179,8,0.15)",
    color: "#b45309",
    label: "● SIMS+MOLS",
    rowBg: "rgba(234,179,8,0.07)",
    title: "Pertence ao MCC de similaridade e ao MCC de propriedade",
  },
  MOLS: {
    bg: "rgba(34,197,94,0.15)",
    color: "var(--color-green, #16a34a)",
    label: "● MOLS",
    rowBg: "rgba(34,197,94,0.07)",
    title: "Pertence ao Máx. Componente Conectado da rede MOLS (propriedade)",
  },
  SIMS: {
    bg: "rgba(168,85,247,0.15)",
    color: "#9333ea",
    label: "● SIMS",
    rowBg: "rgba(168,85,247,0.07)",
    title: "Pertence ao Máx. Componente Conectado da rede SIMS (similaridade)",
  },
} as const;

function cellValue(mol: ChemblMoleculeModel, key: (typeof COLS)[number]["key"]): string {
  const v = mol[key];
  if (v == null) return "—";
  return String(v);
}

export function ChemblResultsTable({ molecules, onSelectMolecule, mccSimsSet, mccMolsSet }: Props) {
  const hasAny = (mccSimsSet && mccSimsSet.size > 0) || (mccMolsSet && mccMolsSet.size > 0);

  if (molecules.length === 0) {
    return (
      <div className="flex justify-center py-10">
        <span className="font-mono text-[13px] text-foreground-subtle italic">
          Nenhuma molécula encontrada.
        </span>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-outline">
      <table className="w-full min-w-[600px] border-collapse">
        <thead>
          <tr style={{ background: "var(--color-surface-secondary)" }}>
            {COLS.map((c) => (
              <th
                key={c.key}
                className="px-4 py-2 text-left font-mono text-[10px] uppercase tracking-wider text-foreground-subtle border-b border-outline"
              >
                {c.label}
              </th>
            ))}
            {hasAny && (
              <th className="px-4 py-2 text-left font-mono text-[10px] uppercase tracking-wider text-foreground-subtle border-b border-outline">
                MCC
              </th>
            )}
            <th className="px-4 py-2 text-left font-mono text-[10px] uppercase tracking-wider text-foreground-subtle border-b border-outline">
              2D
            </th>
          </tr>
        </thead>
        <tbody>
          {molecules.map((mol, i) => {
            const inSims = mccSimsSet?.has(mol.molecule_chembl_id) ?? false;
            const inMols = mccMolsSet?.has(mol.molecule_chembl_id) ?? false;
            const mccType = inSims && inMols ? "BOTH" : inMols ? "MOLS" : inSims ? "SIMS" : null;
            const style = mccType ? MCC_STYLES[mccType] : null;
            return (
              <tr
                key={mol.molecule_chembl_id + i}
                className="border-b last:border-b-0 hover:bg-surface-secondary transition-colors"
                style={{
                  borderColor: "var(--color-outline)",
                  background: style?.rowBg ?? undefined,
                }}
              >
                {COLS.map((c) => (
                  <td
                    key={c.key}
                    className={`px-4 py-2 text-[12px] text-foreground ${"mono" in c && c.mono ? "font-mono" : ""}`}
                  >
                    {cellValue(mol, c.key)}
                  </td>
                ))}
                {hasAny && (
                  <td className="px-4 py-2">
                    {style ? (
                      <span
                        className="inline-flex items-center rounded px-1.5 py-0.5 font-mono text-[10px] font-bold tracking-wide whitespace-nowrap"
                        style={{ background: style.bg, color: style.color }}
                        title={style.title}
                      >
                        {style.label}
                      </span>
                    ) : (
                      <span className="font-mono text-[11px] text-foreground-subtle">—</span>
                    )}
                  </td>
                )}
                <td className="px-4 py-2">
                  {mol.canonical_smiles ? (
                    <button
                      type="button"
                      onClick={() => onSelectMolecule(mol)}
                      className="cursor-pointer rounded border border-outline bg-transparent px-2 py-0.5 font-mono text-[11px] text-foreground-subtle hover:text-foreground hover:border-outline-strong transition-colors"
                    >
                      Ver
                    </button>
                  ) : (
                    <span className="font-mono text-[11px] text-foreground-subtle">—</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
