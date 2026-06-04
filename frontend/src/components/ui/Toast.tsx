// components/ui/Toast.tsx

interface ToastProps {
  message: string | null;
  variant?: "success" | "error";
}

export function Toast({ message, variant = "success" }: ToastProps) {
  if (!message) return null;

  const isError = variant === "error";
  const borderColor = isError
    ? "rgba(239,68,68,0.4)"
    : "var(--color-accent-30)";
  const iconBg = isError ? "rgba(239,68,68,0.12)" : "var(--color-accent-15)";
  const iconBorder = isError
    ? "rgba(239,68,68,0.35)"
    : "var(--color-accent-30)";
  const iconColor = isError ? "#ef4444" : "var(--color-accent)";

  return (
    <div
      style={{
        position: "fixed",
        bottom: "24px",
        right: "24px",
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        gap: "10px",
        padding: "12px 18px",
        borderRadius: "10px",
        background: "var(--color-panel)",
        border: `1px solid ${borderColor}`,
        boxShadow: "0 4px 24px rgba(0,0,0,0.35)",
        color: "var(--color-foreground)",
        fontSize: "13px",
        fontWeight: 500,
        animation: "fadeInUp 0.2s ease",
        maxWidth: "340px",
      }}
    >
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          width: "22px",
          height: "22px",
          borderRadius: "50%",
          background: iconBg,
          border: `1px solid ${iconBorder}`,
          color: iconColor,
          flexShrink: 0,
        }}
      >
        {isError ? (
          <svg
            width="11"
            height="11"
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
        ) : (
          <svg
            width="11"
            height="11"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="20 6 9 17 4 12" />
          </svg>
        )}
      </span>
      {message}
    </div>
  );
}
