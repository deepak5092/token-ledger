"use client";

import { Area, ComposedChart, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid } from "recharts";
import type { CumulativePoint } from "@/lib/dashboard/aggregate";

const currency = (n: number) =>
  n.toLocaleString(undefined, { style: "currency", currency: "USD" });

export function CumulativeSpendChart({ data }: { data: CumulativePoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <ComposedChart data={data} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
        <CartesianGrid stroke="var(--chart-grid)" vertical={false} />
        <XAxis
          dataKey="date"
          tick={{ fill: "var(--chart-ink-muted)", fontSize: 12 }}
          axisLine={{ stroke: "var(--chart-axis)" }}
          tickLine={false}
          minTickGap={24}
        />
        <YAxis
          tick={{ fill: "var(--chart-ink-muted)", fontSize: 12 }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(v) => currency(v)}
          width={70}
        />
        <Tooltip
          formatter={(value: unknown) => currency(Number(value ?? 0))}
          contentStyle={{
            background: "var(--chart-surface)",
            border: "1px solid var(--chart-grid)",
            borderRadius: 6,
            fontSize: 12,
          }}
          labelStyle={{ color: "var(--chart-ink-secondary)" }}
        />
        <Area
          type="linear"
          dataKey="cumulative"
          stroke="var(--chart-sequential)"
          strokeWidth={2}
          fill="var(--chart-sequential)"
          fillOpacity={0.1}
          isAnimationActive={false}
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}
