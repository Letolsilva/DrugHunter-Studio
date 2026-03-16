// components/ui/Badge.tsx
import type { ReactNode } from "react";

const VARIANTS: Record<string, string> = {
  excelente:
    "bg-[rgba(0,212,170,0.15)]  text-[#00d4aa] border border-[rgba(0,212,170,0.3)]",
  boa: "bg-[rgba(59,130,246,0.15)]  text-[#60a5fa] border border-[rgba(59,130,246,0.3)]",
  razoavel:
    "bg-[rgba(245,158,11,0.15)]  text-[#fbbf24] border border-[rgba(245,158,11,0.3)]",
  verificar:
    "bg-[rgba(239,68,68,0.15)]   text-[#f87171] border border-[rgba(239,68,68,0.3)]",
  ligante:
    "bg-[rgba(59,130,246,0.12)]  text-[#7dd3fc] border border-[rgba(59,130,246,0.25)]",
  "sem-ligante":
    "bg-transparent             text-[var(--text-3)] border border-[var(--border)]",
};

interface BadgeProps {
  variant?: keyof typeof VARIANTS;
  children: ReactNode;
  className?: string;
}

export function Badge({ variant, children, className = "" }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold tracking-[0.02em] whitespace-nowrap ${VARIANTS[variant ?? ""] ?? ""} ${className}`}
    >
      {children}
    </span>
  );
}
