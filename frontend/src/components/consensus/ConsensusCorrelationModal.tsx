// components/consensus/ConsensusCorrelationModal.tsx
import { useEffect, useState } from "react";
import type { ConsensusResultRowModel } from "../../domain/models/consensus.model";

interface Props {
  rows: ConsensusResultRowModel[];
  onClose: () => void;
}

// ── estatísticas — replicam exatamente o DrugHunter (wrappers/docking.py) ────
// DH chama .abs() antes de normalizar e usa std amostral (ddof=1, padrão pandas)
function meanOf(arr: number[]) { return arr.reduce((a, b) => a + b, 0) / arr.length; }
function sampleStd(arr: number[], m: number) {
  // ddof=1: divide por (n-1), igual ao pandas .std()
  return arr.length < 2 ? 1 : Math.sqrt(arr.reduce((a, b) => a + (b - m) ** 2, 0) / (arr.length - 1));
}
// (abs(x) - min(abs)) / (max(abs) - min(abs))
function minMaxNormAbs(arr: number[]): number[] {
  const a = arr.map(Math.abs);
  const lo = Math.min(...a), hi = Math.max(...a);
  const range = hi - lo || 1;
  return a.map(v => (v - lo) / range);
}
// (abs(x) - mean(abs)) / sample_std(abs)
function zNormAbs(arr: number[]): number[] {
  const a = arr.map(Math.abs);
  const m = meanOf(a), s = sampleStd(a, m) || 1;
  return a.map(v => (v - m) / s);
}

// Ticks com intervalos "bonitos" (0.2, 0.5, 1, 2, …) — igual ao matplotlib
function niceTicks(dataMin: number, dataMax: number): number[] {
  const range = dataMax - dataMin || 1;
  const rough = range / 5;
  const mag = Math.pow(10, Math.floor(Math.log10(rough)));
  const step = [0.1, 0.2, 0.5, 1, 2, 5, 10]
    .map(f => f * mag)
    .find(c => c >= rough) ?? mag * 10;
  const lo = Math.floor(dataMin / step) * step;
  const hi = Math.ceil(dataMax / step) * step;
  const result: number[] = [];
  for (let v = lo; v <= hi + step * 0.001; v = Math.round((v + step) * 1e9) / 1e9)
    result.push(v);
  return result;
}

// ── dimensões ─────────────────────────────────────────────────────────────────
const M = { top: 40, right: 24, bottom: 54, left: 60 };
const W = 440;
const H = 360;
const IW = W - M.left - M.right;
const IH = H - M.top - M.bottom;

// ── ScatterPlot ───────────────────────────────────────────────────────────────
interface ScatterProps {
  title: string;
  xs: number[];
  ys: number[];
  xTicks: number[];
  yTicks: number[];
  rows: ConsensusResultRowModel[];
  color: string;
}

interface Hovered { row: ConsensusResultRowModel; idx: number; cx: number; cy: number; }

