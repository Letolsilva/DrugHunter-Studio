import type { IconProps } from "./types";

export function LoadingIcon({ size = 16, ...props }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      aria-hidden="true"
      style={{ animation: "spin 0.8s linear infinite" }}
      {...props}
    >
      {/* Anel de fundo */}
      <circle cx="12" cy="12" r="9" strokeOpacity="0.2" />
      {/* Arco girando */}
      <path d="M12 3a9 9 0 0 1 9 9" />
    </svg>
  );
}
