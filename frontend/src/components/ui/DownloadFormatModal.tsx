// components/ui/DownloadFormatModal.tsx
import { DownloadIcon } from "../icons";

interface DownloadFormatModalProps {
  pdbCount: number;
  temLegacy: boolean;
  temCif: boolean;
  onSelectLegacy: () => void;
  onSelectCif: () => void;
  onClose: () => void;
}

export function DownloadFormatModal({
  pdbCount,
  temLegacy,
  temCif,
  onSelectLegacy,
  onSelectCif,
  onClose,
}: DownloadFormatModalProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: "rgba(0,0,0,0.65)" }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-xl border border-outline bg-panel p-6 flex flex-col gap-5 shadow-menu"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Título */}
        <div className="flex flex-col gap-1">
          <h2 className="text-[16px] font-bold text-foreground">
            Escolha o formato para download
          </h2>
        </div>

        {/* Opções */}
        <div className="flex gap-3">
          {/* Legacy PDB */}
          <button
            type="button"
            disabled={!temLegacy}
            onClick={temLegacy ? onSelectLegacy : undefined}
            className={[
              "flex-1 flex flex-col items-center gap-2 rounded-xl border px-4 py-5 transition-colors",
              temLegacy
                ? "border-outline bg-panel-hover cursor-pointer hover:border-accent hover:bg-accent-12"
                : "border-outline bg-panel opacity-40 cursor-not-allowed",
            ].join(" ")}
          >
            <DownloadIcon
              size={20}
              className={temLegacy ? "text-accent" : "text-foreground-subtle"}
            />
            <span className="font-mono text-[13px] font-bold text-foreground">
              Legacy PDB
            </span>
            <span className="font-mono text-[11px] text-foreground-subtle">
              .pdb
            </span>
            {!temLegacy && (
              <span className="font-mono text-[10px] text-red mt-1">
                Indisponível no RCSB
              </span>
            )}
          </button>

          {/* PDBx/mmCIF */}
          <button
            type="button"
            disabled={!temCif}
            onClick={temCif ? onSelectCif : undefined}
            className={[
              "flex-1 flex flex-col items-center gap-2 rounded-xl border px-4 py-5 transition-colors",
              temCif
                ? "border-outline bg-panel-hover cursor-pointer hover:border-blue hover:bg-blue-12"
                : "border-outline bg-panel opacity-40 cursor-not-allowed",
            ].join(" ")}
          >
            <DownloadIcon
              size={20}
              className={temCif ? "text-blue" : "text-foreground-subtle"}
            />
            <span className="font-mono text-[13px] font-bold text-foreground">
              PDBx/mmCIF
            </span>
            <span className="font-mono text-[11px] text-foreground-subtle">
              .cif
            </span>
            {!temCif && (
              <span className="font-mono text-[10px] text-red mt-1">
                Indisponível no RCSB
              </span>
            )}
          </button>
        </div>

        {/* Cancelar */}
        <button
          type="button"
          onClick={onClose}
          className="cursor-pointer self-end rounded border-none bg-transparent px-3 py-1.5 font-mono text-[12px] text-foreground-subtle transition-colors hover:text-foreground"
        >
          Cancelar
        </button>
      </div>
    </div>
  );
}
