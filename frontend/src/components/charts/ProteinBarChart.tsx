// components/charts/ProteinBarChart.tsx
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
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

interface ChartDatum {
  name: string;
  value: number;
}

interface ProteinBarChartProps {
  data: ChartDatum[];
}

export function ProteinBarChart({ data }: ProteinBarChartProps) {
  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={data}>
        <XAxis
          dataKey="name"
          tick={{ fontSize: 11, fill: "#94a3b8" }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tick={{ fontSize: 11, fill: "#4a6080" }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip {...TOOLTIP_STYLE} />
        <Bar dataKey="value" fill="#3b82f6" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
