// components/dashboard/StatsRow.tsx
import { useMemo } from "react";
import type { PdbResultModel } from "../../domain/models/search.model";

interface StatsRowProps {
  dados: PdbResultModel[];
  organismos: string[];
}

export function StatsRow({ dados, organismos }: StatsRowProps) {
  const stats = useMemo(() => {
    const resolucoes = dados
      .filter((d) => d.resolucao)
      .map((d) => d.resolucao as number);
    return [
      { label: "Total", value: dados.length },
      {
        label: "Com ligante",
        value: dados.filter((d) => d.tem_ligante).length,
      },
      {
        label: "Excelente",
        value: dados.filter((d) => d.qualidade === "Excelente").length,
      },
      { label: "Organismos", value: organismos.length },
      {
        label: "Resolução mín",
        value: resolucoes.length
          ? Math.min(...resolucoes).toFixed(2) + " Å"
          : "—",
      },
    ];
  }, [dados, organismos]);

  return (
    <div className="flex gap-3 flex-wrap">
      {stats.map((s) => (
        <div
          key={s.label}
          className="flex-1 min-w-[100px] bg-[var(--card)] border border-[var(--border)] rounded-xl px-4 py-3.5 flex flex-col gap-1"
        >
          <span className="text-[24px] font-extrabold text-[var(--accent)] font-mono leading-none">
            {s.value}
          </span>
          <span className="text-[11px] text-[var(--text-3)] uppercase tracking-[0.5px]">
            {s.label}
          </span>
        </div>
      ))}
    </div>
  );
}
