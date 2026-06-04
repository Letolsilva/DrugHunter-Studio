import type { IconProps } from "./types";

export function PlayIcon({ size = 14, ...props }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="currentColor"
      aria-hidden="true"
      {...props}
    >
      <path d="M8 5.5v13l10-6.5-10-6.5Z" />
    </svg>
  );
}
