// components/visualizador/GlobalRedockingIndicator.tsx
// Indicador flutuante persistente em todas as rotas enquanto há job ativo.
import { useCallback, useEffect, useRef, useState } from "react";
import { useRedocking } from "../../contexts/RedockingContext";
import { Spinner } from "../ui/Spinner";
import { CloseIcon } from "../icons";

export function GlobalRedockingIndicator() {
  const { activeJob, clearActiveJob } = useRedocking();
  const [visible, setVisible] = useState(false);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!activeJob) {
      setVisible(false);
      return;
    }

    setVisible(true);

    if (activeJob.status === "done" || activeJob.status === "error") {
      // Mantém o indicador visível por 5s após conclusão, depois some
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
      hideTimerRef.current = setTimeout(() => {
        setVisible(false);
      }, 5000);
    }

    return () => {
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    };
  }, [activeJob]);

  const handleClose = useCallback(() => {
    setVisible(false);
    clearActiveJob();
  }, [clearActiveJob]);

  if (!visible || !activeJob) return null;

  const isDone = activeJob.status === "done";
  const isError = activeJob.status === "error";
  const isRunning =
    activeJob.status === "pending" || activeJob.status === "running";

  const borderColor = isError
    ? "var(--color-red-30)"
    : isDone
      ? "var(--color-accent-30)"
      : "var(--color-blue-30)";

  const bgGradient = isError
    ? "linear-gradient(135deg, var(--color-red-12) 0%, var(--color-panel) 100%)"
    : isDone
      ? "linear-gradient(135deg, var(--color-accent-12) 0%, var(--color-panel) 100%)"
      : "linear-gradient(135deg, var(--color-blue-12) 0%, var(--color-accent-12) 100%)";

  const labelColor = isError
    ? "var(--color-red)"
    : isDone
      ? "var(--color-accent)"
      : "var(--color-blue)";

  const label = isError
    ? "Erro no redocking"
    : isDone
      ? "Redocking concluído"
      : "Redocking em andamento...";

  return (
    <div
      style={{
        position: "fixed",
        bottom: "24px",
        left: "24px",
        zIndex: 9998,
        display: "flex",
        alignItems: "flex-start",
        gap: "10px",
        padding: "12px 16px",
        borderRadius: "10px",
        background: bgGradient,
        border: `1px solid ${borderColor}`,
        boxShadow: "0 4px 24px rgba(0,0,0,0.35)",
        minWidth: "220px",
        maxWidth: "300px",
        animation: "fadeInUp 0.2s ease",
      }}
    >
      {/* Ícone */}
      <div style={{ marginTop: 2, flexShrink: 0 }}>
        {isRunning ? (
          <Spinner
            style={{
              width: 16,
              height: 16,
              borderWidth: 2,
              borderColor: "var(--color-blue-25)",
              borderTopColor: "var(--color-blue)",
            }}
          />
        ) : null}
      </div>

      {/* Texto */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <p
          style={{
            fontSize: 13,
            fontWeight: 600,
            color: labelColor,
            marginBottom: 2,
          }}
        >
          {label}
        </p>
        <p
          style={{
            fontSize: 11,
            color: "var(--color-foreground-subtle)",
            fontFamily: "var(--font-mono)",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {activeJob.target}
        </p>
        {isError && activeJob.erro_msg && (
          <p
            style={{
              fontSize: 11,
              color: "var(--color-red)",
              marginTop: 4,
              wordBreak: "break-word",
            }}
          >
            {activeJob.erro_msg.slice(0, 120)}
          </p>
        )}
      </div>

      {/* Fechar */}
      <button
        type="button"
        onClick={handleClose}
        style={{
          background: "transparent",
          border: "none",
          cursor: "pointer",
          padding: 2,
          color: "var(--color-foreground-subtle)",
          flexShrink: 0,
        }}
        title="Fechar"
      >
        <CloseIcon size={14} />
      </button>
    </div>
  );
}
