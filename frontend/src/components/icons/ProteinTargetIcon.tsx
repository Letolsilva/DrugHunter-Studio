import type { IconProps } from "./types";

export function ProteinTargetIcon({ size = 16, ...props }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <path d="M7 3 Q11 6 7 10 Q3 14 7 17 Q11 20 7 21" />
      <path d="M17 3 Q13 6 17 10 Q21 14 17 17 Q13 20 17 21" />
      <line x1="7" y1="6.5" x2="17" y2="6.5" />
      <line x1="7" y1="12" x2="17" y2="12" />
      <line x1="7" y1="17.5" x2="17" y2="17.5" />
    </svg>
  );
}
