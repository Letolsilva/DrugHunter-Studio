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
    background: "var(--card)",
    border: "1px solid var(--border)",
    borderRadius: 8,
    fontSize: 12,
  },
  itemStyle: { color: "var(--text)" },
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
          tick={{ fontSize: 11, fill: "var(--text-2)" }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tick={{ fontSize: 11, fill: "var(--text-3)" }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip {...TOOLTIP_STYLE} />
        <Bar dataKey="value" fill="var(--blue)" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
