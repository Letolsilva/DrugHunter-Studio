// components/dashboard/ResultsTable.tsx
import { Badge } from "../ui/Badge";
import { ExternalLinkIcon } from "../icons";
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
    <div className="bg-panel border border-outline rounded-xl overflow-auto">
      <table className="w-full border-collapse text-[13px]">
        <thead>
          <tr className="border-b border-outline">
            {HEADERS.map((h) => (
              <th
                key={h}
                className="px-3.5 py-3 text-left text-[11px] font-bold text-foreground-subtle uppercase tracking-[0.5px] whitespace-nowrap"
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
              className="border-b border-[rgba(30,52,80,0.5)] last:border-0 hover:bg-panel-hover"
            >
              <td className="px-3.5 py-2.5 align-middle">
                <a
                  href={d.link_pdb}
                  target="_blank"
                  rel="noreferrer"
                  className="font-mono font-bold text-accent text-[13px] hover:text-foreground"
                >
                  {d.pdb_id}
                </a>
              </td>
              <td className="px-3.5 py-2.5 align-middle max-w-[220px]">
                <span className="block overflow-hidden text-ellipsis whitespace-nowrap text-foreground-muted">
                  {d.titulo ?? "—"}
                </span>
              </td>
              <td className="px-3.5 py-2.5 align-middle max-w-[180px]">
                <span className="block overflow-hidden text-ellipsis whitespace-nowrap text-[12px] text-foreground-muted">
                  {d.organismo ?? "—"}
                </span>
              </td>
              <td className="px-3.5 py-2.5 align-middle">
                <span className="text-[11px] text-foreground-subtle font-mono">
                  {d.proteina_buscada}
                </span>
              </td>
              <td className="px-3.5 py-2.5 align-middle font-mono text-[13px]">
                {d.resolucao ? `${d.resolucao} Å` : "—"}
              </td>
              <td className="px-3.5 py-2.5 align-middle text-[12px] text-foreground-muted">
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
              <td className="px-3.5 py-2.5 align-middle font-mono text-[12px] text-foreground-subtle">
                {d.depositado_em ?? "—"}
              </td>
              <td className="px-3.5 py-2.5 align-middle text-center">
                {d.link_pdb ? (
                  <a
                    href={d.link_pdb}
                    target="_blank"
                    rel="noreferrer"
                    title="Abrir no RCSB PDB"
                    className="inline-flex items-center justify-center w-7 h-7 rounded  text-foreground-subtle transition-all hover:border-accent hover:bg-accent hover:text-bg"
                  >
                    <ExternalLinkIcon size={13} />
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
