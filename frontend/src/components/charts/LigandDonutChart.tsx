// components/charts/LigandDonutChart.tsx
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";

const TOOLTIP_STYLE = {
  contentStyle: {
    background: "#141c2e",
    border: "1px solid #1e2d4a",
    borderRadius: 8,
    fontSize: 12,
  },
  itemStyle: { color: "#e2e8f0" },
};

const COLORS = [
  "#00d4aa",
  "#3b82f6",
  "#f59e0b",
  "#a855f7",
  "#ef4444",
  "#06b6d4",
  "#84cc16",
  "#f97316",
];

interface ChartDatum {
  name: string;
  value: number;
}

interface LigandDonutChartProps {
  data: ChartDatum[];
}

export function LigandDonutChart({ data }: LigandDonutChartProps) {
  return (
    <ResponsiveContainer width="100%" height={160}>
      <PieChart>
        <Pie
          data={data}
          dataKey="value"
          nameKey="name"
          cx="50%"
          cy="50%"
          innerRadius={40}
          outerRadius={65}
          strokeWidth={0}
        >
          {data.map((entry, i) => (
            <Cell key={entry.name} fill={COLORS[i % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip {...TOOLTIP_STYLE} />
      </PieChart>
    </ResponsiveContainer>
  );
}
