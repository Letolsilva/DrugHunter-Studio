// components/dashboard/ResultsTable.tsx
import { Badge } from "../ui/Badge";
import type { PdbResultModel } from "../../domain/models/search.model";

const BADGE_VARIANT: Record<string, string> = {
  Excelente: "excelente",
  Boa: "boa",
  Razoável: "razoavel",
  Verificar: "verificar",
};

const HEADERS = [
  "PDB ID",
  "Título",
  "Organismo",
  "Proteína",
  "Resolução",
  "Método",
  "Qualidade",
  "Ligante",
  "Cadeias",
  "Data",
  "Link",
];

interface ResultsTableProps {
  rows: PdbResultModel[];
}

export function ResultsTable({ rows }: ResultsTableProps) {
  return (
    <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl overflow-auto">
      <table className="w-full border-collapse text-[13px]">
        <thead>
          <tr className="border-b border-[var(--border)]">
            {HEADERS.map((h) => (
              <th
                key={h}
                className="px-3.5 py-3 text-left text-[11px] font-bold text-[var(--text-3)] uppercase tracking-[0.5px] whitespace-nowrap"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((d) => (
            <tr
              key={d.pdb_id}
              className="border-b border-[rgba(30,52,80,0.5)] last:border-0 hover:bg-[var(--card-2)]"
            >
              <td className="px-3.5 py-2.5 align-middle">
                <a
                  href={d.link_pdb}
                  target="_blank"
                  rel="noreferrer"
                  className="font-mono font-bold text-[var(--accent)] text-[13px] hover:text-[var(--text)]"
                >
                  {d.pdb_id}
                </a>
              </td>
              <td className="px-3.5 py-2.5 align-middle max-w-[220px]">
                <span className="block overflow-hidden text-ellipsis whitespace-nowrap text-[var(--text-2)]">
                  {d.titulo ?? "—"}
                </span>
              </td>
              <td className="px-3.5 py-2.5 align-middle max-w-[180px]">
                <span className="block overflow-hidden text-ellipsis whitespace-nowrap text-[12px] text-[var(--text-2)]">
                  {d.organismo ?? "—"}
                </span>
              </td>
              <td className="px-3.5 py-2.5 align-middle">
                <span className="text-[11px] text-[var(--text-3)] font-mono">
                  {d.proteina_buscada}
                </span>
              </td>
              <td className="px-3.5 py-2.5 align-middle font-mono text-[13px]">
                {d.resolucao ? `${d.resolucao} Å` : "—"}
              </td>
              <td className="px-3.5 py-2.5 align-middle text-[12px] text-[var(--text-2)]">
                {d.metodo ?? "—"}
              </td>
              <td className="px-3.5 py-2.5 align-middle">
                <Badge variant={BADGE_VARIANT[d.qualidade]}>
                  {d.qualidade ?? "—"}
                </Badge>
              </td>
              <td className="px-3.5 py-2.5 align-middle">
                <Badge variant={d.tem_ligante ? "ligante" : "sem-ligante"}>
                  {d.tem_ligante ? "Sim" : "Não"}
                </Badge>
              </td>
              <td className="px-3.5 py-2.5 align-middle font-mono text-[13px] text-center">
                {d.num_cadeias ?? "—"}
              </td>
              <td className="px-3.5 py-2.5 align-middle font-mono text-[12px] text-[var(--text-3)]">
                {d.depositado_em ?? "—"}
              </td>
              <td className="px-3.5 py-2.5 align-middle text-center">
                {d.link_pdb ? (
                  <a
                    href={d.link_pdb}
                    target="_blank"
                    rel="noreferrer"
                    title="Abrir no RCSB PDB"
                    className="inline-flex items-center justify-center w-7 h-7 rounded bg-[var(--accent-dim)] text-[var(--accent)] text-[14px] font-bold no-underline transition-all hover:bg-[var(--accent)] hover:text-[var(--bg)]"
                  >
                    ↗
                  </a>
                ) : (
                  "—"
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
