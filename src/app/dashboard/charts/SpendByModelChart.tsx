"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { ModelSpendPoint } from "@/lib/dashboard/aggregate";

const currency = (n: number) =>
  n.toLocaleString(undefined, { style: "currency", currency: "USD" });

const truncate = (s: string, max = 20) => (s.length > max ? `${s.slice(0, max - 1)}…` : s);

export function SpendByModelChart({ data }: { data: ModelSpendPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={Math.max(180, data.length * 36)}>
      <BarChart
        data={data}
        layout="vertical"
        margin={{ top: 8, right: 24, bottom: 0, left: 0 }}
      >
        <CartesianGrid stroke="var(--chart-grid)" horizontal={false} />
        <XAxis
          type="number"
          tick={{ fill: "var(--chart-ink-muted)", fontSize: 12 }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(v) => currency(v)}
        />
        <YAxis
          type="category"
          dataKey="model"
          tick={{ fill: "var(--chart-ink-secondary)", fontSize: 12 }}
          axisLine={false}
          tickLine={false}
          width={160}
          tickFormatter={(v: string) => truncate(v)}
          interval={0}
        />
        <Tooltip
          cursor={false}
          formatter={(value: unknown) => currency(Number(value ?? 0))}
          contentStyle={{
            background: "var(--chart-surface)",
            border: "1px solid var(--chart-grid)",
            borderRadius: 6,
            fontSize: 12,
          }}
          labelStyle={{ color: "var(--chart-ink-secondary)" }}
        />
        <Bar
          dataKey="cost"
          fill="var(--chart-sequential)"
          radius={[0, 4, 4, 0]}
          maxBarSize={20}
          isAnimationActive={false}
          activeBar={{ fillOpacity: 0.75 }}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}
