// components/charts/ResolutionBarChart.tsx
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";

const TOOLTIP_STYLE = {
  contentStyle: {
    background: "#141c2e",
    border: "1px solid #1e2d4a",
    borderRadius: 8,
    fontSize: 12,
  },
  itemStyle: { color: "#e2e8f0" },
};

// Cores por faixa — mais azul = melhor resolução
const FAIXA_COLORS: Record<string, string> = {
  "< 1.5 Å": "#00d4aa",
  "1.5–2.0 Å": "#00b89a",
  "2.0–2.5 Å": "#0094a0",
  "2.5–3.0 Å": "#006e8a",
  "> 3.0 Å": "#004a6e",
  "N/D": "#2a3e56",
};

interface ChartDatum {
  name: string;
  value: number;
}

interface ResolutionBarChartProps {
  data: ChartDatum[];
}

export function ResolutionBarChart({ data }: ResolutionBarChartProps) {
  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={data} margin={{ left: 0, right: 8, top: 4, bottom: 4 }}>
        <XAxis
          dataKey="name"
          tick={{ fontSize: 10, fill: "#94a3b8" }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tick={{ fontSize: 11, fill: "#4a6080" }}
          axisLine={false}
          tickLine={false}
          width={28}
        />
        <Tooltip {...TOOLTIP_STYLE} />
        <Bar dataKey="value" radius={[4, 4, 0, 0]}>
          {data.map((entry) => (
            <Cell
              key={entry.name}
              fill={FAIXA_COLORS[entry.name] ?? "#00d4aa"}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
