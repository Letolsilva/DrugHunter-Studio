// components/admet/AdmetDownloads.tsx

interface DownloadButtonProps {
  label: string;
  href: string;
  token: string;
  color?: string;
}

function DownloadButton({ label, href, token, color }: DownloadButtonProps) {
  const handleClick = async () => {
    const res = await fetch(href, { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) return;
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = href.split("/").pop() ?? "download.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <button
      onClick={handleClick}
      className="flex items-center gap-1.5 rounded-lg border px-3 py-1.5 font-mono text-[11px] transition-all hover:bg-surface-secondary"
      style={
        color
          ? {
              borderColor: `color-mix(in srgb, ${color} 40%, var(--color-outline))`,
              color,
            }
          : {
              borderColor: "var(--color-outline)",
              color: "var(--color-foreground-subtle)",
            }
      }
    >
      ↓ {label}
    </button>
  );
}

interface Props {
  resultId: number;
  token: string;
  hasToxic: boolean;
}

export function AdmetDownloads({ resultId, token, hasToxic }: Props) {
  const base = `/api/admet/results/${resultId}/download`;
  return (
    <div className="flex flex-wrap gap-2 items-center">
      <span className="font-mono text-[11px] text-foreground-subtle">Downloads:</span>
      <DownloadButton label="CSV Completo" href={`${base}/all`} token={token} />
      <DownloadButton label="BBB+" href={`${base}/bbb_plus`} token={token} color="#e05a5a" />
      <DownloadButton label="BBB-" href={`${base}/bbb_minus`} token={token} color="#5a7be0" />
      <DownloadButton label="HIA+" href={`${base}/hia_plus`} token={token} color="var(--color-accent)" />
      {hasToxic && (
        <DownloadButton label="Tóxicas" href={`${base}/toxic`} token={token} color="var(--color-foreground-subtle)" />
      )}
    </div>
  );
}
