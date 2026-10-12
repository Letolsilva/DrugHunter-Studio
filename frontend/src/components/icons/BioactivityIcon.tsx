import type { IconProps } from "./types";

export function BioactivityIcon({ size = 16, ...props }: IconProps) {
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
      <polygon points="12 2 19.5 6.5 19.5 15.5 12 20 4.5 15.5 4.5 6.5" />
      <line x1="12" y1="2" x2="12" y2="5" />
      <line x1="19.5" y1="6.5" x2="17" y2="8" />
      <line x1="19.5" y1="15.5" x2="17" y2="14" />
      <line x1="12" y1="20" x2="12" y2="17" />
      <line x1="4.5" y1="15.5" x2="7" y2="14" />
      <line x1="4.5" y1="6.5" x2="7" y2="8" />
      <circle cx="12" cy="11" r="2.5" />
    </svg>
  );
}
