import type { IconProps } from "./types";

export function AppLogoIcon({ size = 20, ...props }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <path d="M12 2.8 19.5 7v10L12 21.2 4.5 17V7L12 2.8Z" />
      <path d="M12 2.8V11" />
      <path d="M4.5 7 12 11l7.5-4" />
    </svg>
  );
}
