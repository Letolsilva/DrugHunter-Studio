import type { ReactNode } from "react";

interface NavbarLeftProps {
  children: ReactNode;
}

export function NavbarLeft({ children }: NavbarLeftProps) {
  return <div className="flex items-center gap-3">{children}</div>;
}
