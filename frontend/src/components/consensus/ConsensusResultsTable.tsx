// components/consensus/ConsensusResultsTable.tsx
import type { ConsensusResultRowModel } from "../../domain/models/consensus.model";

interface Props {
  rows: ConsensusResultRowModel[];
}

export function ConsensusResultsTable({ rows }: Props) {
  if (rows.length === 0) {
    return (
      <p className="font-mono text-[12px] text-foreground-subtle text-center py-8">
        Nenhum resultado disponível.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse font-mono text-[12px]">
        <thead>
          <tr className="border-b border-outline">
            <th className="text-left px-3 py-2 text-foreground-subtle font-semibold">#</th>
            <th className="text-left px-3 py-2 text-foreground-subtle font-semibold">Molécula</th>
            <th className="text-right px-3 py-2 text-foreground-subtle font-semibold">Vina (kcal/mol)</th>
            <th className="text-right px-3 py-2 text-foreground-subtle font-semibold">Dock6</th>
            <th className="text-right px-3 py-2 text-foreground-subtle font-semibold">Z-Score ↓</th>
            <th className="text-right px-3 py-2 text-foreground-subtle font-semibold">Min-Max</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => {
            const isTop3 = i < 3;
            return (
              <tr
                key={row.molecule}
                className="border-b border-outline/50 hover:bg-surface-secondary transition-colors"
                style={isTop3 ? { background: "rgba(34,197,94,0.06)" } : {}}
              >
                <td className="px-3 py-2 text-foreground-subtle">
                  {isTop3 ? (
                    <span className="text-[#22c55e] font-bold">{i + 1}</span>
                  ) : (
                    i + 1
                  )}
                </td>
                <td className="px-3 py-2 text-foreground">{row.molecule}</td>
                <td className="px-3 py-2 text-right text-foreground">{row.vina.toFixed(2)}</td>
                <td className="px-3 py-2 text-right text-foreground">{row.dock6.toFixed(2)}</td>
                <td className="px-3 py-2 text-right font-semibold" style={{ color: isTop3 ? "#22c55e" : "var(--color-foreground)" }}>
                  {row["z-score"].toFixed(2)}
                </td>
                <td className="px-3 py-2 text-right text-foreground">{row["min-max"].toFixed(2)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
