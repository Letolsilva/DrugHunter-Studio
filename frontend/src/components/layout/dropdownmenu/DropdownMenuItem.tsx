import type { ReactNode } from "react";

interface DropdownMenuItemProps {
  icon: ReactNode;
  label: string;
  onClick: () => void;
  divider?: boolean;
}

export function DropdownMenuItem({
  icon,
  label,
  onClick,
  divider = false,
}: DropdownMenuItemProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`grid w-full cursor-pointer grid-cols-[16px_1fr] items-center gap-2 bg-transparent px-4 py-2.5 text-left text-[13px] text-foreground-muted transition-colors hover:bg-surface-primary ${
        divider ? "border-b border-outline" : ""
      }`}
    >
      <span className="inline-flex w-4 justify-start">{icon}</span>
      <span className="text-left">{label}</span>
    </button>
  );
}
