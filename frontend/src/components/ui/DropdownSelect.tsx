// components/ui/DropdownSelect.tsx
import { useState, useRef, useEffect } from "react";
import { ChevronDownIcon } from "../icons";

export interface DropdownOption {
  value: string;
  label: string;
}

interface DropdownSelectProps {
  value: string;
  onChange: (v: string) => void;
  options: DropdownOption[];
}

export function DropdownSelect({
  value,
  onChange,
  options,
}: DropdownSelectProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node))
        setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const selected = options.find((o) => o.value === value) ?? options[0];
  const isDefault = value === options[0].value;

  return (
    <div ref={ref} className="relative w-full">
      <button
        type="button"
        onClick={() => setOpen((a) => !a)}
        className={`flex h-9 w-full cursor-pointer items-center justify-between gap-1.5 overflow-hidden rounded-lg border border-outline bg-surface-primary px-2.5 text-[13px] text-left transition-colors hover:border-outline-strong ${
          isDefault ? "text-foreground-subtle" : "text-foreground"
        }`}
      >
        <span className="flex-1 overflow-hidden text-ellipsis whitespace-nowrap">
          {selected.label}
        </span>
        <span
          className={`inline-flex shrink-0 opacity-50 transition-transform duration-150 ${
            open ? "rotate-180" : ""
          }`}
        >
          <ChevronDownIcon size={12} />
        </span>
      </button>

      {open && (
        <div className="absolute left-0 top-[calc(100%+4px)] z-200 w-full overflow-hidden rounded-lg border border-outline bg-surface-secondary shadow-menu">
          {options.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => {
                onChange(opt.value);
                setOpen(false);
              }}
              className={`block w-full px-3 py-2 text-left text-[12px] transition-colors hover:bg-panel-hover ${
                value === opt.value ? "text-accent" : "text-foreground-muted"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
