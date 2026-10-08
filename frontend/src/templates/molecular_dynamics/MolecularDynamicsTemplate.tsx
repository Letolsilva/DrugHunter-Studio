// templates/molecular_dynamics/MolecularDynamicsTemplate.tsx
import { useRef, useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Navbar, DropdownMenu } from "../../components/layout";
import { MiddleBar } from "../../components/nav/MiddleBar";
import { Spinner } from "../../components/ui/Spinner";
import {
  AppLogoIcon,
  ArrowLeftIcon,
  CloseIcon,
  HelpIcon,
  LogoutIcon,
  MenuIcon,
  SettingsIcon,
} from "../../components/icons";
import { ParamSection } from "../../components/molecular_dynamics/ParamSection";
import type { UseMolecularDynamicsPageReturn } from "../../pages/MolecularDynamicsPage/useMolecularDynamicsPage";
import type { MDJobModel, MDParamsModel } from "../../domain/models/molecular_dynamics.model";

type Props = UseMolecularDynamicsPageReturn;

function useAuthBlobUrl(src: string, token: string): string | null {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!src || !token) return;
    let objectUrl: string | null = null;
    fetch(src, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => (r.ok ? r.blob() : Promise.reject()))
      .then((blob) => {
        objectUrl = URL.createObjectURL(blob);
        setBlobUrl(objectUrl);
      })
      .catch(() => {});
    return () => { if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [src, token]);
  return blobUrl;
}

function AuthImg({
  src, token, alt, className, style, onClick,
}: {
  src: string; token: string; alt: string;
  className?: string; style?: React.CSSProperties;
  onClick?: (blobUrl: string) => void;
}) {
  const blobUrl = useAuthBlobUrl(src, token);
  if (!blobUrl) return (
    <div className="rounded-lg border border-outline flex items-center justify-center bg-surface-secondary" style={{ minHeight: 140 }}>
      <span className="font-mono text-[11px] text-foreground-subtle">Carregando...</span>
    </div>
  );
  return (
    <img
      src={blobUrl} alt={alt} className={className} style={style}
      onClick={onClick ? () => onClick(blobUrl) : undefined}
    />
  );
}

function AuthIframe({ src, token, title, style, className }: { src: string; token: string; title: string; style?: React.CSSProperties; className?: string }) {
  const blobUrl = useAuthBlobUrl(src, token);
  if (!blobUrl) return <div className={className ?? "rounded-lg border border-outline"} style={{ display: "flex", alignItems: "center", justifyContent: "center", height: (style?.height as number) ?? 520 }}><span className="font-mono text-[11px] text-foreground-subtle">Carregando visualização...</span></div>;
  return <iframe src={blobUrl} title={title} className={className ?? "w-full rounded-lg border border-outline"} style={style} sandbox="allow-scripts allow-same-origin" />;
}

