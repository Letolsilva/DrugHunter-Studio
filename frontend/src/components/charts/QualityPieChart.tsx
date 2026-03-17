// components/charts/QualityPieChart.tsx
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

const QUALIDADE_COR: Record<string, string> = {
  Excelente: "#00d4aa",
  Boa: "#3b82f6",
  Razoável: "#f59e0b",
  Verificar: "#ef4444",
};

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

interface QualityPieChartProps {
  data: ChartDatum[];
}

export function QualityPieChart({ data }: QualityPieChartProps) {
  return (
    <ResponsiveContainer width="100%" height={200}>
      <PieChart>
        <Pie
          data={data}
          dataKey="value"
          nameKey="name"
          cx="50%"
          cy="50%"
          outerRadius={72}
          strokeWidth={0}
        >
          {data.map((entry) => (
            <Cell
              key={entry.name}
              fill={QUALIDADE_COR[entry.name] ?? "#4d6a8a"}
            />
          ))}
        </Pie>
        <Tooltip {...TOOLTIP_STYLE} />
        <Legend
          iconType="circle"
          iconSize={8}
          wrapperStyle={{ fontSize: 12, color: "#94a3b8" }}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}
