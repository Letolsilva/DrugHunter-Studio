import type { IconProps } from "./types";

export function LogoutIcon({ size = 16, ...props }: IconProps) {
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
      <path d="M14 3h-8a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h8" />
      <path d="M10 12h10" />
      <path d="m17 8 4 4-4 4" />
    </svg>
  );
}
