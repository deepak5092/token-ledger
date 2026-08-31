"use client";

import {
  Area,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import type { TooltipContentProps } from "recharts";
import type { ChartPoint } from "@/lib/dashboard/forecast-chart";

const currency = (n: number) =>
  n.toLocaleString(undefined, { style: "currency", currency: "USD" });

type AnomalyDotProps = {
  cx?: number;
  cy?: number;
  index?: number;
  payload?: ChartPoint;
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

function ChartTooltip({ active, payload, label }: TooltipContentProps) {
  if (!active || !payload || payload.length === 0) return null;
  const point = payload[0]?.payload as ChartPoint | undefined;
  if (!point) return null;

  const isForecast = point.forecastCost != null && point.cost == null;
  const value = isForecast ? point.forecastCost : point.cost;
  if (value == null) return null;

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
      <div style={{ color: "var(--chart-ink-secondary)" }}>
        {label}
        {point.isAnomaly ? ` — ${point.ratio}x 7-day average ⚠` : ""}
        {isForecast ? " (forecast)" : ""}
      </div>
      <div style={{ color: "var(--chart-sequential)" }}>{currency(value)}</div>
      {isForecast && point.forecastLower != null && point.forecastUpper != null && (
        <div style={{ color: "var(--chart-ink-muted)" }}>
          {currency(point.forecastLower)} – {currency(point.forecastUpper)}
        </div>
      )}
    </div>
  );
}

export function SpendOverTimeChart({ data }: { data: ChartPoint[] }) {
  const chartData = data.map((d) => ({
    ...d,
    bandBase: d.forecastLower,
    bandHeight:
      d.forecastLower != null && d.forecastUpper != null
        ? d.forecastUpper - d.forecastLower
        : undefined,
  }));

  return (
    <ResponsiveContainer width="100%" height={260}>
      <ComposedChart data={chartData} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
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
        <Tooltip content={ChartTooltip} />
        <Area
          dataKey="bandBase"
          stackId="band"
          stroke="none"
          fill="transparent"
          isAnimationActive={false}
        />
        <Area
          dataKey="bandHeight"
          stackId="band"
          stroke="none"
          fill="var(--chart-sequential)"
          fillOpacity={0.15}
          isAnimationActive={false}
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
        <Line
          type="linear"
          dataKey="forecastCost"
          stroke="var(--chart-sequential)"
          strokeWidth={2}
          strokeDasharray="5 4"
          dot={false}
          isAnimationActive={false}
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}
