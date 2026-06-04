// components/ui/Button.tsx
import type { ReactNode, CSSProperties, MouseEventHandler } from "react";

interface ButtonProps {
  variant?: "primary" | "ghost";
  children: ReactNode;
  onClick?: MouseEventHandler<HTMLButtonElement>;
  disabled?: boolean;
  type?: "button" | "submit" | "reset";
  className?: string;
  style?: CSSProperties;
}

export function Button({
  variant = "primary",
  children,
  onClick,
  disabled,
  type = "button",
  className = "",
  style,
}: ButtonProps) {
  const base = variant === "primary" ? "btn-primary" : "btn-ghost";
  return (
    <button
      type={type}
      className={`${base} ${className}`}
      onClick={onClick}
      disabled={disabled}
      style={style}
    >
      {children}
    </button>
  );
}
