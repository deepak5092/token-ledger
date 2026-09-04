"use client";

import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import type { DonutSlice } from "@/lib/dashboard/aggregate";

const currency = (n: number) =>
  n.toLocaleString(undefined, { style: "currency", currency: "USD" });

const truncate = (s: string, max = 18) => (s.length > max ? `${s.slice(0, max - 1)}…` : s);

// Fixed slot order (never cycled/generated past this) -- "Other" always
// gets the neutral muted tone rather than an 8th hue, so a long tail of
// models never has to invent a new color.
const SLICE_COLORS = [
  "var(--chart-series-1)",
  "var(--chart-series-2)",
  "var(--chart-series-3)",
  "var(--chart-series-4)",
  "var(--chart-series-5)",
  "var(--chart-series-6)",
];
const OTHER_COLOR = "var(--chart-ink-muted)";

export function SpendByModelDonut({ data }: { data: DonutSlice[] }) {
  const total = data.reduce((sum, d) => sum + d.cost, 0);

  return (
    <ResponsiveContainer width="100%" height={260}>
      <PieChart margin={{ top: 8, right: 8, bottom: 8, left: 8 }}>
        <Pie
          data={data}
          dataKey="cost"
          nameKey="label"
          innerRadius={60}
          outerRadius={90}
          isAnimationActive={false}
        >
          {data.map((d, i) => (
            <Cell
              key={d.label}
              fill={d.label === "Other" ? OTHER_COLOR : SLICE_COLORS[i % SLICE_COLORS.length]}
              stroke="var(--chart-surface)"
              strokeWidth={1.5}
            />
          ))}
        </Pie>
        <Tooltip
          formatter={(value: unknown, _name, item) => {
            const cost = Number(value ?? 0);
            const pct = total > 0 ? Math.round((cost / total) * 100) : 0;
            return [`${currency(cost)} (${pct}%)`, item.payload.label];
          }}
          contentStyle={{
            background: "var(--chart-surface)",
            border: "1px solid var(--chart-grid)",
            borderRadius: 6,
            fontSize: 12,
          }}
          labelStyle={{ color: "var(--chart-ink-secondary)" }}
        />
        <Legend
          layout="vertical"
          verticalAlign="middle"
          align="right"
          formatter={(value: string) => (
            <span style={{ color: "var(--chart-ink-secondary)", fontSize: 12 }}>
              {truncate(value)}
            </span>
          )}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}
