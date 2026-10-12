import type { ReactNode } from "react";

interface NavbarMiddleProps {
  children: ReactNode;
}

export function NavbarMiddle({ children }: NavbarMiddleProps) {
  return (
    <div className="absolute left-1/2 -translate-x-1/2 flex items-center">
      {children}
    </div>
  );
}
