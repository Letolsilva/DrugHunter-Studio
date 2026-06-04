// components/ui/MultiSelect.tsx
import { useState, useRef, useEffect } from "react";
import { ChevronDownIcon, CloseIcon } from "../icons";

interface MultiSelectProps {
  options: string[];
  value: string[];
  onChange: (v: string[]) => void;
  placeholder?: string;
  /** Callback disparado toda vez que a seleção muda (ex: resetar página) */
  onSelect?: () => void;
}

export function MultiSelect({
  options,
  value,
  onChange,
  placeholder = "Todos",
  onSelect,
}: MultiSelectProps) {
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

  const toggle = (item: string) => {
    const next = value.includes(item)
      ? value.filter((o) => o !== item)
      : [...value, item];
    onChange(next);
    onSelect?.();
  };

  function buildLabel(): string {
    if (value.length === 0) return placeholder;
    if (value.length === 1) {
      const first = value[0];
      return first.length > 22 ? first.slice(0, 20) + "…" : first;
    }
    return `${value.length} selecionados`;
  }

  return (
    <div ref={ref} className="relative w-full">
      <button
        type="button"
        onClick={() => setOpen((a) => !a)}
        className={`flex h-9 w-full cursor-pointer items-center justify-between gap-1.5 overflow-hidden rounded-lg border border-outline bg-surface-primary px-2.5 text-[13px] text-left transition-colors hover:border-outline-strong ${
          value.length > 0 ? "text-foreground" : "text-foreground-subtle"
        }`}
      >
        <span className="flex-1 overflow-hidden text-ellipsis whitespace-nowrap">
          {buildLabel()}
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
        <div className="absolute left-0 top-[calc(100%+4px)] z-200 w-full max-h-64 overflow-y-auto rounded-lg border border-outline bg-surface-secondary shadow-menu">
          {value.length > 0 && (
            <button
              type="button"
              onClick={() => {
                onChange([]);
                onSelect?.();
              }}
              className="block w-full border-b border-outline px-3 py-1.75 text-left text-[12px] text-accent transition-colors hover:bg-panel-hover"
            >
              <span className="inline-flex items-center gap-1.5">
                <CloseIcon size={11} /> Limpar seleção
              </span>
            </button>
          )}

          {options.map((item) => {
            const sel = value.includes(item);
            return (
              <label
                key={item}
                className={`flex cursor-pointer items-center gap-2 px-3 py-1.75 text-[12px] transition-colors ${
                  sel
                    ? "bg-accent-12 text-foreground"
                    : "text-foreground-muted hover:bg-panel-hover"
                }`}
              >
                <input
                  type="checkbox"
                  checked={sel}
                  onChange={() => toggle(item)}
                  className="shrink-0 accent-accent"
                />
                <span className="whitespace-nowrap">{item}</span>
              </label>
            );
          })}

          {options.length === 0 && (
            <p className="px-3 py-2.5 text-[12px] text-foreground-subtle">
              Sem opções disponíveis
            </p>
          )}
        </div>
      )}
    </div>
  );
}
