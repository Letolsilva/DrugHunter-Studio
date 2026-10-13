// components/admet/AdmetBoiledEgg.tsx
// Gráfico BOILED-Egg interativo: TPSA x WLOGP com elipses HIA (branca) e BBB (amarela).
import { useCallback } from "react";
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  Tooltip,
  Customized,
  ResponsiveContainer,
} from "recharts";
import type { AdmetMoleculeModel } from "../../domain/models/admet.model";

// ── Parâmetros das elipses (em coordenadas de dados) ─────────────────────────
// Branca (HIA):  centro=(75, 2.0), semi-eixos: rx=75, ry=3.0
// Amarela (BBB): centro=(42, 2.3), semi-eixos: rx=47, ry=2.2

interface EggEllipsesProps {
  xAxisMap?: Record<string, { scale: (v: number) => number }>;
  yAxisMap?: Record<string, { scale: (v: number) => number }>;
  offset?: { left: number; top: number; width: number; height: number };
}

function EggEllipses({ xAxisMap, yAxisMap, offset }: EggEllipsesProps) {
  const xScale = xAxisMap?.[0]?.scale;
  const yScale = yAxisMap?.[0]?.scale;
  if (!xScale || !yScale || !offset) return null;

  const px = (tpsa: number) => xScale(tpsa);
  const py = (logp: number) => yScale(logp);
  const rx = (r: number) => Math.abs(xScale(r) - xScale(0));
  const ry = (r: number) => Math.abs(yScale(r) - yScale(0));

  return (
    <g>
      {/* Fundo cinza da área do gráfico */}
      <rect
        x={offset.left}
        y={offset.top}
        width={offset.width}
        height={offset.height}
        fill="#d9d9d9"
      />
      {/* Elipse branca — zona HIA */}
      <ellipse
        cx={px(75)}
        cy={py(2.0)}
        rx={rx(75)}
        ry={ry(3.0)}
        fill="white"
        stroke="#888"
        strokeWidth={1.5}
      />
      {/* Elipse amarela — zona BBB */}
      <ellipse
        cx={px(42)}
        cy={py(2.3)}
        rx={rx(47)}
        ry={ry(2.2)}
        fill="#ffe066"
        stroke="orange"
        strokeWidth={1.5}
      />
    </g>
  );
}

// ── Tooltip ────────────────────────────────────────────────────────────────────

function AdmetTooltip({ active, payload }: { active?: boolean; payload?: { payload: AdmetMoleculeModel }[] }) {
  if (!active || !payload?.length) return null;
  const mol = payload[0].payload;
  return (
    <div
      className="rounded-lg border border-outline bg-panel px-3 py-2 shadow-lg"
      style={{ maxWidth: 220 }}
    >
      <p className="font-mono text-[11px] font-semibold text-foreground truncate">
        {mol.molecule_chembl_id}
      </p>
      <div className="mt-1 flex flex-col gap-0.5">
        <p className="font-mono text-[10px] text-foreground-subtle">
          TPSA: <span className="text-foreground">{mol.tpsa}</span> Å²
        </p>
        <p className="font-mono text-[10px] text-foreground-subtle">
          WLOGP: <span className="text-foreground">{mol.wlogp}</span>
        </p>
        <p className="font-mono text-[10px] text-foreground-subtle">
          MW: <span className="text-foreground">{mol.mw}</span>
        </p>
      </div>
      <div className="mt-1.5 flex gap-1.5">
        <span
          className="font-mono text-[10px] rounded px-1 py-0.5"
          style={{
            background: mol.bbb === "BBB+" ? "color-mix(in srgb, #e05a5a 20%, transparent)" : "color-mix(in srgb, #5a7be0 20%, transparent)",
            color: mol.bbb === "BBB+" ? "#e05a5a" : "#5a7be0",
          }}
        >
          {mol.bbb}
        </span>
        <span
          className="font-mono text-[10px] rounded px-1 py-0.5"
          style={{
            background: "color-mix(in srgb, var(--color-accent) 15%, transparent)",
            color: "var(--color-accent)",
          }}
        >
          {mol.hia}
        </span>
        <span className="font-mono text-[10px] text-foreground-subtle">{mol.pgp}</span>
      </div>
      <p className="mt-1 font-mono text-[9px] text-foreground-subtle">
        Clique para ver estrutura 2D
      </p>
    </div>
  );
}

