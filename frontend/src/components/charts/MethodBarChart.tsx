// components/charts/MethodBarChart.tsx
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

interface MethodBarChartProps {
  data: ChartDatum[];
}

export function MethodBarChart({ data }: MethodBarChartProps) {
  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={data} layout="vertical" margin={{ left: 8 }}>
        <XAxis
          type="number"
          tick={{ fontSize: 11, fill: "var(--text-3)" }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          type="category"
          dataKey="name"
          width={130}
          tick={{ fontSize: 11, fill: "var(--text-2)" }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip {...TOOLTIP_STYLE} />
        <Bar dataKey="value" fill="var(--accent)" radius={[0, 4, 4, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
