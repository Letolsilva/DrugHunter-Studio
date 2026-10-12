// components/admet/AdmetResultsTable.tsx
import type { AdmetMoleculeModel } from "../../domain/models/admet.model";

interface FilterChipProps {
  label: string;
  active: boolean;
  onClick: () => void;
  color?: string;
}

function FilterChip({ label, active, onClick, color }: FilterChipProps) {
  return (
    <button
      onClick={onClick}
      className="cursor-pointer font-mono text-[11px] rounded-lg px-2.5 py-1 border transition-all"
      style={
        active
          ? {
              background: color
                ? `color-mix(in srgb, ${color} 20%, transparent)`
                : "var(--color-accent-25)",
              borderColor: color ?? "var(--color-accent)",
              color: color ?? "var(--color-accent)",
            }
          : {
              background: "transparent",
              borderColor: "var(--color-outline)",
              color: "var(--color-foreground-subtle)",
            }
      }
    >
      {label}
    </button>
  );
}

function ClassBadge({ value }: { value: string }) {
  const positive = value.endsWith("+");
  return (
    <span
      className="font-mono text-[10px] rounded px-1.5 py-0.5"
      style={{
        background: positive
          ? "color-mix(in srgb, var(--color-green) 15%, transparent)"
          : "color-mix(in srgb, var(--color-foreground-subtle) 15%, transparent)",
        color: positive ? "var(--color-green)" : "var(--color-foreground-subtle)",
      }}
    >
      {value}
    </span>
  );
}

interface Props {
  molecules: AdmetMoleculeModel[];
  total: number;
  page: number;
  pages: number;
  filterBbb: string | null;
  filterHia: string | null;
  onFilterBbb: (v: string | null) => void;
  onFilterHia: (v: string | null) => void;
  onPageChange: (p: number) => void;
  onRowClick: (mol: AdmetMoleculeModel) => void;
  loading: boolean;
}

export function AdmetResultsTable({
  molecules,
  total,
  page,
  pages,
  filterBbb,
  filterHia,
  onFilterBbb,
  onFilterHia,
  onPageChange,
  onRowClick,
  loading,
}: Props) {
  return (
    <div className="flex flex-col gap-3">
      {/* Filtros */}
      <div className="flex flex-wrap gap-2 items-center">
        <span className="font-mono text-[11px] text-foreground-subtle">Filtrar:</span>
        <FilterChip
          label="BBB+"
          active={filterBbb === "BBB+"}
          onClick={() => onFilterBbb(filterBbb === "BBB+" ? null : "BBB+")}
          color="#e05a5a"
        />
        <FilterChip
          label="BBB-"
          active={filterBbb === "BBB-"}
          onClick={() => onFilterBbb(filterBbb === "BBB-" ? null : "BBB-")}
          color="#5a7be0"
        />
        <FilterChip
          label="HIA+"
          active={filterHia === "HIA+"}
          onClick={() => onFilterHia(filterHia === "HIA+" ? null : "HIA+")}
        />
        {(filterBbb || filterHia) && (
          <button
            onClick={() => { onFilterBbb(null); onFilterHia(null); }}
            className="cursor-pointer font-mono text-[11px] text-foreground-subtle underline"
          >
            limpar
          </button>
        )}
        <span className="ml-auto font-mono text-[11px] text-foreground-subtle">
          {total} mol.
        </span>
      </div>

      {/* Tabela */}
      <div className="rounded-xl border border-outline overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-outline bg-surface-secondary">
                {["ChEMBL ID", "TPSA", "WLOGP", "MW", "BBB", "HIA", "PGP"].map((h) => (
                  <th
                    key={h}
                    className="px-3 py-2 font-mono text-[10px] uppercase tracking-wider text-foreground-subtle whitespace-nowrap"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-3 py-6 text-center font-mono text-[12px] text-foreground-subtle">
                    Carregando...
                  </td>
                </tr>
              ) : molecules.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-3 py-6 text-center font-mono text-[12px] text-foreground-subtle">
                    Nenhuma molécula encontrada com esses filtros.
                  </td>
                </tr>
              ) : (
                molecules.map((mol) => (
                  <tr
                    key={mol.molecule_chembl_id}
                    className="border-b border-outline last:border-0 hover:bg-surface-secondary transition-colors cursor-pointer"
                    onClick={() => onRowClick(mol)}
                  >
                    <td className="px-3 py-2 font-mono text-[11px] text-foreground whitespace-nowrap">
                      {mol.molecule_chembl_id}
                    </td>
                    <td className="px-3 py-2 font-mono text-[11px] text-foreground">{mol.tpsa}</td>
                    <td className="px-3 py-2 font-mono text-[11px] text-foreground">{mol.wlogp}</td>
                    <td className="px-3 py-2 font-mono text-[11px] text-foreground">{mol.mw}</td>
                    <td className="px-3 py-2"><ClassBadge value={mol.bbb} /></td>
                    <td className="px-3 py-2"><ClassBadge value={mol.hia} /></td>
                    <td className="px-3 py-2"><ClassBadge value={mol.pgp} /></td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Paginação */}
      {pages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            disabled={page <= 1}
            onClick={() => onPageChange(page - 1)}
            className="font-mono text-[11px] px-2.5 py-1 rounded border border-outline disabled:opacity-30 hover:bg-surface-secondary transition-colors"
          >
            ←
          </button>
          <span className="font-mono text-[11px] text-foreground-subtle">
            {page} / {pages}
          </span>
          <button
            disabled={page >= pages}
            onClick={() => onPageChange(page + 1)}
            className="font-mono text-[11px] px-2.5 py-1 rounded border border-outline disabled:opacity-30 hover:bg-surface-secondary transition-colors"
          >
            →
          </button>
        </div>
      )}
    </div>
  );
}
