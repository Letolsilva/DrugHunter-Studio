// components/charts/LigandBarChart.tsx
// Ligantes mais frequentes: barras horizontais ordenadas (comprimento é o canal visual mais
// preciso para comparar quantidades; substitui o donut anterior, cujo ângulo dificulta a comparação).
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  LabelList,
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

const ROW_HEIGHT = 24;

interface ChartDatum {
  name: string;
  value: number;
}

interface LigandBarChartProps {
  data: ChartDatum[];
}

export function LigandBarChart({ data }: LigandBarChartProps) {
  // Ordem decrescente: o maior fica no topo
  const sorted = [...data].sort((a, b) => b.value - a.value);
  const height = Math.max(sorted.length * ROW_HEIGHT + 16, 80);

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart
        data={sorted}
        layout="vertical"
        margin={{ left: 8, right: 28 }}
        barCategoryGap={4}
      >
        <XAxis type="number" hide domain={[0, "dataMax"]} />
        <YAxis
          type="category"
          dataKey="name"
          width={64}
          tick={{ fontSize: 11, fill: "#94a3b8" }}
          axisLine={false}
          tickLine={false}
          interval={0}
        />
        <Tooltip {...TOOLTIP_STYLE} cursor={{ fill: "rgba(148,163,184,0.08)" }} />
        <Bar
          dataKey="value"
          name="Estruturas"
          fill="#00d4aa"
          radius={[0, 4, 4, 0]}
        >
          <LabelList
            dataKey="value"
            position="right"
            style={{ fontSize: 11, fill: "#94a3b8" }}
          />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
