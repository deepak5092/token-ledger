"use client";

import {
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import type { AnomalyPoint } from "@/lib/dashboard/anomaly";

const currency = (n: number) =>
  n.toLocaleString(undefined, { style: "currency", currency: "USD" });

type AnomalyDotProps = {
  cx?: number;
  cy?: number;
  index?: number;
  payload?: AnomalyPoint;
};

function AnomalyDot(props: AnomalyDotProps) {
  const { cx, cy, payload, index } = props;
  if (cx == null || cy == null) return <g key={`dot-${index}`} />;

  if (!payload?.isAnomaly) {
    // Invisible dot: keeps Recharts' dot-per-point contract without drawing
    // a mark on every day — only anomalies get a visible marker.
    return <circle key={`dot-${index}`} cx={cx} cy={cy} r={0} />;
  }

  return (
    <circle
      key={`dot-${index}`}
      cx={cx}
      cy={cy}
      r={5}
      fill="var(--status-critical)"
      stroke="var(--chart-surface)"
      strokeWidth={1.5}
    />
  );
}

export function SpendOverTimeChart({ data }: { data: AnomalyPoint[] }) {
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
          tickFormatter={(v) => currency(v)}
          width={70}
        />
        <Tooltip
          formatter={(value: unknown) => currency(Number(value ?? 0))}
          labelFormatter={(label, tooltipPayload) => {
            const point = tooltipPayload?.[0]?.payload as AnomalyPoint | undefined;
            if (point?.isAnomaly) {
              return `${label} — ${point.ratio}x 7-day average ⚠`;
            }
            return label;
          }}
          contentStyle={{
            background: "var(--chart-surface)",
            border: "1px solid var(--chart-grid)",
            borderRadius: 6,
            fontSize: 12,
          }}
          labelStyle={{ color: "var(--chart-ink-secondary)" }}
        />
        <Line
          type="linear"
          dataKey="cost"
          stroke="var(--chart-sequential)"
          strokeWidth={2}
          dot={<AnomalyDot />}
          activeDot={{ r: 4 }}
          isAnimationActive={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