function AuthNewTabLink({ src, token, label }: { src: string; token: string; label: string }) {
  const blobUrl = useAuthBlobUrl(src, token);
  if (!blobUrl) return <span className="font-mono text-[10px] opacity-30">↗ {label}</span>;
  return (
    <a
      href={blobUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="font-mono text-[10px] flex items-center gap-1 transition-opacity hover:opacity-70"
      style={{ color: "var(--color-accent)" }}
    >
      ↗ {label}
    </a>
  );
}

// ── Parser DCD binário → NGL Frames ─────────────────────────────────────────
function parseDcdToFrames(NGL: any, buffer: ArrayBuffer): any {
  const frames = new NGL.Frames("trajectory", "local");
  const dv = new DataView(buffer);
  const le = true;
  const header = new Int32Array(buffer, 0, 24);
  let hasBox = false, hasFour = false;
  if (header[22] !== 0) {
    if (header[12] !== 0) hasBox = true;
    if (header[13] === 1) hasFour = true;
  }
  const NSET = header[2], ISTART = header[3];
  const DELTA = header[22] !== 0 ? dv.getFloat32(44, le) : dv.getFloat64(44, le);
  let o = 92;
  const titleSize = dv.getInt32(o, le); o += titleSize + 8;
  const NATOM = dv.getInt32(o + 4, le); o += 12;
  const coordBytes = NATOM * 4;
  const coordinates: Float32Array[] = [];
  const boxes: Float32Array[] = [];
  for (let i = 0; i < NSET; i++) {
    if (hasBox) {
      o += 4;
      const box = new Float32Array(9);
      box[0] = dv.getFloat64(o, le); box[4] = dv.getFloat64(o + 16, le); box[8] = dv.getFloat64(o + 40, le);
      boxes.push(box); o += 48; o += 4;
    }
    const coords = new Float32Array(3 * NATOM);
    for (let axis = 0; axis < 3; axis++) {
      o += 4;
      for (let j = 0; j < NATOM; j++) coords[3 * j + axis] = dv.getFloat32(o + j * 4, le);
      o += coordBytes; o += 4;
    }
    coordinates.push(coords);
    if (hasFour) { o += 4 + dv.getInt32(o, le) + 4; }
  }
  if (DELTA) { frames.deltaTime = 20.45482949774598 * DELTA; if (ISTART >= 1) frames.timeOffset = (ISTART - 1) * frames.deltaTime; }
  frames.coordinates = coordinates; frames.boxes = boxes;
  return frames;
}

type TrajStatus = "loading" | "ready" | "error";

function TrajectoryViewer({ jobId, token, topologyFile }: { jobId: number | undefined; token: string; topologyFile: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const stageRef    = useRef<any>(null);
  const trajRef     = useRef<any>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [status, setStatus]           = useState<TrajStatus>("loading");
  const [frame, setFrame]             = useState(0);
  const [totalFrames, setTotalFrames] = useState(0);
  const [playing, setPlaying]         = useState(false);
  const [speed, setSpeed]             = useState(80);

  useEffect(() => {
    if (!containerRef.current || !jobId) return;
    let cancelled = false;
    const dl = (f: string) => `/api/molecular-dynamics/job/${jobId}/download/${encodeURIComponent(f)}`;
    async function init() {
      const NGL = await import("ngl");
      if (cancelled || !containerRef.current) return;
      const stage = new NGL.Stage(containerRef.current, { backgroundColor: "#0d0d0d", tooltip: false } as any);
      stageRef.current = stage;
      const ro = new ResizeObserver(() => stage.handleResize());
      ro.observe(containerRef.current!);
      // Impede o scroll da página quando o wheel acontece dentro do viewer (NGL já lida com zoom no canvas)
      const stopWheel = (e: WheelEvent) => e.preventDefault();
      containerRef.current.addEventListener("wheel", stopWheel, { passive: false });
      (stageRef.current as any)._stopWheel = stopWheel;
      const fetchBuf = async (url: string) => {
        const r = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.arrayBuffer();
      };
      const [pdbBuf, dcdBuf] = await Promise.all([fetchBuf(dl(topologyFile)), fetchBuf(dl("trajectory.dcd"))]);
      if (cancelled) return;
      const pdbUrl = URL.createObjectURL(new Blob([pdbBuf], { type: "chemical/x-pdb" }));
      const comp = await (stage as any).loadFile(pdbUrl, { ext: "pdb" });
      URL.revokeObjectURL(pdbUrl);
      if (cancelled) return;
      comp.addRepresentation("cartoon", { color: "chainname", opacity: 0.9 });
      comp.addRepresentation("licorice", { sele: "not protein and not water and not ion", color: "element", multipleBond: "symmetric" });
      const frames = parseDcdToFrames(NGL, dcdBuf);
      const tc = comp.addTrajectory(frames, { centerPbc: true, removePbc: true, superpose: true }) as any;
      const nFrames = tc.trajectory.frameCount;
      if (nFrames === 0) throw new Error("DCD sem frames");
      trajRef.current = tc.trajectory;
      setTotalFrames(nFrames);
      comp.autoView();
      setStatus("ready");
    }
    init().catch((err) => { console.error("[TrajectoryViewer]", err); if (!cancelled) setStatus("error"); });
    return () => {
      cancelled = true;
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (containerRef.current && stageRef.current?._stopWheel) {
        containerRef.current.removeEventListener("wheel", stageRef.current._stopWheel);
      }
      stageRef.current?.dispose();
    };
  }, [jobId, token, topologyFile]);

  const goToFrame = useCallback((n: number) => { trajRef.current?.setFrame(n); setFrame(n); }, []);

  const togglePlay = useCallback(() => {
    if (playing) { if (intervalRef.current) clearInterval(intervalRef.current); intervalRef.current = null; setPlaying(false); }
    else {
      setPlaying(true);
      intervalRef.current = setInterval(() => {
        setFrame((prev) => { const next = (prev + 1) % Math.max(totalFrames, 1); trajRef.current?.setFrame(next); return next; });
      }, speed);
    }
  }, [playing, totalFrames, speed]);

  useEffect(() => {
    if (!playing) return;
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => {
      setFrame((prev) => { const next = (prev + 1) % Math.max(totalFrames, 1); trajRef.current?.setFrame(next); return next; });
    }, speed);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [speed, playing, totalFrames]);

  const btnBase = "font-mono text-[10px] rounded-lg border px-2.5 py-1 transition-colors";
  const btnStyle = { borderColor: "var(--color-outline)", color: "var(--color-foreground-subtle)" };
  const btnActiveStyle = { borderColor: "var(--color-accent-25)", color: "var(--color-accent)", background: "var(--color-accent-12)" };

  return (
    <div className="rounded-xl border border-outline bg-panel overflow-hidden">
      <div className="px-4 py-3 border-b border-outline flex items-center justify-between">
        <p className="font-mono text-[10px] text-foreground-subtle uppercase tracking-wider">Trajetória de Simulação</p>
        <span className="font-mono text-[9px] text-foreground-subtle opacity-50">{topologyFile} + trajectory.dcd</span>
      </div>
      <div className="relative" style={{ height: 480, background: "#0d0d0d" }}>
        <div ref={containerRef} className="absolute inset-0" />
        {status === "loading" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
            <Spinner style={{ width: 22, height: 22, borderWidth: 2 }} />
            <span className="font-mono text-[10px] text-foreground-subtle">Carregando trajetória…</span>
          </div>
        )}
        {status === "error" && (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="font-mono text-[11px] text-foreground-subtle opacity-60">Não foi possível carregar a trajetória. Verifique o console.</span>
          </div>
        )}
      </div>
      {status === "ready" && (
        <div className="px-4 py-3 border-t border-outline flex items-center gap-3 flex-wrap">
          <button onClick={togglePlay} className={btnBase} style={playing ? btnActiveStyle : btnStyle}>
            {playing ? "⏸ Pausar" : "▶ Play"}
          </button>
          <input type="range" min={0} max={Math.max(totalFrames - 1, 0)} value={frame}
            onChange={(e) => goToFrame(Number(e.target.value))} className="flex-1"
            style={{ accentColor: "var(--color-accent)", minWidth: 120 }} />
          <span className="font-mono text-[10px] text-foreground-subtle whitespace-nowrap">{frame + 1} / {totalFrames}</span>
          <div className="flex items-center gap-1.5 ml-auto">
            <span className="font-mono text-[9px] text-foreground-subtle opacity-60">Vel.</span>
            {([160, 80, 40, 16] as const).map((ms) => {
              const labels: Record<number, string> = { 160: "0.5×", 80: "1×", 40: "2×", 16: "5×" };
              return <button key={ms} onClick={() => setSpeed(ms)} className={btnBase} style={speed === ms ? btnActiveStyle : btnStyle}>{labels[ms]}</button>;
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Download autenticado ──────────────────────────────────────────────────────
function AuthDownloadLink({
  url, filename, token, children, className, style,
}: {
  url: string; filename: string; token: string;
  children: React.ReactNode; className?: string; style?: React.CSSProperties;
}) {
  const blobUrl = useAuthBlobUrl(url, token);
  if (!blobUrl) return (
    <span className={className} style={{ ...style, opacity: 0.4 }}>{children}</span>
  );
  return (
    <a href={blobUrl} download={filename} className={className} style={style}>
      {children}
    </a>
  );
}

// ── Modal de log ──────────────────────────────────────────────────────────────
type LogRow = { step: number; energy: number; temp: number };

function parseLog(text: string): { headers: string[]; rows: LogRow[] } {
  const lines = text.split("\n");
  const headerLine = lines.find((l) => l.startsWith("#")) ?? "";
  const headers = headerLine.replace(/^#/, "").split(",").map((h) => h.replace(/"/g, "").trim());
  const stepIdx  = headers.findIndex((h) => h.toLowerCase() === "step");
  const totalIdx = headers.findIndex((h) => h.toLowerCase().includes("total energy"));
  const tempIdx  = headers.findIndex((h) => h.toLowerCase().includes("temperature"));
  const rows: LogRow[] = [];
  for (const l of lines) {
    if (!l.trim() || l.startsWith("#")) continue;
    const cols = l.split(",");
    const step   = parseFloat(cols[stepIdx]  ?? "");
    const energy = parseFloat(cols[totalIdx] ?? "");
    const temp   = parseFloat(cols[tempIdx]  ?? "");
    if (!isNaN(step)) rows.push({ step, energy, temp });
  }
  return { headers, rows };
}

function Sparkline({ values, color, label, unit }: { values: number[]; color: string; label: string; unit: string }) {
  if (values.length < 2) return null;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const W = 500; const H = 80; const pad = 4;
  const pts = values.map((v, i) => {
    const x = pad + (i / (values.length - 1)) * (W - pad * 2);
    const y = pad + (1 - (v - min) / range) * (H - pad * 2);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(" ");
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-baseline justify-between">
        <span className="font-mono text-[10px] uppercase tracking-wider text-foreground-subtle">{label}</span>
        <span className="font-mono text-[10px] text-foreground-subtle">
          {min.toFixed(1)} – {max.toFixed(1)} {unit}
        </span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full rounded" style={{ height: 72, background: "var(--color-surface-secondary)" }}>
        <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />
      </svg>
    </div>
  );
}

function ReportLogModal({ url, token, onClose }: { url: string; token: string; onClose: () => void }) {
  const [parsed, setParsed] = useState<{ headers: string[]; rows: LogRow[]; allRows: string[][] }>({ headers: [], rows: [], allRows: [] });
  const [tab, setTab]       = useState<"chart" | "table">("chart");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  useEffect(() => {
    if (!url || !token) return;
    fetch(url, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => (r.ok ? r.text() : Promise.reject()))
      .then((t) => {
        const { headers, rows } = parseLog(t);
        const allRows = t.split("\n")
          .filter((l) => l.trim() && !l.startsWith("#"))
          .map((l) => l.split(",").map((c) => c.trim()));
        setParsed({ headers, rows, allRows });
      })
      .catch(() => setParsed({ headers: [], rows: [], allRows: [] }))
      .finally(() => setLoading(false));
  }, [url, token]);

  const { headers, rows, allRows } = parsed;

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.6)" }}
      onClick={onClose}
    >
      <div
        className="relative flex flex-col rounded-2xl border border-outline bg-panel shadow-2xl w-full max-w-2xl max-h-[85vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-outline shrink-0">
          <div className="flex items-center gap-3">
            <span className="font-mono text-[13px] font-semibold text-foreground">Log de Energia</span>
            <div className="flex gap-0.5 rounded-lg border border-outline bg-surface-secondary p-0.5">
              {(["chart", "table"] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTab(t)}
                  className="font-mono text-[10px] px-2.5 py-1 rounded-md transition-colors"
                  style={tab === t
                    ? { background: "var(--color-accent-12)", color: "var(--color-accent)", border: "1px solid var(--color-accent-25)" }
                    : { color: "var(--color-foreground-subtle)", border: "1px solid transparent" }
                  }
                >
                  {t === "chart" ? "Gráfico" : "Tabela"}
                </button>
              ))}
            </div>
          </div>
          <button className="flex h-7 w-7 items-center justify-center rounded-lg hover:bg-surface-secondary transition-colors" onClick={onClose}>
            <CloseIcon size={15} />
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto px-5 py-4 flex-1">
          {loading ? (
            <div className="flex justify-center py-10"><Spinner style={{ width: 24, height: 24, borderWidth: 2.5 }} /></div>
          ) : tab === "chart" ? (
            <div className="flex flex-col gap-5">
              {rows.length < 2 ? (
                <p className="font-mono text-[12px] text-foreground-subtle text-center py-6">
                  Dados insuficientes para gráfico ({rows.length} frames encontrados).
                </p>
              ) : (
                <>
                  <div className="flex flex-col gap-1">
                    <Sparkline values={rows.map((r) => r.energy)} color="var(--color-accent)" label="Energia Total" unit="kJ/mol" />
                    <p className="font-mono text-[10px] text-foreground-subtle leading-relaxed">
                      Soma das energias potencial e cinética. Deve estabilizar após a equilibração, indicando que o sistema atingiu equilíbrio termodinâmico.
                    </p>
                  </div>
                  <div className="flex flex-col gap-1">
                    <Sparkline values={rows.map((r) => r.temp)} color="#f59e0b" label="Temperatura" unit="K" />
                    <p className="font-mono text-[10px] text-foreground-subtle leading-relaxed">
                      Temperatura instantânea do sistema. Deve oscilar em torno da temperatura-alvo ({rows.length > 0 ? `~${Math.round(rows.reduce((a, r) => a + r.temp, 0) / rows.length)} K` : "—"}), confirmando que o termostato está funcionando.
                    </p>
                  </div>
                  <p className="font-mono text-[10px] text-foreground-subtle text-center opacity-60">
                    {rows.length} frames · steps {rows[0]?.step.toLocaleString()} → {rows[rows.length - 1]?.step.toLocaleString()}
                  </p>
                </>
              )}
            </div>
          ) : (
            /* Tabela */
            allRows.length === 0 ? (
              <p className="font-mono text-[12px] text-foreground-subtle text-center py-6">Nenhum dado encontrado.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-outline">
                      {headers.map((h, i) => (
                        <th key={i} className="font-mono text-[9px] uppercase tracking-wider text-foreground-subtle py-2 pr-4 whitespace-nowrap">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {allRows.map((row, ri) => (
                      <tr key={ri} className="border-b border-outline last:border-0 hover:bg-surface-secondary transition-colors">
                        {row.map((cell, ci) => (
                          <td key={ci} className="font-mono text-[10px] text-foreground py-1.5 pr-4 whitespace-nowrap">
                            {isNaN(Number(cell)) ? cell : Number(cell).toLocaleString("pt-BR", { maximumFractionDigits: 3 })}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
}

// ── Arquivos da simulação (PDB + log) ─────────────────────────────────────────
function SimulationFilesSection({
  job, outputFiles, token,
}: {
  job: MDJobModel | null;
  outputFiles: string[];
  token: string;
}) {
  const [logOpen, setLogOpen] = useState(false);
  const pdbFiles  = outputFiles.filter((f) => f.endsWith(".pdb"));
  const hasLog    = outputFiles.includes("report.log");
  if (!pdbFiles.length && !hasLog) return null;

  const fileUrl = (filename: string) =>
    `/api/molecular-dynamics/job/${job?.id}/download/${encodeURIComponent(filename)}`;

  return (
    <>
      {logOpen && job && (
        <ReportLogModal url={fileUrl("report.log")} token={token} onClose={() => setLogOpen(false)} />
      )}
      <div className="rounded-xl border border-outline bg-panel px-4 py-3 flex flex-col gap-3">
        <p className="font-mono text-[10px] text-foreground-subtle uppercase tracking-wider">
          Estruturas da Simulação
        </p>
        <div className="flex flex-wrap gap-2">
          {pdbFiles.map((f) => (
            <AuthDownloadLink
              key={f}
              url={fileUrl(f)}
              filename={f}
              token={token}
              className="font-mono text-[11px] rounded-lg border px-3 py-1.5 transition-colors hover:bg-surface-secondary flex items-center gap-1.5 cursor-pointer no-underline"
              style={{ borderColor: "var(--color-outline)", color: "var(--color-foreground-subtle)" }}
            >
              ↓ {f}
            </AuthDownloadLink>
          ))}
          {hasLog && (
            <button
              onClick={() => setLogOpen(true)}
              className="font-mono text-[11px] rounded-lg border px-3 py-1.5 transition-colors hover:bg-surface-secondary flex items-center gap-1.5"
              style={{ borderColor: "var(--color-outline)", color: "var(--color-foreground-subtle)" }}
            >
              ≡ report.log
            </button>
          )}
        </div>
      </div>
    </>
  );
}

// ── Lightbox ──────────────────────────────────────────────────────────────────
function ImageLightbox({ src, alt, onClose }: { src: string; alt: string; onClose: () => void }) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-6"
      style={{ background: "rgba(0,0,0,0.85)" }}
      onClick={onClose}
    >
      <button
        className="absolute top-4 right-4 flex h-9 w-9 items-center justify-center rounded-full bg-surface-secondary border border-outline hover:bg-panel transition-colors"
        onClick={onClose}
      >
        <CloseIcon size={16} />
      </button>
      <img
        src={src} alt={alt}
        className="max-w-full max-h-full rounded-xl shadow-2xl"
        style={{ objectFit: "contain" }}
        onClick={(e) => e.stopPropagation()}
      />
    </div>
  );
}

// ── Modal de parâmetros ───────────────────────────────────────────────────────
function ParamsModal({ params, onClose }: { params: MDParamsModel; onClose: () => void }) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  const Row = ({ label, value }: { label: string; value: React.ReactNode }) => (
    <div className="flex items-start gap-2 py-1.5 border-b border-outline last:border-0">
      <span className="font-mono text-[10px] text-foreground-subtle w-[160px] shrink-0 pt-0.5 uppercase tracking-wide">{label}</span>
      <span className="font-mono text-[11px] text-foreground">{String(value ?? "—")}</span>
    </div>
  );

  const Group = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <div className="flex flex-col gap-0">
      <p className="font-mono text-[9px] uppercase tracking-widest text-foreground-subtle mb-1 mt-3 first:mt-0">{title}</p>
      <div className="rounded-lg border border-outline bg-surface-secondary px-3">{children}</div>
    </div>
  );

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.6)" }}
      onClick={onClose}
    >
      <div
        className="relative flex flex-col rounded-2xl border border-outline bg-panel shadow-2xl w-full max-w-lg max-h-[85vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-outline shrink-0">
          <span className="font-mono text-[13px] font-semibold text-foreground">Parâmetros da Simulação</span>
          <button className="flex h-7 w-7 items-center justify-center rounded-lg hover:bg-surface-secondary transition-colors" onClick={onClose}>
            <CloseIcon size={15} />
          </button>
        </div>
        <div className="overflow-y-auto px-5 py-4 flex flex-col gap-1">
          <Group title="Preparação do Sistema">
            <Row label="pH" value={params.ph_value} />
            <Row label="Temperatura (K)" value={params.simulation_temperature} />
            <Row label="Padding caixa (nm)" value={params.padding_value} />
            <Row label="Forma da caixa" value={params.box_shape} />
            <Row label="Modelo de água" value={params.water_model} />
            <Row label="Conc. iônica (M)" value={params.ionic_strength} />
            <Row label="Neutralizar" value={params.neutralize ? "sim" : "não"} />
            <Row label="Solvatação" value={params.solvatation ? "sim" : "não"} />
            <Row label="Manter água cristal" value={params.receptor_keepWater ? "sim" : "não"} />
          </Group>
          <Group title="Campo de Força">
            <Row label="Proteína" value={params.protein_forcefield} />
            <Row label="Solvente" value={params.solvent_forcefield} />
            <Row label="Ligante" value={params.ligand_forcefield} />
            <Row label="Restrições" value={params.constraints} />
            <Row label="Cutoff (nm)" value={params.nonbondedCutoff} />
            <Row label="Água rígida" value={params.rigidWater ? "sim" : "não"} />
            <Row label="Fronteiras periódicas" value={params.use_periodic_boundary ? "sim" : "não"} />
            <Row label="Correção dispersão" value={params.useDispersionCorrection ? "sim" : "não"} />
            <Row label="HMR" value={params.use_HMR ? "sim" : "não"} />
            <Row label="Massa hidrogênio" value={params.hydrogenMass ?? "—"} />
          </Group>
          <Group title="Barostato">
            <Row label="Pressão (bar)" value={params.barostat_pressure} />
            <Row label="Frequência (passos)" value={params.barostat_frequency} />
          </Group>
          <Group title="Simulação">
            <Row label="Passo integração (fs)" value={params.integration_step} />
            <Row label="Coef. fricção (1/ps)" value={params.friction_coeff} />
            <Row label="Passos equil." value={params.equilibration_duration_steps} />
            <Row label="Produção (ns)" value={params.production_duration_ns} />
            <Row label="Intervalo relatório" value={params.reporting_interval_steps} />
            <Row label="Intervalo checkpoint" value={params.checkpoint_interval_steps} />
            <Row label="Seed" value={params.seed} />
          </Group>
          <Group title="Hardware">
            <Row label="Plataforma" value={params.platform_name} />
          </Group>
          {params.externalForce_constrain_kJ != null && (
            <Group title="Restrições de Posição">
              <Row label="Força (kJ/mol/nm²)" value={params.externalForce_constrain_kJ} />
              <Row label="Átomos-alvo" value={params.restraint_target_atoms.join(", ")} />
              <Row label="Eixos" value={params.restraint_axes.join(", ")} />
            </Group>
          )}
        </div>
      </div>
    </div>
  );
}

function JobHistoryCard({
  job,
  onClick,
  onDelete,
}: {
  job: MDJobModel;
  onClick: () => void;
  onDelete: () => void;
}) {
  const utcStr = job.created_at.endsWith("Z") || job.created_at.includes("+") ? job.created_at : job.created_at + "Z";
  const date = new Date(utcStr).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
  const statusColor =
    job.status === "done"
      ? "var(--color-green)"
      : job.status === "error"
        ? "var(--color-red)"
        : "var(--color-accent)";
  const statusLabel =
    job.status === "done" ? "concluído" : job.status === "error" ? "erro" : "em andamento";

  return (
    <div className="relative">
      <button
        type="button"
        onClick={onClick}
        className="w-full text-left rounded-lg border border-outline p-3 transition-all hover:border-outline-strong hover:bg-panel"
      >
        <div className="flex items-center gap-2 pr-5">
          <span
            className="h-2 w-2 rounded-full shrink-0"
            style={{ background: statusColor }}
          />
          <span className="font-mono text-[12px] text-foreground truncate flex-1">
            {job.molecule_id || "—"}{job.target ? ` · ${job.target}` : ""}
          </span>
          <span className="font-mono text-[10px] text-foreground-subtle shrink-0">{date}</span>
        </div>
        <div className="mt-1 flex items-center gap-2">
          <span className="font-mono text-[10px] text-foreground-subtle">
            {job.receptor_filename ?? job.receptor_source}
          </span>
          <span
            className="font-mono text-[10px]"
            style={{ color: statusColor }}
          >
            · {statusLabel}
          </span>
          {job.status === "running" && (
            <Spinner style={{ width: 10, height: 10, borderWidth: 1.5 }} />
          )}
        </div>
      </button>
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); onDelete(); }}
        className="absolute top-1.5 right-1.5 flex items-center justify-center rounded w-6 h-6 font-mono text-[13px] text-foreground-subtle hover:text-foreground transition-colors"
        title="Remover do histórico"
      >
        ×
      </button>
    </div>
  );
}

const INPUT_BASE =
  "w-full rounded-lg border font-mono text-[12px] px-3 py-2 bg-surface-secondary text-foreground focus:outline-none focus:ring-1 transition-colors";
const INPUT_STYLE = { borderColor: "var(--color-outline)" };
const ACCENT_BTN = {
  borderColor: "var(--color-accent-25)",
  color: "var(--color-accent)",
  background: "var(--color-accent-12)",
};

export default function MolecularDynamicsTemplate(props: Props) {
  const {
    mode, job, jobs,
    jobsLoading, onDeleteJob,
    historyPage, historyTotalPages, onHistoryPageChange,
    consensusJobs,
    ligandSource, onLigandSource,
    consensusJobId, onConsensusJobId,
    availableLigantes, ligandFilename, onLigandFilename,
    ligandUploadFile, onLigandUploadFile, ligandUploadPath,
    ligantesError,
    moleculeId, onMoleculeId,
    smiles, onSmiles,
    receptorSource, onReceptorSource,
    availableReceptores, receptorFilename, onReceptorFilename,
    receptorUploadFile, onReceptorUploadFile, receptorUploadPath,
    receptorManualPath, onReceptorManualPath,
    receptorManualFilename, onReceptorManualFilename,
    params, onParam,
    onSubmit, submitting, submitError,
    onCancelar, onNovaSimulacao, onTentarNovamente,
    outputFiles,
    analysisJob, analysisFiles, onIniciarAnalise, analysisError, getAnaliseViewUrl, token,
    handleLogout,
  } = props;

  const navigate = useNavigate();
  const [menuAberto, setMenuAberto] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const [showParams, setShowParams] = useState(false);
  const [lightboxSrc, setLightboxSrc] = useState<{ src: string; alt: string } | null>(null);
  const openLightbox = useCallback((src: string, alt: string) => setLightboxSrc({ src, alt }), []);

  return (
    <div className="min-h-screen bg-surface-primary">
      {showParams && job?.params && (
        <ParamsModal params={job.params} onClose={() => setShowParams(false)} />
      )}
      {lightboxSrc && (
        <ImageLightbox src={lightboxSrc.src} alt={lightboxSrc.alt} onClose={() => setLightboxSrc(null)} />
      )}
      <Navbar>
        <Navbar.Left>
          <button
            type="button"
            onClick={() => navigate("/dinamica-molecular")}
            className="cursor-pointer rounded border-none bg-transparent p-[4px_6px] text-foreground-subtle transition-colors hover:text-foreground"
            title="Voltar"
          >
            <ArrowLeftIcon size={16} />
          </button>
          <button
            type="button"
            onClick={() => navigate("/home")}
            className="cursor-pointer rounded border-none bg-transparent text-[17px] font-medium text-foreground-muted inline-flex items-center gap-1.5 hover:text-foreground transition-colors"
            title="Início"
          >
            <AppLogoIcon size={17} className="text-foreground-muted" />
            DrugHunter<b className="text-foreground font-extrabold">Studio</b>
          </button>
          <span className="ml-1 border-l border-outline pl-3 text-[13px] text-foreground-subtle">
            Din. Molecular
          </span>
        </Navbar.Left>
        <Navbar.Middle>
          <MiddleBar activeModule={null} />
        </Navbar.Middle>
        <Navbar.Right>
          <DropdownMenu
            isOpen={menuAberto}
            menuRef={menuRef}
            onToggle={() => setMenuAberto((v) => !v)}
            trigger={<MenuIcon size={18} />}
          >
            <DropdownMenu.Item icon={<SettingsIcon size={14} />} label="Configurações" onClick={() => navigate("/configuracoes")} />
            <DropdownMenu.Item icon={<HelpIcon size={14} />} label="Ajuda" onClick={() => navigate("/ajuda")} divider />
            <DropdownMenu.Item icon={<LogoutIcon size={14} />} label="Sair" onClick={handleLogout} />
          </DropdownMenu>
        </Navbar.Right>
      </Navbar>

      <main className="mx-auto max-w-3xl px-4 pb-12 pt-6">
        <div className="mb-6">
          <h1 className="font-mono text-[18px] font-bold text-foreground">Dinâmica Molecular</h1>
          <p className="font-mono text-[12px] text-foreground-subtle mt-0.5">
            Simulação de MD via OpenMM · via DrugHunter MDSimulator
          </p>
        </div>

        {/* ── Setup ─────────────────────────────────────────────────────────── */}
        {mode === "setup" && (
          <SetupForm
            ligandSource={ligandSource} onLigandSource={onLigandSource}
            consensusJobs={consensusJobs}
            consensusJobId={consensusJobId} onConsensusJobId={onConsensusJobId}
            availableLigantes={availableLigantes}
            ligandFilename={ligandFilename} onLigandFilename={onLigandFilename}
            ligandUploadFile={ligandUploadFile} onLigandUploadFile={onLigandUploadFile}
            ligandUploadPath={ligandUploadPath}
            ligantesError={ligantesError}
            moleculeId={moleculeId} onMoleculeId={onMoleculeId}
            smiles={smiles} onSmiles={onSmiles}
            receptorSource={receptorSource} onReceptorSource={onReceptorSource}
            availableReceptores={availableReceptores}
            receptorFilename={receptorFilename} onReceptorFilename={onReceptorFilename}
            receptorUploadFile={receptorUploadFile} onReceptorUploadFile={onReceptorUploadFile}
            receptorUploadPath={receptorUploadPath}
            receptorManualPath={receptorManualPath} onReceptorManualPath={onReceptorManualPath}
            receptorManualFilename={receptorManualFilename} onReceptorManualFilename={onReceptorManualFilename}
            params={params} onParam={onParam}
            onSubmit={onSubmit} submitting={submitting} submitError={submitError}
          />
        )}

        {/* ── Histórico (setup sem jobId) ────────────────────────────────────── */}
        {mode === "setup" && (
          <section className="flex flex-col gap-3 mt-4">
            <span className="font-mono text-[11px] uppercase tracking-widest text-foreground-subtle">
              Histórico
            </span>
            {jobsLoading ? (
              <div className="flex justify-center py-6">
                <Spinner style={{ width: 20, height: 20, borderWidth: 2 }} />
              </div>
            ) : jobs.length === 0 ? (
              <span className="font-mono text-[12px] text-foreground-subtle italic">
                Nenhuma simulação salva.
              </span>
            ) : (
              <div className="flex flex-col gap-2">
                {jobs.slice((historyPage - 1) * 8, historyPage * 8).map((j) => (
                  <JobHistoryCard
                    key={j.id}
                    job={j}
                    onClick={() => navigate(`/dinamica-molecular/${j.id}`)}
                    onDelete={() => onDeleteJob(j.id)}
                  />
                ))}
                {historyTotalPages > 1 && (
                  <div className="flex items-center justify-between mt-2">
                    <button
                      type="button"
                      onClick={() => onHistoryPageChange(historyPage - 1)}
                      disabled={historyPage === 1}
                      className="cursor-pointer rounded border border-outline px-2 py-0.5 font-mono text-[11px] text-foreground-subtle hover:text-foreground transition-colors disabled:opacity-30"
                    >
                      ←
                    </button>
                    <span className="font-mono text-[11px] text-foreground-subtle">
                      {historyPage}/{historyTotalPages}
                    </span>
                    <button
                      type="button"
                      onClick={() => onHistoryPageChange(historyPage + 1)}
                      disabled={historyPage === historyTotalPages}
                      className="cursor-pointer rounded border border-outline px-2 py-0.5 font-mono text-[11px] text-foreground-subtle hover:text-foreground transition-colors disabled:opacity-30"
                    >
                      →
                    </button>
                  </div>
                )}
              </div>
            )}
          </section>
        )}

        {/* ── Running ───────────────────────────────────────────────────────── */}
        {mode === "running" && (
          <div className="flex flex-col items-center justify-center gap-5 min-h-[60vh] text-center">
            <Spinner style={{ width: 40, height: 40, borderWidth: 3 }} />
            <div className="flex flex-col gap-1">
              <p className="font-mono text-[14px] font-semibold text-foreground">
                Simulação em Andamento
              </p>
              <p className="font-mono text-[12px] text-foreground-subtle max-w-md">
                {job?.molecule_id && job?.target
                  ? `Simulando "${job.molecule_id}" no receptor ${job.target}...`
                  : "Processando dinâmica molecular..."}
              </p>
              <p className="font-mono text-[11px] text-foreground-subtle opacity-60 mt-1 max-w-md">
                Simulações de MD podem levar horas. Você pode fechar a página — o processamento continua no servidor.
              </p>
            </div>
            <button
              onClick={onCancelar}
              className="font-mono text-[12px] rounded-lg border px-4 py-2 transition-colors hover:bg-surface-secondary"
              style={{ borderColor: "var(--color-outline)", color: "var(--color-foreground-subtle)" }}
            >
              Cancelar
            </button>
          </div>
        )}

        {/* ── Done ──────────────────────────────────────────────────────────── */}
        {mode === "done" && (
          <div className="flex flex-col gap-4">
            {/* Header — cards no padrão do projeto */}
            <div className="flex gap-3 flex-wrap items-start">
              {job?.molecule_id && (
                <div className="rounded-xl border border-outline bg-panel px-4 py-3">
                  <p className="font-mono text-[10px] text-foreground-subtle uppercase tracking-wider">Molécula</p>
                  <p className="font-mono text-[14px] font-bold text-foreground">{job.molecule_id}</p>
                </div>
              )}
              {job?.target && (
                <div className="rounded-xl border border-outline bg-panel px-4 py-3">
                  <p className="font-mono text-[10px] text-foreground-subtle uppercase tracking-wider">Alvo</p>
                  <p className="font-mono text-[14px] font-bold text-foreground">{job.target}</p>
                </div>
              )}
              {job?.params && (
                <div className="ml-auto flex items-center self-center">
                  <button
                    onClick={() => setShowParams(true)}
                    className="font-mono text-[11px] rounded-lg border px-3 py-1.5 transition-colors hover:bg-surface-secondary flex items-center gap-1.5"
                    style={{ borderColor: "var(--color-outline)", color: "var(--color-foreground-subtle)" }}
                  >
                    <SettingsIcon size={12} />
                    Parâmetros
                  </button>
                </div>
              )}
            </div>

            {/* Status + path */}
            <div className="rounded-xl border px-4 py-3 flex flex-col gap-2" style={{ borderColor: "var(--color-accent-25)", background: "var(--color-accent-12)" }}>
              <div className="flex items-center gap-2">
                <span className="font-mono text-[12px] font-semibold" style={{ color: "var(--color-accent)" }}>
                  ✓ Simulação concluída
                </span>
              </div>
              {(job?.output_path_absolute || job?.base_output_path) && (
                <p className="font-mono text-[11px] text-foreground-subtle break-all">
                  {job?.output_path_absolute ?? job?.base_output_path}
                </p>
              )}
            </div>

            {/* Avisos não-fatais do worker (ex: fallback de cargas AM1-BCC) */}
            {job?.warnings && job.warnings.length > 0 && (
              <div
                className="rounded-xl border px-4 py-3 flex flex-col gap-2"
                style={{ borderColor: "rgba(234,179,8,0.35)", background: "rgba(234,179,8,0.08)" }}
              >
                <span className="font-mono text-[11px] font-bold uppercase tracking-wider" style={{ color: "#b45309" }}>
                  ⚠ Aviso da simulação
                </span>
                {job.warnings.map((w, i) => (
                  <p key={i} className="font-mono text-[11px]" style={{ color: "#92400e" }}>
                    {w}
                  </p>
                ))}
                <p className="font-mono text-[10px]" style={{ color: "#b45309", opacity: 0.8 }}>
                  Consulte a página de <a href="/ajuda" className="underline">Ajuda</a> para instruções de instalação do AmberTools e Open Babel.
                </p>
              </div>
            )}

            {/* Arquivos */}
            {outputFiles.length > 0 && (
              <div className="rounded-xl border border-outline bg-panel px-4 py-3">
                <p className="font-mono text-[10px] text-foreground-subtle uppercase tracking-wider mb-1.5">
                  Arquivos gerados ({outputFiles.length})
                </p>
                <p className="font-mono text-[11px] text-foreground-subtle leading-relaxed">
                  {outputFiles.join("  ·  ")}
                </p>
              </div>
            )}

            <SimulationFilesSection job={job} outputFiles={outputFiles} token={token} />

            {analysisError && (
              <p className="font-mono text-[12px] text-red-400">{analysisError}</p>
            )}

            <button
              onClick={onIniciarAnalise}
              className="font-mono text-[13px] font-semibold rounded-xl border px-5 py-3 transition-all hover:opacity-80 self-start"
              style={ACCENT_BTN}
            >
              Iniciar Análise →
            </button>
          </div>
        )}

        {/* ── Analysing ─────────────────────────────────────────────────────── */}
        {mode === "analysing" && (
          <div className="flex flex-col items-center justify-center gap-5 min-h-[60vh] text-center">
            <Spinner style={{ width: 40, height: 40, borderWidth: 3 }} />
            <div className="flex flex-col gap-1">
              <p className="font-mono text-[14px] font-semibold text-foreground">
                Análise em Andamento
              </p>
              <p className="font-mono text-[12px] text-foreground-subtle max-w-md">
                {job?.molecule_id && job?.target
                  ? `Analisando "${job.molecule_id}" · ${job.target}...`
                  : "Processando análise de dinâmica molecular..."}
              </p>
              <p className="font-mono text-[11px] text-foreground-subtle opacity-60 mt-1 max-w-md">
                A análise pode levar alguns minutos. Você pode fechar a página — o processamento continua no servidor.
              </p>
            </div>
          </div>
        )}

        {/* ── Analysis Done ─────────────────────────────────────────────────── */}
        {mode === "analysis_done" && (
          <div className="flex flex-col gap-4">
            {/* Header — cards no padrão do projeto */}
            <div className="flex gap-3 flex-wrap items-start">
              {job?.molecule_id && (
                <div className="rounded-xl border border-outline bg-panel px-4 py-3">
                  <p className="font-mono text-[10px] text-foreground-subtle uppercase tracking-wider">Molécula</p>
                  <p className="font-mono text-[14px] font-bold text-foreground">{job.molecule_id}</p>
                </div>
              )}
              {job?.target && (
                <div className="rounded-xl border border-outline bg-panel px-4 py-3">
                  <p className="font-mono text-[10px] text-foreground-subtle uppercase tracking-wider">Alvo</p>
                  <p className="font-mono text-[14px] font-bold text-foreground">{job.target}</p>
                </div>
              )}
              <div className="ml-auto flex items-center gap-2 self-center">
                {job?.params && (
                  <button
                    onClick={() => setShowParams(true)}
                    className="font-mono text-[11px] rounded-lg border px-3 py-1.5 transition-colors hover:bg-surface-secondary flex items-center gap-1.5"
                    style={{ borderColor: "var(--color-outline)", color: "var(--color-foreground-subtle)" }}
                  >
                    <SettingsIcon size={12} />
                    Parâmetros
                  </button>
                )}
                <button
                  onClick={onIniciarAnalise}
                  className="font-mono text-[11px] rounded-lg border px-3 py-1.5 transition-colors hover:bg-surface-secondary flex items-center gap-1.5"
                  style={{ borderColor: "var(--color-outline)", color: "var(--color-foreground-subtle)" }}
                >
                  ↻ Reanalisar
                </button>
              </div>
            </div>

            {/* Status + path */}
            <div className="rounded-xl border px-4 py-3 flex flex-col gap-2" style={{ borderColor: "var(--color-accent-25)", background: "var(--color-accent-12)" }}>
              <span className="font-mono text-[12px] font-semibold" style={{ color: "var(--color-accent)" }}>
                ✓ Simulação e análise concluídas
              </span>
              {(job?.output_path_absolute || job?.base_output_path) && (
                <p className="font-mono text-[11px] text-foreground-subtle break-all">
                  {job?.output_path_absolute ?? job?.base_output_path}
                </p>
              )}
            </div>

            {/* Estruturas da simulação (PDB + log) */}
            <SimulationFilesSection job={job} outputFiles={outputFiles} token={token} />

            {/* Visualizador de trajetória 3D */}
            {outputFiles.includes("trajectory.dcd") && (() => {
              const pdbFiles = outputFiles.filter((f) => f.endsWith(".pdb"));
              const topology = pdbFiles.find((f) => f.includes("complex_min")) ?? pdbFiles[0];
              if (!topology || !job?.id) return null;
              return <TrajectoryViewer jobId={job.id} token={token} topologyFile={topology} />;
            })()}

            {/* Gráficos em grid 2 colunas */}
            {(() => {
              const pngs = analysisFiles.analysis.filter((f) => f.endsWith(".png"));
              if (!pngs.length) return null;
              return (
                <div className="rounded-xl border border-outline bg-panel overflow-hidden">
                  <div className="px-4 py-3 border-b border-outline">
                    <p className="font-mono text-[10px] text-foreground-subtle uppercase tracking-wider">
                      Gráficos de Trajetória
                    </p>
                  </div>
                  <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {pngs.map((f) => {
                      const label = f
                        .replace(/^complex_min_/, "")
                        .replace(/\.png$/, "")
                        .replace(/_/g, " ")
                        .toUpperCase();
                      return (
                        <div key={f} className="flex flex-col gap-1.5">
                          <p className="font-mono text-[9px] uppercase tracking-widest text-foreground-subtle">{label}</p>
                          <AuthImg
                            src={getAnaliseViewUrl("analysis", f)}
                            token={token}
                            alt={label}
                            className="w-full rounded-lg border border-outline cursor-zoom-in transition-opacity hover:opacity-90"
                            style={{ objectFit: "contain", background: "var(--color-surface-secondary)", maxHeight: 220 }}
                            onClick={(blobUrl) => openLightbox(blobUrl, label)}
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })()}

            {/* Visualização 3D */}
            {(() => {
              const htmlFiles = analysisFiles.visualization.filter((f) => f.endsWith(".html") || f.endsWith(".htm"));
              if (!htmlFiles.length) return null;
              return (
                <div className="rounded-xl border border-outline bg-panel overflow-hidden">
                  <div className="px-4 py-3 border-b border-outline flex items-center justify-between flex-wrap gap-2">
                    <p className="font-mono text-[10px] text-foreground-subtle uppercase tracking-wider">
                      Visualização 3D Interativa
                    </p>
                    <div className="flex items-center gap-3">
                      {htmlFiles.map((f) => (
                        <AuthNewTabLink
                          key={f}
                          src={getAnaliseViewUrl("visualization", f)}
                          token={token}
                          label={htmlFiles.length === 1 ? "Abrir em nova aba" : f}
                        />
                      ))}
                    </div>
                  </div>
                  <div className="p-4 flex flex-col gap-3">
                    {htmlFiles.map((f) => (
                      <AuthIframe
                        key={f}
                        src={getAnaliseViewUrl("visualization", f)}
                        token={token}
                        title={f}
                        style={{ height: 520 }}
                      />
                    ))}
                  </div>
                </div>
              );
            })()}

            {/* Arquivos gerados (colapsável) */}
            <details className="rounded-xl border border-outline bg-panel overflow-hidden">
              <summary className="px-4 py-3 cursor-pointer font-mono text-[10px] uppercase tracking-wider text-foreground-subtle hover:text-foreground transition-colors list-none flex items-center justify-between select-none">
                <span>Arquivos gerados</span>
                <span className="text-[14px] opacity-50">›</span>
              </summary>
              <div className="border-t border-outline px-4 py-4 flex flex-col gap-4">
                {outputFiles.length > 0 && (
                  <div className="flex flex-col gap-1.5">
                    <p className="font-mono text-[11px] font-semibold text-foreground">Simulação</p>
                    <p className="font-mono text-[10px] text-foreground-subtle mb-1 break-all">
                      {job?.output_path_absolute ?? job?.base_output_path ?? ""}
                    </p>
                    <ul className="flex flex-col gap-0.5">
                      {outputFiles.map((f) => (
                        <li key={f} className="font-mono text-[11px] text-foreground-subtle flex items-center gap-1.5">
                          <span className="opacity-40">–</span> {f}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {analysisFiles.analysis.length > 0 && (
                  <div className="flex flex-col gap-1.5">
                    <p className="font-mono text-[11px] font-semibold text-foreground">Análise</p>
                    <p className="font-mono text-[10px] text-foreground-subtle mb-1 break-all">
                      {job?.output_path_absolute ?? job?.base_output_path ?? ""}analysis/
                    </p>
                    <ul className="flex flex-col gap-0.5">
                      {analysisFiles.analysis.map((f) => (
                        <li key={f} className="font-mono text-[11px] text-foreground-subtle flex items-center gap-1.5">
                          <span className="opacity-40">–</span> {f}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {analysisFiles.visualization.length > 0 && (
                  <div className="flex flex-col gap-1.5">
                    <p className="font-mono text-[11px] font-semibold text-foreground">Visualização</p>
                    <p className="font-mono text-[10px] text-foreground-subtle mb-1 break-all">
                      {job?.output_path_absolute ?? job?.base_output_path ?? ""}visualization/
                    </p>
                    <ul className="flex flex-col gap-0.5">
                      {analysisFiles.visualization.map((f) => (
                        <li key={f} className="font-mono text-[11px] text-foreground-subtle flex items-center gap-1.5">
                          <span className="opacity-40">–</span> {f}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </details>
          </div>
        )}

        {/* ── Analysis Error ────────────────────────────────────────────────── */}
        {mode === "analysis_error" && (
          <div className="flex flex-col gap-4">
            <div className="rounded-xl border border-red-400/30 bg-red-500/10 px-4 py-4">
              <p className="font-mono text-[13px] font-semibold text-red-400 mb-1">Erro na análise</p>
              <p className="font-mono text-[12px] text-red-400/80">
                {analysisJob?.error_msg ?? "Ocorreu um erro durante a análise."}
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={onIniciarAnalise}
                className="font-mono text-[12px] rounded-xl border px-4 py-3 font-semibold transition-all hover:opacity-80"
                style={ACCENT_BTN}
              >
                Tentar novamente
              </button>
              <button
                onClick={onNovaSimulacao}
                className="font-mono text-[12px] rounded-xl border px-4 py-3 transition-colors hover:bg-surface-secondary"
                style={{ borderColor: "var(--color-outline)", color: "var(--color-foreground-subtle)" }}
              >
                Nova Simulação
              </button>
            </div>
          </div>
        )}

        {/* ── Error ─────────────────────────────────────────────────────────── */}
        {mode === "error" && (
          <div className="flex flex-col gap-4">
            <div className="rounded-xl border border-red-400/30 bg-red-500/10 px-4 py-4 flex items-start justify-between gap-4">
              <div>
                <p className="font-mono text-[13px] font-semibold text-red-400 mb-1">Erro na simulação</p>
                <p className="font-mono text-[12px] text-red-400/80">
                  {job?.error_msg ?? "Ocorreu um erro durante a dinâmica molecular."}
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={onTentarNovamente}
                className="font-mono text-[12px] rounded-xl border px-4 py-3 font-semibold transition-all hover:opacity-80"
                style={ACCENT_BTN}
              >
                Tentar novamente
              </button>
              <button
                onClick={onNovaSimulacao}
                className="font-mono text-[12px] rounded-xl border px-4 py-3 transition-colors hover:bg-surface-secondary"
                style={{ borderColor: "var(--color-outline)", color: "var(--color-foreground-subtle)" }}
              >
                Nova Simulação
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

// ── SetupForm ─────────────────────────────────────────────────────────────────

interface SetupFormProps {
  ligandSource: "consensus" | "upload";
  onLigandSource: (v: "consensus" | "upload") => void;
  consensusJobs: import("../../domain/models/molecular_dynamics.model").MDConsensusJobOption[];
  consensusJobId: number | null;
  onConsensusJobId: (v: number | null) => void;
  availableLigantes: { filename: string; label: string }[];
  ligandFilename: string;
  onLigandFilename: (v: string) => void;
  ligandUploadFile: File | null;
  onLigandUploadFile: (f: File | null) => void;
  ligandUploadPath: string;
  ligantesError: string;
  moleculeId: string;
  onMoleculeId: (v: string) => void;
  smiles: string;
  onSmiles: (v: string) => void;
  receptorSource: "dh_prepared" | "upload" | "manual";
  onReceptorSource: (v: "dh_prepared" | "upload" | "manual") => void;
  availableReceptores: { filename: string }[];
  receptorFilename: string;
  onReceptorFilename: (v: string) => void;
  receptorUploadFile: File | null;
  onReceptorUploadFile: (f: File | null) => void;
  receptorUploadPath: string;
  receptorManualPath: string;
  onReceptorManualPath: (v: string) => void;
  receptorManualFilename: string;
  onReceptorManualFilename: (v: string) => void;
  params: import("../../domain/models/molecular_dynamics.model").MDParamsModel;
  onParam: <K extends keyof import("../../domain/models/molecular_dynamics.model").MDParamsModel>(
    key: K,
    value: import("../../domain/models/molecular_dynamics.model").MDParamsModel[K],
  ) => void;
  onSubmit: () => Promise<void>;
  submitting: boolean;
  submitError: string;
}

function SetupForm({
  ligandSource, onLigandSource,
  consensusJobs,
  consensusJobId, onConsensusJobId,
  availableLigantes, ligandFilename, onLigandFilename,
  ligandUploadFile, onLigandUploadFile, ligandUploadPath,
  ligantesError,
  moleculeId, onMoleculeId,
  smiles, onSmiles,
  receptorSource, onReceptorSource,
  availableReceptores, receptorFilename, onReceptorFilename,
  receptorUploadFile, onReceptorUploadFile, receptorUploadPath,
  receptorManualPath, onReceptorManualPath,
  receptorManualFilename, onReceptorManualFilename,
  params, onParam,
  onSubmit, submitting, submitError,
}: SetupFormProps) {
  return (
    <div className="flex flex-col gap-5">

      {/* ── Identificação da molécula ─────────────────────────────────────── */}
      <div className="rounded-xl border border-outline bg-panel px-5 py-5 flex flex-col gap-4">
        <p className="font-mono text-[10px] text-foreground-subtle uppercase tracking-wider">Identificação da Molécula</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="ID da molécula" hint="nome ou código">
            <input
              className={INPUT_BASE}
              style={INPUT_STYLE}
              value={moleculeId}
              onChange={(e) => onMoleculeId(e.target.value)}
              placeholder="ZINC12345 ou Molécula A"
            />
          </Field>
          <Field label="SMILES" hint="opcional, para referência">
            <input
              className={INPUT_BASE}
              style={INPUT_STYLE}
              value={smiles}
              onChange={(e) => onSmiles(e.target.value)}
              placeholder="CC(=O)Oc1ccccc1C(=O)O"
            />
          </Field>
        </div>
      </div>

      {/* ── Ligante ───────────────────────────────────────────────────────── */}
      <div className="rounded-xl border border-outline bg-panel px-5 py-5 flex flex-col gap-4">
        <div className="flex items-center gap-3">
          <p className="font-mono text-[10px] text-foreground-subtle uppercase tracking-wider">Ligante</p>
          <ToggleGroup
            value={ligandSource}
            options={[
              { value: "consensus", label: "Consenso" },
              { value: "upload", label: "Upload" },
            ]}
            onChange={onLigandSource as (v: string) => void}
          />
        </div>

        {ligandSource === "consensus" ? (
          <div className="flex flex-col gap-3">
            <div
              className="rounded-lg border px-3 py-2 font-mono text-[11px] text-foreground-subtle leading-relaxed"
              style={{ borderColor: "var(--color-accent-25)", background: "var(--color-accent-12)" }}
            >
              Utiliza o arquivo .mol2 com a pose gerada pelo docking de consenso.
            </div>
            <Field label="Job de consenso">
              {consensusJobs.length === 0 ? (
                <p className="font-mono text-[11px] text-foreground-subtle opacity-60">
                  Nenhum consenso concluído encontrado. Execute um consenso primeiro ou use Upload.
                </p>
              ) : (
                <select
                  className={INPUT_BASE}
                  style={INPUT_STYLE}
                  value={consensusJobId ?? ""}
                  onChange={(e) => {
                    const n = parseInt(e.target.value, 10);
                    onConsensusJobId(isNaN(n) ? null : n);
                  }}
                >
                  <option value="">— selecione o consenso —</option>
                  {consensusJobs.map((j) => {
                    const data = j.criado_em
                      ? new Date(j.criado_em).toLocaleDateString("pt-BR")
                      : "";
                    return (
                      <option key={j.id} value={j.id}>
                        {j.target}{data ? ` · ${data}` : ""} (#{j.id})
                      </option>
                    );
                  })}
                </select>
              )}
            </Field>
            {ligantesError && consensusJobId != null && (
              <div
                className="rounded-lg border px-3 py-2 font-mono text-[11px] leading-relaxed"
                style={{ borderColor: "var(--color-error-border, #f87171)", background: "var(--color-error-bg, #fff1f1)", color: "var(--color-error-text, #b91c1c)" }}
              >
                {ligantesError}
              </div>
            )}
            {!ligantesError && availableLigantes.length > 0 ? (
              <Field label="Ligante (mol2)">
                <select
                  className={INPUT_BASE}
                  style={INPUT_STYLE}
                  value={ligandFilename}
                  onChange={(e) => onLigandFilename(e.target.value)}
                >
                  <option value="">— selecione —</option>
                  {availableLigantes.map((l) => (
                    <option key={l.filename} value={l.filename}>{l.label || l.filename}</option>
                  ))}
                </select>
              </Field>
            ) : (
              !ligantesError && consensusJobId != null && (
                <p className="font-mono text-[11px] text-foreground-subtle opacity-60">
                  Nenhum ligante .mol2 encontrado para esse job de consenso.
                </p>
              )
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <div
              className="rounded-lg border px-3 py-2 font-mono text-[11px] text-foreground-subtle leading-relaxed"
              style={{ borderColor: "var(--color-accent-25)", background: "var(--color-accent-12)" }}
            >
              Envie um arquivo .mol2 ou .pdb contendo o ligante com coordenadas 3D na pose de ligação.
            </div>
            <Field label="Arquivo do ligante (.mol2 ou .pdb)">
              <input
                type="file"
                accept=".mol2,.pdb"
                className="font-mono text-[12px] file:mr-3 file:cursor-pointer file:rounded-lg file:border file:border-outline file:bg-surface-secondary file:px-3 file:py-1.5 file:font-mono file:text-[11px] file:text-foreground-subtle"
                onChange={(e) => onLigandUploadFile(e.target.files?.[0] ?? null)}
              />
            </Field>
            {ligandUploadFile && !ligandUploadPath && (
              <div className="flex items-center gap-2 font-mono text-[11px] text-foreground-subtle">
                <Spinner style={{ width: 12, height: 12, borderWidth: 2 }} />
                Enviando...
              </div>
            )}
            {ligandUploadPath && (
              <p className="font-mono text-[11px] text-foreground-subtle opacity-60">
                ✓ {ligandUploadFile?.name}
              </p>
            )}
          </div>
        )}
      </div>

      {/* ── Receptor ──────────────────────────────────────────────────────── */}
      <div className="rounded-xl border border-outline bg-panel px-5 py-5 flex flex-col gap-4">
        <div className="flex items-center gap-3">
          <p className="font-mono text-[10px] text-foreground-subtle uppercase tracking-wider">Receptor</p>
          <ToggleGroup
            value={receptorSource}
            options={[
              { value: "dh_prepared", label: "Do consenso" },
              { value: "upload", label: "Upload" },
              { value: "manual", label: "Caminho manual" },
            ]}
            onChange={onReceptorSource as (v: string) => void}
          />
        </div>

        {receptorSource === "dh_prepared" && (
          <div className="flex flex-col gap-3">
            <div
              className="rounded-lg border px-3 py-2 font-mono text-[11px] text-foreground-subtle leading-relaxed"
              style={{ borderColor: "var(--color-accent-25)", background: "var(--color-accent-12)" }}
            >
              Usa o receptor preparado em <code className="text-[10px]">datasets/PDB/&#123;target&#125;/Prepared/</code>.
              O alvo é derivado automaticamente do job de consenso selecionado.
            </div>
            {availableReceptores.length > 0 ? (
              <Field label="Receptor (.pdb preparado)">
                <select
                  className={INPUT_BASE}
                  style={INPUT_STYLE}
                  value={receptorFilename}
                  onChange={(e) => onReceptorFilename(e.target.value)}
                >
                  <option value="">— selecione —</option>
                  {availableReceptores.map((r) => (
                    <option key={r.filename} value={r.filename}>{r.filename}</option>
                  ))}
                </select>
              </Field>
            ) : (
              <p className="font-mono text-[11px] text-foreground-subtle opacity-60">
                {consensusJobId != null
                  ? "Nenhum receptor .pdb encontrado para esse alvo."
                  : "Selecione um job de consenso na seção Ligante."}
              </p>
            )}
          </div>
        )}

        {receptorSource === "upload" && (
          <div className="flex flex-col gap-3">
            <div
              className="rounded-lg border px-3 py-2 font-mono text-[11px] text-foreground-subtle leading-relaxed"
              style={{ borderColor: "var(--color-accent-25)", background: "var(--color-accent-12)" }}
            >
              Envie um arquivo .pdb do receptor preparado (estrutura com hidrogênios e sem ligantes).
            </div>
            <Field label="Arquivo do receptor (.pdb)">
              <input
                type="file"
                accept=".pdb"
                className="font-mono text-[12px] file:mr-3 file:cursor-pointer file:rounded-lg file:border file:border-outline file:bg-surface-secondary file:px-3 file:py-1.5 file:font-mono file:text-[11px] file:text-foreground-subtle"
                onChange={(e) => onReceptorUploadFile(e.target.files?.[0] ?? null)}
              />
            </Field>
            {receptorUploadFile && !receptorUploadPath && (
              <div className="flex items-center gap-2 font-mono text-[11px] text-foreground-subtle">
                <Spinner style={{ width: 12, height: 12, borderWidth: 2 }} />
                Enviando...
              </div>
            )}
            {receptorUploadPath && (
              <p className="font-mono text-[11px] text-foreground-subtle opacity-60">
                ✓ {receptorUploadFile?.name}
              </p>
            )}
          </div>
        )}

        {receptorSource === "manual" && (
          <div className="flex flex-col gap-3">
            <div
              className="rounded-lg border px-3 py-2 font-mono text-[11px] text-foreground-subtle leading-relaxed"
              style={{ borderColor: "var(--color-accent-25)", background: "var(--color-accent-12)" }}
            >
              Informe o caminho absoluto do receptor no servidor DrugHunter.
            </div>
            <Field label="Caminho absoluto do receptor">
              <input
                className={INPUT_BASE}
                style={INPUT_STYLE}
                value={receptorManualPath}
                onChange={(e) => onReceptorManualPath(e.target.value)}
                placeholder="/home/user/datasets/PDB/1ABC/Prepared/receptor_prepared.pdb"
              />
            </Field>
            <Field label="Nome do arquivo (receptor_filename)" hint="usado como label">
              <input
                className={INPUT_BASE}
                style={INPUT_STYLE}
                value={receptorManualFilename}
                onChange={(e) => onReceptorManualFilename(e.target.value)}
                placeholder="receptor_prepared.pdb"
              />
            </Field>
          </div>
        )}
      </div>

      {/* ── Parâmetros MD ─────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-3">
        <p className="font-mono text-[10px] text-foreground-subtle uppercase tracking-wider px-1">
          Parâmetros da Simulação
        </p>

        {/* Grupo 1 — Preparação */}
        <ParamSection title="Preparação do Sistema" defaultOpen>
          <div className="flex flex-col gap-3 pt-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="pH do sistema">
                <input
                  className={INPUT_BASE} style={INPUT_STYLE} type="number" step={0.1} min={0} max={14}
                  value={params.ph_value}
                  onChange={(e) => onParam("ph_value", parseFloat(e.target.value))}
                />
              </Field>
              <Field label="Temperatura de simulação (K)">
                <input
                  className={INPUT_BASE} style={INPUT_STYLE} type="number" step={10} min={200}
                  value={params.simulation_temperature}
                  onChange={(e) => onParam("simulation_temperature", parseFloat(e.target.value))}
                />
              </Field>
              <Field label="Padding da caixa (nm)">
                <input
                  className={INPUT_BASE} style={INPUT_STYLE} type="number" step={0.1} min={0}
                  value={params.padding_value}
                  onChange={(e) => onParam("padding_value", parseFloat(e.target.value))}
                />
              </Field>
              <Field label="Forma da caixa">
                <select
                  className={INPUT_BASE} style={INPUT_STYLE}
                  value={params.box_shape}
                  onChange={(e) => onParam("box_shape", e.target.value)}
                >
                  {["dodecahedron", "cube", "octahedron"].map((v) => (
                    <option key={v} value={v}>{v}</option>
                  ))}
                </select>
              </Field>
              <Field label="Modelo de água">
                <select
                  className={INPUT_BASE} style={INPUT_STYLE}
                  value={params.water_model}
                  onChange={(e) => onParam("water_model", e.target.value)}
                >
                  {["TIP3P", "TIP4P", "SPC", "SPCE"].map((v) => (
                    <option key={v} value={v}>{v}</option>
                  ))}
                </select>
              </Field>
              <Field label="Concentração iônica (M)">
                <input
                  className={INPUT_BASE} style={INPUT_STYLE} type="number" step={0.01} min={0}
                  value={params.ionic_strength}
                  onChange={(e) => onParam("ionic_strength", parseFloat(e.target.value))}
                />
              </Field>
            </div>
            <ToggleField
              label="Neutralizar sistema"
              value={params.neutralize}
              onChange={(v) => onParam("neutralize", v)}
            />
            <ToggleField
              label="Solvatação"
              value={params.solvatation}
              onChange={(v) => onParam("solvatation", v)}
            />
            <ToggleField
              label="Manter moléculas de água do cristal"
              value={params.receptor_keepWater}
              onChange={(v) => onParam("receptor_keepWater", v)}
            />
          </div>
        </ParamSection>

        {/* Grupo 2 — Campo de Força */}
        <ParamSection title="Campo de Força">
          <div className="flex flex-col gap-3 pt-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="Campo de força (proteína)">
                <select
                  className={INPUT_BASE} style={INPUT_STYLE}
                  value={params.protein_forcefield}
                  onChange={(e) => onParam("protein_forcefield", e.target.value)}
                >
                  {["AMBER_FF14SB", "AMBER99SB_ILDN", "CHARMM36", "OPLS_AA_M"].map((v) => (
                    <option key={v} value={v}>{v}</option>
                  ))}
                </select>
              </Field>
              <Field label="Campo de força (solvente)">
                <select
                  className={INPUT_BASE} style={INPUT_STYLE}
                  value={params.solvent_forcefield}
                  onChange={(e) => onParam("solvent_forcefield", e.target.value)}
                >
                  {["TIP3P_STANDARD", "TIP4P_STANDARD", "SPC_STANDARD", "SPCE_STANDARD"].map((v) => (
                    <option key={v} value={v}>{v}</option>
                  ))}
                </select>
              </Field>
              <Field label="Campo de força (ligante)">
                <select
                  className={INPUT_BASE} style={INPUT_STYLE}
                  value={params.ligand_forcefield}
                  onChange={(e) => onParam("ligand_forcefield", e.target.value)}
                >
                  {["OPENFF_2_2_0", "GAFF", "GAFF2", "SMIRNOFF"].map((v) => (
                    <option key={v} value={v}>{v}</option>
                  ))}
                </select>
              </Field>
              <Field label="Restrições de ligações">
                <select
                  className={INPUT_BASE} style={INPUT_STYLE}
                  value={params.constraints}
                  onChange={(e) => onParam("constraints", e.target.value)}
                >
                  <option value="HBonds">HBonds</option>
                  <option value="AllBonds">AllBonds</option>
                  <option value="HAngles">HAngles</option>
                  <option value="None">None</option>
                </select>
              </Field>
              <Field label="Cutoff não-ligados (nm)">
                <input
                  className={INPUT_BASE} style={INPUT_STYLE} type="number" step={0.1} min={0}
                  value={params.nonbondedCutoff}
                  onChange={(e) => onParam("nonbondedCutoff", parseFloat(e.target.value))}
                />
              </Field>
              <Field label="Ewald error tolerance">
                <input
                  className={INPUT_BASE} style={INPUT_STYLE} type="number" step={0.0001} min={0}
                  value={params.ewaldErrorTolerance}
                  onChange={(e) => onParam("ewaldErrorTolerance", parseFloat(e.target.value))}
                />
              </Field>
              <Field label="Massa de hidrogênio (HMR)" hint="null = desabilitado">
                <input
                  className={INPUT_BASE} style={INPUT_STYLE} type="number" step={0.5} min={0}
                  value={params.hydrogenMass ?? ""}
                  placeholder="null"
                  onChange={(e) => onParam("hydrogenMass", e.target.value === "" ? null : parseFloat(e.target.value))}
                />
              </Field>
            </div>
            <ToggleField
              label="Água rígida (rigidWater)"
              value={params.rigidWater}
              onChange={(v) => onParam("rigidWater", v)}
            />
            <ToggleField
              label="Fronteiras periódicas"
              value={params.use_periodic_boundary}
              onChange={(v) => onParam("use_periodic_boundary", v)}
            />
            <ToggleField
              label="Correção de dispersão"
              value={params.useDispersionCorrection}
              onChange={(v) => onParam("useDispersionCorrection", v)}
            />
            <ToggleField
              label="HMR (use_HMR)"
              value={params.use_HMR}
              onChange={(v) => onParam("use_HMR", v)}
            />
            <ToggleField
              label="Remover movimento do centro de massa"
              value={params.removeCMMotion}
              onChange={(v) => onParam("removeCMMotion", v)}
            />
          </div>
        </ParamSection>

        {/* Grupo 3 — Barostato */}
        <ParamSection title="Barostato e Pressão">
          <div className="flex flex-col gap-3 pt-2">
            <p className="font-mono text-[11px] text-foreground-subtle">
              O barostato (ensemble NPT) é configurado sempre que a pressão e frequência são definidas.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="Pressão (bar)">
                <input
                  className={INPUT_BASE} style={INPUT_STYLE} type="number" step={0.1} min={0}
                  value={params.barostat_pressure}
                  onChange={(e) => onParam("barostat_pressure", parseFloat(e.target.value))}
                />
              </Field>
              <Field label="Frequência do barostato (passos)">
                <input
                  className={INPUT_BASE} style={INPUT_STYLE} type="number" min={1}
                  value={params.barostat_frequency}
                  onChange={(e) => onParam("barostat_frequency", parseInt(e.target.value, 10))}
                />
              </Field>
            </div>
          </div>
        </ParamSection>

        {/* Grupo 4 — Simulação */}
        <ParamSection title="Parâmetros da Simulação">
          <div className="flex flex-col gap-3 pt-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="Passo de integração (fs)">
                <input
                  className={INPUT_BASE} style={INPUT_STYLE} type="number" step={0.5} min={0.5}
                  value={params.integration_step}
                  onChange={(e) => onParam("integration_step", parseFloat(e.target.value))}
                />
              </Field>
              <Field label="Coeficiente de fricção (1/ps)">
                <input
                  className={INPUT_BASE} style={INPUT_STYLE} type="number" step={0.1} min={0}
                  value={params.friction_coeff}
                  onChange={(e) => onParam("friction_coeff", parseFloat(e.target.value))}
                />
              </Field>
              <Field label="Tolerância do integrador">
                <input
                  className={INPUT_BASE} style={INPUT_STYLE} type="number" step={0.000001} min={0}
                  value={params.integrator_tolerance}
                  onChange={(e) => onParam("integrator_tolerance", parseFloat(e.target.value))}
                />
              </Field>
              <Field label="Passos de equilibração">
                <input
                  className={INPUT_BASE} style={INPUT_STYLE} type="number" min={0}
                  value={params.equilibration_duration_steps}
                  onChange={(e) => onParam("equilibration_duration_steps", parseInt(e.target.value, 10))}
                />
              </Field>
              <Field label="Duração da produção (ns)">
                <input
                  className={INPUT_BASE} style={INPUT_STYLE} type="number" step={1} min={0.1}
                  value={params.production_duration_ns}
                  onChange={(e) => onParam("production_duration_ns", parseFloat(e.target.value))}
                />
              </Field>
              <Field label="Intervalo de relatório (passos)">
                <input
                  className={INPUT_BASE} style={INPUT_STYLE} type="number" min={1}
                  value={params.reporting_interval_steps}
                  onChange={(e) => onParam("reporting_interval_steps", parseInt(e.target.value, 10))}
                />
              </Field>
              <Field label="Intervalo de checkpoint (passos)">
                <input
                  className={INPUT_BASE} style={INPUT_STYLE} type="number" min={1}
                  value={params.checkpoint_interval_steps}
                  onChange={(e) => onParam("checkpoint_interval_steps", parseInt(e.target.value, 10))}
                />
              </Field>
              <Field label="Seed aleatório">
                <input
                  className={INPUT_BASE} style={INPUT_STYLE} type="number" min={0}
                  value={params.seed}
                  onChange={(e) => onParam("seed", parseInt(e.target.value, 10))}
                />
              </Field>
            </div>
            <ToggleField
              label="Forçar caixa periódica no DCD"
              value={params.enforcePeriodicBox_dcd}
              onChange={(v) => onParam("enforcePeriodicBox_dcd", v)}
            />
          </div>
        </ParamSection>

        {/* Grupo 5 — Restrições Externas */}
        <ParamSection title="Restrições de Posição">
          <div className="flex flex-col gap-3 pt-2">
            <Field label="Constante de força externa (kJ/mol/nm²)" hint="null = sem restrição">
              <input
                className={INPUT_BASE} style={INPUT_STYLE} type="number" step={100} min={0}
                value={params.externalForce_constrain_kJ ?? ""}
                placeholder="null"
                onChange={(e) => onParam("externalForce_constrain_kJ", e.target.value === "" ? null : parseFloat(e.target.value))}
              />
            </Field>
            <Field label="Átomos-alvo das restrições" hint="separados por vírgula">
              <input
                className={INPUT_BASE} style={INPUT_STYLE}
                value={params.restraint_target_atoms.join(", ")}
                onChange={(e) => onParam("restraint_target_atoms", e.target.value.split(",").map((s) => s.trim()).filter(Boolean))}
              />
            </Field>
            <Field label="Eixos de restrição" hint="x, y, z">
              <input
                className={INPUT_BASE} style={INPUT_STYLE}
                value={params.restraint_axes.join(", ")}
                onChange={(e) => onParam("restraint_axes", e.target.value.split(",").map((s) => s.trim()).filter(Boolean))}
              />
            </Field>
            <Field label="Aminoácidos padrão (standard_amino_acids)" hint="separados por vírgula">
              <input
                className={INPUT_BASE} style={INPUT_STYLE}
                value={params.standard_amino_acids.join(", ")}
                onChange={(e) => onParam("standard_amino_acids", e.target.value.split(",").map((s) => s.trim()).filter(Boolean))}
              />
            </Field>
          </div>
        </ParamSection>

        {/* Grupo 6 — Hardware */}
        <ParamSection title="Hardware e Plataforma">
          <div className="flex flex-col gap-3 pt-2">
            <Field label="Plataforma">
              <select
                className={INPUT_BASE} style={INPUT_STYLE}
                value={params.platform_name}
                onChange={(e) => onParam("platform_name", e.target.value)}
              >
                <option value="CUDA">CUDA (GPU)</option>
                <option value="OpenCL">OpenCL</option>
                <option value="CPU">CPU</option>
                <option value="Reference">Reference (debug)</option>
              </select>
            </Field>
          </div>
        </ParamSection>

        {/* Grupo 7 — Saída (sem campos adicionais — controlados pelo DrugHunter) */}
        <ParamSection title="Saída">
          <div className="pt-2">
            <p className="font-mono text-[11px] text-foreground-subtle leading-relaxed">
              A simulação gera: trajetória (<code className="text-[10px]">trajectory.dcd</code>),
              estrutura minimizada (<code className="text-[10px]">complex_min.pdb</code>),
              estrutura solvatada e log de energia.
              Após a simulação, rode a análise para gerar os gráficos de RMSD, RMSF,
              raio de giração, H-bonds e a visualização 3D interativa.
              Os arquivos ficam no diretório de saída configurado pelo servidor.
            </p>
          </div>
        </ParamSection>
      </div>

      {/* ── Submissão ─────────────────────────────────────────────────────── */}
      {submitError && (
        <div className="rounded-lg border border-red-400/30 bg-red-500/10 px-3 py-2">
          <p className="font-mono text-[11px] text-red-400">{submitError}</p>
        </div>
      )}

      <button
        className="w-full font-mono text-[12px] rounded-xl border px-4 py-3 font-semibold transition-all hover:opacity-80 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        style={ACCENT_BTN}
        onClick={onSubmit}
        disabled={submitting}
      >
        {submitting ? (
          <>
            <Spinner style={{ width: 14, height: 14, borderWidth: 2 }} />
            Iniciando simulação...
          </>
        ) : (
          "Iniciar Dinâmica Molecular"
        )}
      </button>
    </div>
  );
}

// ── Componentes auxiliares ────────────────────────────────────────────────────

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="font-mono text-[11px] font-medium text-foreground-subtle">
        {label}
        {hint && <span className="ml-1 opacity-60 font-normal">({hint})</span>}
      </label>
      {children}
    </div>
  );
}

function ToggleField({
  label, value, onChange,
}: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center gap-3 cursor-pointer select-none group">
      <div
        className={`relative w-9 h-5 rounded-full transition-colors ${value ? "bg-accent" : "bg-surface-secondary border border-outline"}`}
        onClick={() => onChange(!value)}
      >
        <div
          className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform shadow-sm ${value ? "translate-x-4" : "translate-x-0"}`}
        />
      </div>
      <span className="font-mono text-[12px] text-foreground-subtle group-hover:text-foreground transition-colors">
        {label}
      </span>
    </label>
  );
}

function ToggleGroup({
  value, options, onChange,
}: { value: string; options: { value: string; label: string }[]; onChange: (v: string) => void }) {
  return (
    <div className="flex gap-1 rounded-lg border border-outline bg-surface-secondary p-0.5">
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className="font-mono text-[10px] px-2.5 py-1 rounded-md transition-colors font-semibold"
          style={
            value === opt.value
              ? { background: "var(--color-accent-12)", color: "var(--color-accent)", border: "1px solid var(--color-accent-25)" }
              : { color: "var(--color-foreground-subtle)", border: "1px solid transparent" }
          }
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
