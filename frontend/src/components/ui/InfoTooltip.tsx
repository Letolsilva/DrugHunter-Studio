// components/ui/InfoTooltip.tsx
import { useState } from "react";

interface InfoTooltipProps {
  text: string;
}

export function InfoTooltip({ text }: InfoTooltipProps) {
  const [visible, setVisible] = useState(false);

  return (
    <span className="relative inline-flex items-center">
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        onBlur={() => setVisible(false)}
        className="flex items-center justify-center w-3.5 h-3.5 rounded-full border border-foreground-subtle text-foreground-subtle hover:border-foreground hover:text-foreground transition-colors focus:outline-none"
        aria-label="Mais informações"
      >
        <span className="text-[8px] font-bold leading-none select-none">i</span>
      </button>

      {visible && (
        <span
          role="tooltip"
          className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50 w-56 rounded-lg border border-outline bg-panel px-3 py-2 text-[11px] text-foreground-muted shadow-lg"
        >
          {text}
          <span className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-outline" />
        </span>
      )}
    </span>
  );
}