// ── Dot customizado (clicável) ────────────────────────────────────────────────

function ClickableDot(props: {
  cx?: number;
  cy?: number;
  payload?: AdmetMoleculeModel;
  fill?: string;
  onMolClick: (mol: AdmetMoleculeModel) => void;
}) {
  const { cx = 0, cy = 0, payload, fill, onMolClick } = props;
  return (
    <circle
      cx={cx}
      cy={cy}
      r={5}
      fill={fill}
      stroke="#000"
      strokeWidth={0.4}
      opacity={0.85}
      style={{ cursor: "pointer" }}
      onClick={() => payload && onMolClick(payload)}
    />
  );
}

// ── Componente principal ──────────────────────────────────────────────────────

interface Props {
  molecules: AdmetMoleculeModel[];
  onMolClick: (mol: AdmetMoleculeModel) => void;
}

export function AdmetBoiledEgg({ molecules, onMolClick }: Props) {
  const bbbPlus = molecules.filter((m) => m.bbb === "BBB+");
  const bbbMinus = molecules.filter((m) => m.bbb === "BBB-");

  const makeDot = useCallback(
    (color: string) =>
      (dotProps: object) =>
        <ClickableDot {...(dotProps as Parameters<typeof ClickableDot>[0])} fill={color} onMolClick={onMolClick} />,
    [onMolClick],
  );

  return (
    <div className="rounded-xl border border-outline bg-panel p-4">
      <div className="mb-3 flex items-center justify-between">
        <span className="font-mono text-[12px] font-semibold text-foreground">
          BOILED-Egg Plot
        </span>
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5 font-mono text-[11px] text-foreground-subtle">
            <span className="h-2.5 w-2.5 rounded-full bg-[#e05a5a]" />
            BBB+
          </span>
          <span className="flex items-center gap-1.5 font-mono text-[11px] text-foreground-subtle">
            <span className="h-2.5 w-2.5 rounded-full bg-[#5a7be0]" />
            BBB-
          </span>
          <span className="flex items-center gap-1.5 font-mono text-[11px] text-foreground-subtle">
            <span
              className="h-2.5 w-4 rounded-sm border border-[#888]"
              style={{ background: "white" }}
            />
            HIA
          </span>
          <span className="flex items-center gap-1.5 font-mono text-[11px] text-foreground-subtle">
            <span
              className="h-2.5 w-4 rounded-sm border border-orange-400"
              style={{ background: "#ffe066" }}
            />
            BBB
          </span>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={480}>
        <ScatterChart margin={{ top: 10, right: 20, bottom: 20, left: 10 }}>
          <XAxis
            type="number"
            dataKey="tpsa"
            domain={[0, 200]}
            name="TPSA"
            label={{ value: "TPSA (Å²)", position: "insideBottom", offset: -10, style: { fontSize: 12 } }}
            tick={{ fontFamily: "monospace", fontSize: 11 }}
          />
          <YAxis
            type="number"
            dataKey="wlogp"
            domain={[-2, 7]}
            name="WLOGP"
            label={{ value: "WLOGP", angle: -90, position: "insideLeft", offset: 10, style: { fontSize: 12 } }}
            tick={{ fontFamily: "monospace", fontSize: 11 }}
          />
          <Tooltip content={<AdmetTooltip />} />

          {/* Elipses desenhadas antes dos pontos (z-order correto) */}
          <Customized component={EggEllipses} />

          <Scatter
            name="BBB-"
            data={bbbMinus}
            fill="#5a7be0"
            shape={makeDot("#5a7be0")}
          />
          <Scatter
            name="BBB+"
            data={bbbPlus}
            fill="#e05a5a"
            shape={makeDot("#e05a5a")}
          />
        </ScatterChart>
      </ResponsiveContainer>

      <p className="mt-1 text-center font-mono text-[10px] text-foreground-subtle">
        {molecules.length} moléculas — clique num ponto para ver a estrutura 2D
      </p>
    </div>
  );
}
