import { type ReactNode } from "react";

export interface HistoryItemCardRootProps {
  onClick: () => void;
  onDelete: () => void;
  disabled?: boolean;
  title?: string;
  children: ReactNode;
}

export function HistoryItemCardRoot({
  onClick,
  onDelete,
  disabled = false,
  title,
  children,
}: HistoryItemCardRootProps) {
  return (
    <div className="relative">
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        title={title}
        className={`flex w-full items-start gap-3 rounded-lg border px-[18px] pr-10 py-3.5 text-left transition-[border-color,background] ${
          disabled
            ? "cursor-not-allowed border-red/20 bg-red/[0.04] opacity-80"
            : "cursor-pointer border-outline bg-panel hover:border-outline-strong hover:bg-panel-hover"
        }`}
      >
        {children}
      </button>

      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); onDelete(); }}
        title="Remover do histórico"
        className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center justify-center w-5 h-5 font-mono text-[14px] text-foreground-subtle hover:text-foreground transition-colors"
      >
        ×
      </button>
    </div>
  );
}
