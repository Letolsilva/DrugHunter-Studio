// components/ui/ConfirmModal.tsx
import { useEffect } from "react";
import { Button } from "./Button";

interface ConfirmModalProps {
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmModal({
  message,
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  // Fecha com Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onCancel]);

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50"
      onClick={onCancel}
    >
      <div
        className="w-full max-w-[360px] rounded-xl border border-outline bg-surface-secondary p-6 shadow-menu"
        onClick={(e) => e.stopPropagation()}
      >
        <p className="mb-6 text-[14px] text-foreground">{message}</p>
        <div className="flex justify-end gap-2">
          <Button
            variant="ghost"
            onClick={onCancel}
            style={{ padding: "6px 16px", fontSize: 13 }}
          >
            Cancelar
          </Button>
          <Button
            variant="primary"
            onClick={onConfirm}
            style={{ padding: "6px 16px", fontSize: 13 }}
          >
            Excluir
          </Button>
        </div>
      </div>
    </div>
  );
}
