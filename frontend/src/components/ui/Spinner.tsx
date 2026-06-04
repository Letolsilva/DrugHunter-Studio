// components/ui/Spinner.tsx
import type { CSSProperties } from "react";

interface SpinnerProps {
  className?: string;
  style?: CSSProperties;
}

export function Spinner({ className = "", style = {} }: SpinnerProps) {
  return <span className={`spinner ${className}`} style={style} />;
}
