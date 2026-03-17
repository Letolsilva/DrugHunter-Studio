import { useState, type ReactNode } from "react";
import { TrashIcon } from "../../icons/TrashIcon";
import { ConfirmModal } from "../../ui/ConfirmModal";

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
  const [confirmarDelete, setConfirmarDelete] = useState(false);

  return (
    <>
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
          onClick={(e) => {
            e.stopPropagation();
            setConfirmarDelete(true);
          }}
          title="Excluir busca"
          className="absolute right-2.5 top-1/2 -translate-y-1/2 cursor-pointer rounded p-1.5 text-foreground-subtle transition-colors hover:text-red"
        >
          <TrashIcon size={14} />
        </button>
      </div>

      {confirmarDelete && (
        <ConfirmModal
          message="Tem certeza que deseja excluir esta busca do histórico?"
          onConfirm={() => {
            setConfirmarDelete(false);
            onDelete();
          }}
          onCancel={() => setConfirmarDelete(false)}
        />
      )}
    </>
  );
}
