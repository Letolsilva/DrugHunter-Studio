import type { IconProps } from "./types";

export function RefreshIcon({ size = 16, ...props }: IconProps) {
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
      <path d="M20 8A9 9 0 1 0 20 16" />
      <path d="M20 3v5h-5" />
    </svg>
  );
}
