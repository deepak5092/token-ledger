"use client";

import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { ProviderWeekPoint } from "@/lib/dashboard/aggregate";
import { PROVIDER_COLOR, PROVIDER_LABEL } from "@/lib/providers/colors";

const currency = (n: number) =>
  n.toLocaleString(undefined, { style: "currency", currency: "USD" });

export function SpendByProviderChart({
  data,
  providers,
}: {
  data: ProviderWeekPoint[];
  providers: string[];
}) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
        <CartesianGrid stroke="var(--chart-grid)" vertical={false} />
        <XAxis
          dataKey="week"
          tick={{ fill: "var(--chart-ink-muted)", fontSize: 12 }}
          axisLine={{ stroke: "var(--chart-axis)" }}
          tickLine={false}
        />
        <YAxis
          tick={{ fill: "var(--chart-ink-muted)", fontSize: 12 }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(v) => currency(v)}
          width={70}
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
        {providers.length > 1 && (
          <Legend
            formatter={(value: string) => (
              <span style={{ color: "var(--chart-ink-secondary)", fontSize: 12 }}>
                {PROVIDER_LABEL[value] ?? value}
              </span>
            )}
          />
        )}
        {providers.map((p) => (
          <Bar
            key={p}
            dataKey={p}
            stackId="spend"
            fill={PROVIDER_COLOR[p] ?? "var(--chart-series-8)"}
            name={p}
            radius={providers.indexOf(p) === providers.length - 1 ? [3, 3, 0, 0] : undefined}
            isAnimationActive={false}
            activeBar={{ fillOpacity: 0.75 }}
          />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}
