// components/dashboard/DownloadProgressBar.tsx
interface DownloadProgressBarProps {
  atual: number;
  total: number;
}

export function DownloadProgressBar({
  atual,
  total,
}: DownloadProgressBarProps) {
  const pct = total > 0 ? Math.round((atual / total) * 100) : 0;

  return (
    <div className="flex flex-col gap-2 rounded-xl border border-outline bg-panel px-5 py-4">
      <div className="flex items-center justify-between gap-3">
        <span className="font-mono text-[12px] text-foreground-muted">
          Baixando arquivos .pdb...
        </span>
        <span className="shrink-0 font-mono text-[13px] font-bold text-foreground-muted">
          {atual}/{total} <span className="text-accent">{pct}%</span>
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded border border-outline bg-surface-secondary">
        <div
          className="h-full rounded transition-[width] duration-[400ms] shadow-accent-glow"
          style={{
            width: `${Math.max(pct, 2)}%`,
            background:
              "linear-gradient(90deg, var(--color-accent-hover), var(--color-accent))",
          }}
        />
      </div>
    </div>
  );
}
