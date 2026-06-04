import type { ReactNode } from "react";

interface NavbarMiddleProps {
  children: ReactNode;
}

export function NavbarMiddle({ children }: NavbarMiddleProps) {
  return (
    <div className="flex flex-1 items-center justify-center">{children}</div>
  );
}
