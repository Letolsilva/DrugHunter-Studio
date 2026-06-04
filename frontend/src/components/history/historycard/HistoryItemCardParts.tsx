import type { ReactNode } from "react";

export function HistoryItemCardLeft({ children }: { children: ReactNode }) {
  return <div className="shrink-0 mt-px opacity-50">{children}</div>;
}

export function HistoryItemCardTitle({
  children,
  muted = false,
}: {
  children: ReactNode;
  muted?: boolean;
}) {
  return (
    <p
      className={`mb-[3px] overflow-hidden text-ellipsis whitespace-nowrap text-[14px] font-semibold ${
        muted ? "text-foreground-muted" : "text-foreground"
      }`}
    >
      {children}
    </p>
  );
}

export function HistoryItemCardDetails({ children }: { children: ReactNode }) {
  return <div className="flex flex-wrap items-center gap-2">{children}</div>;
}
