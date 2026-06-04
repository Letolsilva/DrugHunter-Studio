import type { ReactNode } from "react";

interface NavbarRightProps {
  children: ReactNode;
}

export function NavbarRight({ children }: NavbarRightProps) {
  return <div className="flex items-center gap-3">{children}</div>;
}
