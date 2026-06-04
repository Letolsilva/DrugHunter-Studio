import type { JSX, ReactNode, RefObject } from "react";

export interface DropdownMenuRootProps {
  isOpen: boolean;
  menuRef: RefObject<HTMLDivElement | null>;
  onToggle: () => void;
  trigger: ReactNode;
  children: ReactNode;
  buttonTitle?: string;
  buttonClassName?: string;
  menuClassName?: string;
}

export function DropdownMenuRoot({
  isOpen,
  menuRef,
  onToggle,
  trigger,
  children,
  buttonTitle = "Menu",
  buttonClassName = "",
  menuClassName = "",
}: DropdownMenuRootProps): JSX.Element {
  return (
    <div ref={menuRef} className="relative">
      <button
        type="button"
        onClick={onToggle}
        title={buttonTitle}
        className={`flex cursor-pointer items-center rounded bg-transparent px-2.5 py-2 leading-none transition-colors hover:text-accent ${
          isOpen ? "text-accent-muted" : "text-foreground-subtle"
        } ${buttonClassName}`.trim()}
      >
        {trigger}
      </button>

      {isOpen && (
        <div
          className={`absolute right-0 top-full z-[9999] min-w-[168px] overflow-hidden rounded border border-outline bg-surface-secondary shadow-menu ${menuClassName}`.trim()}
        >
          {children}
        </div>
      )}
    </div>
  );
}
