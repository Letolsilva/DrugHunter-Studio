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
      className={`bg-panel border border-outline rounded-xl ${className}`}
      style={style}
    >
      {children}
    </div>
  );
}
