// components/ui/Card.tsx
import type { ReactNode, CSSProperties } from "react";

interface CardProps {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
}

export function Card({ children, className = "", style }: CardProps) {
  return (
    <div
      className={`bg-[var(--card)] border border-[var(--border)] rounded-xl ${className}`}
      style={style}
    >
      {children}
    </div>
  );
}
