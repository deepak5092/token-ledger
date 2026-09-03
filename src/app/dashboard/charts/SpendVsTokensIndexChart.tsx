"use client";

import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { TooltipContentProps } from "recharts";
import type { IndexedPoint } from "@/lib/dashboard/aggregate";

const currency = (n: number) =>
  n.toLocaleString(undefined, { style: "currency", currency: "USD" });
const compact = (n: number) =>
  Intl.NumberFormat(undefined, { notation: "compact", maximumFractionDigits: 1 }).format(n);

const SERIES = [
  { key: "spendIndex", label: "Spend", color: "var(--chart-sequential)" },
  { key: "tokensIndex", label: "Tokens", color: "var(--chart-series-7)" },
] as const;

// Points where a series' index is null (no spend/tokens yet that day) are
// carried in `data` but Recharts just leaves a gap in that line -- the
// tooltip below only renders series that have a real value at this X.
function ChartTooltip({ active, payload, label }: TooltipContentProps) {
  if (!active || !payload || payload.length === 0) return null;
  const point = payload[0]?.payload as IndexedPoint | undefined;
  if (!point) return null;

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
      {point.spendIndex != null && (
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span
            aria-hidden
            style={{ display: "inline-block", width: 10, height: 2, background: SERIES[0].color }}
          />
          <span style={{ color: "var(--chart-ink-secondary)" }}>Spend</span>
          <span style={{ color: "var(--chart-ink-secondary)", fontWeight: 600 }}>
            {currency(point.cost)} ({point.spendIndex})
          </span>
        </div>
      )}
      {point.tokensIndex != null && (
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span
            aria-hidden
            style={{ display: "inline-block", width: 10, height: 2, background: SERIES[1].color }}
          />
          <span style={{ color: "var(--chart-ink-secondary)" }}>Tokens</span>
          <span style={{ color: "var(--chart-ink-secondary)", fontWeight: 600 }}>
            {compact(point.tokens)} ({point.tokensIndex})
          </span>
        </div>
      )}
    </div>
  );
}

export function SpendVsTokensIndexChart({ data }: { data: IndexedPoint[] }) {
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
        />
        <YAxis
          tick={{ fill: "var(--chart-ink-muted)", fontSize: 12 }}
          axisLine={false}
          tickLine={false}
          width={40}
          label={{
            value: "Index (day 1 = 100)",
            angle: -90,
            position: "insideLeft",
            style: { fill: "var(--chart-ink-muted)", fontSize: 11 },
          }}
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
            connectNulls
            isAnimationActive={false}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}
