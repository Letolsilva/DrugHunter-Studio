// components/pdb_files/PdbFileCard.tsx
import type { PdbFileModel } from "../../domain/models/pdb_files.model";
import { TrashIcon } from "../icons";

interface PdbFileCardProps {
  arquivo: PdbFileModel;
  onExcluir: (pdb_id: string) => void;
  onAbrir: (pdb_id: string) => void;
}

function formatarTamanho(bytes: number | null): string {
  if (bytes === null) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatarData(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export function PdbFileCard({ arquivo, onExcluir, onAbrir }: PdbFileCardProps) {
  return (
    <div
      className="group relative flex flex-col gap-3 rounded-xl border border-outline bg-panel p-4 transition-colors hover:border-outline-strong hover:bg-panel-hover cursor-pointer"
      onClick={() => onAbrir(arquivo.pdb_id)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === "Enter" && onAbrir(arquivo.pdb_id)}
    >
      {/* Cabeçalho */}
      <div className="flex items-start justify-between gap-2">
        <span className="font-mono text-[18px] font-extrabold text-accent tracking-wide">
          {arquivo.pdb_id}
        </span>

        <button
          type="button"
          className="cursor-pointer rounded border-none bg-transparent p-1 text-foreground-subtle opacity-0 transition-opacity group-hover:opacity-100 hover:text-red"
          title="Remover"
          onClick={(e) => {
            e.stopPropagation();
            onExcluir(arquivo.pdb_id);
          }}
        >
          <TrashIcon size={15} />
        </button>
      </div>

      {/* Título */}
      <p className="text-[12px] text-foreground-muted leading-snug line-clamp-2 min-h-[32px]">
        {arquivo.titulo ?? "Sem título"}
      </p>

      {/* Metadados */}
      <div className="flex flex-col gap-1 mt-auto border-t border-outline pt-3">
        <div className="flex justify-between text-[11px]">
          <span className="text-foreground-subtle">Organismo</span>
          <span className="text-foreground-muted text-right max-w-[55%] truncate">
            {arquivo.organismo ?? "—"}
          </span>
        </div>
        <div className="flex justify-between text-[11px]">
          <span className="text-foreground-subtle">Resolução</span>
          <span className="text-foreground-muted">
            {arquivo.resolucao !== null ? `${arquivo.resolucao} Å` : "—"}
          </span>
        </div>
        <div className="flex justify-between text-[11px]">
          <span className="text-foreground-subtle">Método</span>
          <span className="text-foreground-muted truncate max-w-[55%]">
            {arquivo.metodo ?? "—"}
          </span>
        </div>
        <div className="flex justify-between text-[11px]">
          <span className="text-foreground-subtle">Tamanho</span>
          <span className="text-foreground-muted">
            {formatarTamanho(arquivo.pdb_file_size)}
          </span>
        </div>
        <div className="flex justify-between text-[11px]">
          <span className="text-foreground-subtle">Baixado em</span>
          <span className="text-foreground-muted">
            {formatarData(arquivo.downloaded_at)}
          </span>
        </div>
      </div>
    </div>
  );
}
