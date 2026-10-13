// components/icons/DynamicsIcon.tsx
interface Props {
  size?: number;
  className?: string;
}

export function DynamicsIcon({ size = 20, className }: Props) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 20 20"
      fill="none"
      className={className}
    >
      <path
        d="M2 13 Q5 7 10 10 Q15 13 18 7"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        fill="none"
      />
      <path
        d="M2 10 Q5 14 10 12 Q15 10 18 13"
        stroke="currentColor"
        strokeWidth="1"
        strokeLinecap="round"
        fill="none"
        opacity="0.4"
      />
      <circle cx="10" cy="10" r="1.5" fill="currentColor" />
      <circle cx="4" cy="12.5" r="1" fill="currentColor" opacity="0.6" />
      <circle cx="16" cy="8" r="1" fill="currentColor" opacity="0.6" />
    </svg>
  );
}
