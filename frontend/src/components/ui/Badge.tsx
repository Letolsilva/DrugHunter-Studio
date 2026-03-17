// components/ui/Badge.tsx
import type { ReactNode } from "react";

const VARIANTS: Record<string, string> = {
  excelente: "bg-accent-15 text-accent border border-accent-30",
  boa: "bg-blue-15 text-blue-300 border border-blue-30",
  razoavel: "bg-yellow-15 text-amber-400 border border-yellow-30",
  verificar: "bg-red-15 text-red-400 border border-red-30",
  ligante: "bg-blue-12 text-sky-300 border border-blue-25",
  "sem-ligante":
    "bg-transparent             text-foreground-subtle border border-outline",
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
