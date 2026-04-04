// components/dashboard/ResultsTable.tsx
import { Badge } from "../ui/Badge";
import { ExternalLinkIcon, DownloadIcon, LoadingIcon } from "../icons";
import type { PdbResultModel } from "../../domain/models/search.model";

const HEADERS = [
  "", // checkbox
  "PDB ID",
  "Título",
  "Organismo",
  "Proteína",
  "Resolução",
  "Método",
  "Ligante",
  "Data",
  "Link",
  "↓ PDB", // download
];

interface ResultsTableProps {
  rows: PdbResultModel[];
  selectedIds: Set<string>;
  isAllSelected: boolean;
  onToggleSelected: (pdbId: string) => void;
  onToggleSelectAll: () => void;
  onDownloadSingle: (pdbId: string) => void;
  downloadingIds: Set<string>;
  recentlyDownloadedIds: Set<string>;
  failedIds: Set<string>;
}

export function ResultsTable({
  rows,
  selectedIds,
  isAllSelected,
  onToggleSelected,
  onToggleSelectAll,
  onDownloadSingle,
  downloadingIds,
  recentlyDownloadedIds,
  failedIds,
}: ResultsTableProps) {
  return (
    <div className="bg-panel border border-outline rounded-xl overflow-auto">
      <table className="w-full border-collapse text-[13px]">
        <thead>
          <tr className="border-b border-outline">
            {/* Checkbox header */}
            <th className="px-3.5 py-3 text-left">
              <input
                type="checkbox"
                checked={isAllSelected}
                onChange={onToggleSelectAll}
                title="Selecionar todos os filtrados"
                className="w-3.5 h-3.5 accent-[var(--color-accent)] cursor-pointer"
              />
            </th>
            {HEADERS.slice(1).map((h) => (
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
              className={`border-b border-[rgba(30,52,80,0.5)] last:border-0 hover:bg-panel-hover ${
                selectedIds.has(d.pdb_id) ? "bg-accent-12" : ""
              }`}
            >
              {/* Checkbox */}
              <td className="px-3.5 py-2.5 align-middle">
                <input
                  type="checkbox"
                  checked={selectedIds.has(d.pdb_id)}
                  onChange={() => onToggleSelected(d.pdb_id)}
                  className="w-3.5 h-3.5 accent-[var(--color-accent)] cursor-pointer"
                />
              </td>
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
                <Badge variant={d.tem_ligante ? "ligante" : "sem-ligante"}>
                  {d.tem_ligante ? "Sim" : "Não"}
                </Badge>
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
                    className="inline-flex items-center justify-center w-7 h-7 rounded text-foreground-subtle transition-all hover:border-accent hover:bg-accent hover:text-bg"
                  >
                    <ExternalLinkIcon size={13} />
                  </a>
                ) : (
                  "—"
                )}
              </td>
              {/* Download .pdb */}
              <td className="px-3.5 py-2.5 align-middle text-center">
                {downloadingIds.has(d.pdb_id) ? (
                  <span
                    className="inline-flex items-center justify-center w-7 h-7 text-accent"
                    title={`Baixando ${d.pdb_id}...`}
                  >
                    <LoadingIcon size={13} />
                  </span>
                ) : failedIds.has(d.pdb_id) ? (
                  <span
                    className="inline-flex items-center justify-center w-7 h-7 rounded"
                    title="Arquivo legacy não disponível"
                    style={{ color: "#ef4444" }}
                  >
                    <svg
                      width="13"
                      height="13"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <line x1="18" y1="6" x2="6" y2="18" />
                      <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </span>
                ) : recentlyDownloadedIds.has(d.pdb_id) ? (
                  <span
                    className="inline-flex items-center justify-center w-7 h-7 rounded text-[var(--color-accent)]"
                    title="Baixado!"
                  >
                    <svg
                      width="13"
                      height="13"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  </span>
                ) : (
                  <button
                    onClick={() => onDownloadSingle(d.pdb_id)}
                    title={`Baixar ${d.pdb_id}.pdb`}
                    className="inline-flex items-center justify-center w-7 h-7 rounded transition-all text-foreground-subtle hover:border-accent hover:bg-accent hover:text-bg"
                  >
                    <DownloadIcon size={13} />
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