function ScatterPlot({ title, xs, ys, xTicks, yTicks, rows, color }: ScatterProps) {
  const [hov, setHov] = useState<Hovered | null>(null);

  const xMin = xTicks[0], xMax = xTicks[xTicks.length - 1];
  const yMin = yTicks[0], yMax = yTicks[yTicks.length - 1];

  const xScale = (v: number) => M.left + ((v - xMin) / (xMax - xMin)) * IW;
  const yScale = (v: number) => M.top + (1 - (v - yMin) / (yMax - yMin)) * IH;

  const TW = 168, TH = 82;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H}
      style={{ maxWidth: "100%", height: "auto", display: "block", overflow: "visible" }}>

      {/* Título */}
      <text x={W / 2} y={20} textAnchor="middle"
        fontSize={13} fill="var(--color-foreground)" fontFamily="monospace" fontWeight="600">
        {title}
      </text>

      {/* Linhas de grade leves */}
      {xTicks.map((v, i) => (
        <line key={`gx${i}`} x1={xScale(v)} y1={M.top} x2={xScale(v)} y2={M.top + IH}
          stroke="var(--color-outline)" strokeWidth={0.5} opacity={0.5} />
      ))}
      {yTicks.map((v, i) => (
        <line key={`gy${i}`} x1={M.left} y1={yScale(v)} x2={M.left + IW} y2={yScale(v)}
          stroke="var(--color-outline)" strokeWidth={0.5} opacity={0.5} />
      ))}

      {/* Eixos */}
      <line x1={M.left} y1={M.top + IH} x2={M.left + IW} y2={M.top + IH}
        stroke="var(--color-foreground-subtle)" strokeWidth={1} />
      <line x1={M.left} y1={M.top} x2={M.left} y2={M.top + IH}
        stroke="var(--color-foreground-subtle)" strokeWidth={1} />

      {/* Ticks X */}
      {xTicks.map((v, i) => (
        <g key={i}>
          <line x1={xScale(v)} y1={M.top + IH} x2={xScale(v)} y2={M.top + IH + 5}
            stroke="var(--color-foreground-subtle)" strokeWidth={1} />
          <text x={xScale(v)} y={M.top + IH + 17} textAnchor="middle"
            fontSize={10} fill="var(--color-foreground-subtle)" fontFamily="monospace">
            {Number(v.toFixed(4)) % 1 === 0 ? v.toFixed(1) : v % 0.5 === 0 ? v.toFixed(1) : v.toFixed(1)}
          </text>
        </g>
      ))}

      {/* Ticks Y */}
      {yTicks.map((v, i) => (
        <g key={i}>
          <line x1={M.left - 5} y1={yScale(v)} x2={M.left} y2={yScale(v)}
            stroke="var(--color-foreground-subtle)" strokeWidth={1} />
          <text x={M.left - 8} y={yScale(v) + 4} textAnchor="end"
            fontSize={10} fill="var(--color-foreground-subtle)" fontFamily="monospace">
            {v.toFixed(1)}
          </text>
        </g>
      ))}

      {/* Rótulos dos eixos */}
      <text x={M.left + IW / 2} y={H - 6} textAnchor="middle"
        fontSize={11} fill="var(--color-foreground-subtle)" fontFamily="monospace">
        vina
      </text>
      <text x={14} y={M.top + IH / 2} textAnchor="middle"
        fontSize={11} fill="var(--color-foreground-subtle)" fontFamily="monospace"
        transform={`rotate(-90, 14, ${M.top + IH / 2})`}>
        dock6
      </text>

      {/* Pontos */}
      {xs.map((x, idx) => {
        const cx = xScale(x), cy = yScale(ys[idx]);
        const isHov = hov?.idx === idx;
        return (
          <circle key={rows[idx].molecule} cx={cx} cy={cy}
            r={isHov ? 6 : 4}
            fill={color}
            stroke={isHov ? "white" : "none"}
            strokeWidth={1.5}
            style={{ cursor: "crosshair" }}
            onMouseEnter={() => setHov({ row: rows[idx], idx, cx, cy })}
            onMouseLeave={() => setHov(null)}
          />
        );
      })}

      {/* Tooltip */}
      {hov && (() => {
        const { row, cx, cy } = hov;
        const flipX = cx + TW + 14 > W;
        const flipY = cy + TH + 14 > H;
        const tx = flipX ? cx - TW - 8 : cx + 8;
        const ty = flipY ? cy - TH - 8 : cy + 8;
        const mol = row.molecule.length > 24 ? row.molecule.slice(0, 22) + "…" : row.molecule;
        return (
          <g pointerEvents="none">
            <rect x={tx - 6} y={ty - 6} width={TW + 12} height={TH + 12}
              rx={5} fill="var(--color-panel)" stroke="var(--color-outline)" strokeWidth={1} />
            <text x={tx} y={ty + 12} fontSize={9} fill={color}
              fontFamily="monospace" fontWeight="bold">#{hov.idx + 1}</text>
            <text x={tx + 24} y={ty + 12} fontSize={9} fill="var(--color-foreground)" fontFamily="monospace">
              {mol}
            </text>
            <text x={tx} y={ty + 27} fontSize={9} fill="var(--color-foreground-subtle)" fontFamily="monospace">
              Vina:    {row.vina.toFixed(3)}
            </text>
            <text x={tx} y={ty + 41} fontSize={9} fill="var(--color-foreground-subtle)" fontFamily="monospace">
              Dock6:   {row.dock6.toFixed(3)}
            </text>
            <text x={tx} y={ty + 55} fontSize={9} fill="var(--color-foreground-subtle)" fontFamily="monospace">
              Z-score: {row["z-score"].toFixed(3)}
            </text>
            <text x={tx} y={ty + 69} fontSize={9} fill="var(--color-foreground-subtle)" fontFamily="monospace">
              Min-max: {row["min-max"].toFixed(3)}
            </text>
          </g>
        );
      })()}
    </svg>
  );
}

