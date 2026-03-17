import type { IconProps } from "./types";

export function MicroscopeIcon({ size = 16, ...props }: IconProps) {
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
      <path d="M7 21h10" />
      <path d="M12 6.5 8.5 10l3.5 3.5 3.5-3.5L12 6.5Z" />
      <path d="M10 4h4" />
      <path d="M14 4v2" />
      <path d="M12 13.5V17a4 4 0 0 0 4 4" />
      <path d="M9 17h7" />
    </svg>
  );
}
