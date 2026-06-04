import type { ReactNode } from "react";

interface SearchBoxFooterProps {
  hint?: string;
  children?: ReactNode;
}

export function SearchBoxFooter({
  hint = "Ctrl+Enter para buscar",
  children,
}: SearchBoxFooterProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
      <span className="font-mono text-[11px] text-foreground-subtle">
        {hint}
      </span>
      {children && <div className="flex gap-2">{children}</div>}
    </div>
  );
}
