import type { IconProps } from "./types";

export function PredictionIcon({ size = 16, ...props }: IconProps) {
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
      <path d="M3 4h18l-7 9v6l-4-2v-4Z" />
      <circle cx="18" cy="18" r="3" />
      <line x1="12" y1="8" x2="18" y2="15.1" strokeDasharray="2 2" />
    </svg>
  );
}
