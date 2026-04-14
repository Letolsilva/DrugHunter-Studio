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

// Cores por faixa — mais brilhante = melhor resolução (menor valor em Å)
const FAIXA_COLORS: Record<string, string> = {
  "< 1.5 \u00C5": "#00d4aa",
  "1.5\u20132.0 \u00C5": "#00b89a",
  "2.0\u20132.5 \u00C5": "#0094a0",
  "2.5\u20133.0 \u00C5": "#006e8a",
  "> 3.0 \u00C5": "#004a6e",
  "N/D": "#2a3e56",
};

interface ChartDatum {
  name: string;
  value: number;
}

interface ResolutionBarChartProps {
  data: ChartDatum[];
  height?: number;
}

export function ResolutionBarChart({
  data,
  height = 200,
}: ResolutionBarChartProps) {
  return (
    <ResponsiveContainer width="100%" height={height}>
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
