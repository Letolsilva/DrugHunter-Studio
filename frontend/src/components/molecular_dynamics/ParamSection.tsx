// components/molecular_dynamics/ParamSection.tsx
import { useState, type ReactNode } from "react";

interface ParamSectionProps {
  title: string;
  defaultOpen?: boolean;
  children: ReactNode;
}

export function ParamSection({ title, defaultOpen = false, children }: ParamSectionProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-5 py-3.5 text-left hover:bg-[var(--card-2)] transition-colors"
      >
        <span className="font-mono text-[13px] font-semibold text-[var(--text)]">{title}</span>
        <span
          className="font-mono text-[11px] text-[var(--text-3)] transition-transform duration-200"
          style={{ display: "inline-block", transform: open ? "rotate(180deg)" : "rotate(0deg)" }}
        >
          ▼
        </span>
      </button>
      {open && (
        <div className="px-5 pb-5 pt-1 border-t border-[var(--border)]">
          {children}
        </div>
      )}
    </div>
  );
}
