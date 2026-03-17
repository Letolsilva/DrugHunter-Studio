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

interface MethodBarChartProps {
  data: ChartDatum[];
}

export function MethodBarChart({ data }: MethodBarChartProps) {
  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={data} layout="vertical" margin={{ left: 8 }}>
        <XAxis
          type="number"
          tick={{ fontSize: 11, fill: "#4a6080" }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          type="category"
          dataKey="name"
          width={130}
          tick={{ fontSize: 11, fill: "#94a3b8" }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip {...TOOLTIP_STYLE} />
        <Bar dataKey="value" fill="#00d4aa" radius={[0, 4, 4, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
