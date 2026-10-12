// components/ui/CancelJobButton.tsx
// Botão "Cancelar" de um job em andamento, com confirmação. Reutilizado por todos os módulos.
import { useState } from "react";
import { Button } from "./Button";
import { ConfirmModal } from "./ConfirmModal";

interface CancelJobButtonProps {
  /** Executa o cancelamento (chama o usecase). Deve lançar erro em caso de falha. */
  onCancel: () => Promise<void> | void;
  label?: string;
  message?: string;
  disabled?: boolean;
}

export function CancelJobButton({
  onCancel,
  label = "Cancelar",
  message = "Cancelar este processamento? O trabalho em andamento será interrompido e não poderá ser retomado.",
  disabled,
}: CancelJobButtonProps) {
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);

  const handleConfirm = async () => {
    setConfirming(false);
    setBusy(true);
    try {
      await onCancel();
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Button
        variant="ghost"
        onClick={() => setConfirming(true)}
        disabled={disabled || busy}
        style={{ padding: "6px 14px", fontSize: 13 }}
      >
        {busy ? "Cancelando…" : label}
      </Button>
      {confirming && (
        <ConfirmModal
          message={message}
          confirmLabel="Cancelar processamento"
          cancelLabel="Continuar"
          onConfirm={handleConfirm}
          onCancel={() => setConfirming(false)}
        />
      )}
    </>
  );
}
