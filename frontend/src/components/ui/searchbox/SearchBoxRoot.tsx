import type { JSX, ReactNode } from "react";

export interface SearchBoxRootProps {
  children: ReactNode;
}

export function SearchBoxRoot({ children }: SearchBoxRootProps): JSX.Element {
  return (
    <div className="overflow-hidden rounded-xl border border-outline bg-panel">
      {children}
    </div>
  );
}