// ── modal ─────────────────────────────────────────────────────────────────────
export function ConsensusCorrelationModal({ rows, onClose }: Props) {
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose]);

  if (rows.length === 0) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center"
        style={{ background: "rgba(0,0,0,0.6)" }} onClick={onClose}>
        <div className="rounded-xl border border-outline bg-panel p-6"
          onClick={e => e.stopPropagation()}>
          <p className="font-mono text-[12px] text-foreground-subtle">Sem dados para exibir.</p>
        </div>
      </div>
    );
  }

  const vinas  = rows.map(r => r.vina);
  const dock6s = rows.map(r => r.dock6);

  // Idêntico ao plot_scatter_comparison do DH: abs() antes de normalizar
  const vina_mm  = minMaxNormAbs(vinas);
  const dock6_mm = minMaxNormAbs(dock6s);
  const vina_z   = zNormAbs(vinas);
  const dock6_z  = zNormAbs(dock6s);

  // Escala fixa 0-1 para min-max (igual ao PNG)
  const mmXTicks = [0, 0.2, 0.4, 0.6, 0.8, 1.0];
  const mmYTicks = [0, 0.2, 0.4, 0.6, 0.8, 1.0];

  // Escala dinâmica com ticks bonitos para z-score
  const zxMin = Math.min(...vina_z), zxMax = Math.max(...vina_z);
  const zyMin = Math.min(...dock6_z), zyMax = Math.max(...dock6_z);
  const zXTicks = niceTicks(zxMin - 0.1, zxMax + 0.1);
  const zYTicks = niceTicks(zyMin - 0.1, zyMax + 0.1);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: "rgba(0,0,0,0.6)" }} onClick={onClose}>
      <div
        className="relative rounded-xl border border-outline bg-panel p-5"
        style={{ maxWidth: "97vw", maxHeight: "95vh", overflow: "auto" }}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-mono text-[13px] font-semibold text-foreground">
            Correlação Vina × Dock6 · {rows.length} moléculas
          </h3>
          <button onClick={onClose}
            className="font-mono text-[12px] text-foreground-subtle hover:text-foreground transition-colors ml-8">
            ✕ Fechar
          </button>
        </div>
        <p className="font-mono text-[10px] text-foreground-subtle mb-4 opacity-70">
          Passe o cursor sobre um ponto para ver o nome e os scores.
        </p>

        <div className="flex flex-wrap gap-6 justify-center">
          <ScatterPlot
            title="Min-Max Correlation"
            xs={vina_mm} ys={dock6_mm}
            xTicks={mmXTicks} yTicks={mmYTicks}
            rows={rows} color="#1f77b4"
          />
          <ScatterPlot
            title="Z-score Correlation"
            xs={vina_z} ys={dock6_z}
            xTicks={zXTicks} yTicks={zYTicks}
            rows={rows} color="#d62728"
          />
        </div>
      </div>
    </div>
  );
}
