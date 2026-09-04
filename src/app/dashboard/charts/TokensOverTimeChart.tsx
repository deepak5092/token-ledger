"use client";

import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { TooltipContentProps } from "recharts";
import type { TokenPoint } from "@/lib/dashboard/aggregate";

const compact = (n: number) =>
  Intl.NumberFormat(undefined, { notation: "compact", maximumFractionDigits: 1 }).format(n);

const SERIES = [
  { key: "input", label: "Input tokens", color: "var(--chart-series-3)" },
  { key: "output", label: "Output tokens", color: "var(--chart-series-4)" },
] as const;

function ChartTooltip({ active, payload, label }: TooltipContentProps) {
  if (!active || !payload || payload.length === 0) return null;

  return (
    <div
      style={{
        background: "var(--chart-surface)",
        border: "1px solid var(--chart-grid)",
        borderRadius: 6,
        padding: "6px 10px",
        fontSize: 12,
      }}
    >
      <div style={{ color: "var(--chart-ink-secondary)" }}>{label}</div>
      {SERIES.map((s) => {
        const entry = payload.find((p) => p.dataKey === s.key);
        if (entry == null || entry.value == null) return null;
        return (
          <div key={s.key} style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span
              aria-hidden
              style={{ display: "inline-block", width: 10, height: 2, background: s.color }}
            />
            <span style={{ color: "var(--chart-ink-secondary)" }}>{s.label}</span>
            <span style={{ color: "var(--chart-ink-secondary)", fontWeight: 600 }}>
              {compact(Number(entry.value))}
            </span>
          </div>
        );
      })}
    </div>
  );
}

export function TokensOverTimeChart({ data }: { data: TokenPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <LineChart data={data} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
        <CartesianGrid stroke="var(--chart-grid)" vertical={false} />
        <XAxis
          dataKey="date"
          tick={{ fill: "var(--chart-ink-muted)", fontSize: 12 }}
          axisLine={{ stroke: "var(--chart-axis)" }}
          tickLine={false}
          minTickGap={24}
          padding={{ left: 16, right: 16 }}
        />
        <YAxis
          tick={{ fill: "var(--chart-ink-muted)", fontSize: 12 }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(v) => compact(v)}
          width={56}
        />
        <Tooltip content={ChartTooltip} />
        <Legend
          formatter={(value: string) => (
            <span style={{ color: "var(--chart-ink-secondary)", fontSize: 12 }}>
              {SERIES.find((s) => s.key === value)?.label ?? value}
            </span>
          )}
        />
        {SERIES.map((s) => (
          <Line
            key={s.key}
            type="linear"
            dataKey={s.key}
            name={s.key}
            stroke={s.color}
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4 }}
            isAnimationActive={false}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}
