import type { ReactNode } from "react";

interface NavbarProps {
  children: ReactNode;
  className?: string;
}

export function Navbar({ children, className = "" }: NavbarProps) {
  return (
    <nav
      className={`sticky top-0 z-[100] flex h-14 items-center justify-between border-b border-outline bg-surface-secondary px-8 ${className}`.trim()}
    >
      {children}
    </nav>
  );
}
