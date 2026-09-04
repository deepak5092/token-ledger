import type { UsageRow } from "@/lib/dashboard/aggregate";

// The set of numeric measures a dynamically-built report can point at --
// deliberately small and orthogonal (never overlapping units) so any
// combination a user asks for ("just output tokens", "cost vs total
// tokens") composes cleanly instead of needing a preset per combination.
export const METRICS = ["cost", "input_tokens", "output_tokens", "total_tokens"] as const;
export type Metric = (typeof METRICS)[number];

export function isMetric(value: string): value is Metric {
  return (METRICS as readonly string[]).includes(value);
}

export const METRIC_LABEL: Record<Metric, string> = {
  cost: "Spend",
  input_tokens: "Input tokens",
  output_tokens: "Output tokens",
  total_tokens: "Total tokens",
};

export const METRIC_UNIT: Record<Metric, "usd" | "count"> = {
  cost: "usd",
  input_tokens: "count",
  output_tokens: "count",
  total_tokens: "count",
};

export function formatMetricValue(metric: Metric, value: number): string {
  if (METRIC_UNIT[metric] === "usd") return `$${value.toFixed(2)}`;
  return Math.round(value).toLocaleString("en-US");
}

function metricValue(row: UsageRow, metric: Metric): number {
  switch (metric) {
    case "cost":
      return row.cost_usd;
    case "input_tokens":
      return row.input_tokens ?? 0;
    case "output_tokens":
      return row.output_tokens ?? 0;
    case "total_tokens":
      return (row.input_tokens ?? 0) + (row.output_tokens ?? 0);
  }
}

const round = (n: number) => Math.round(n * 10000) / 10000;

export type DayPoint = { date: string; value: number; movingAvg: number | null };

// Same trailing, inclusive-of-today window as aggregate.ts's
// movingAverageSpend, generalized to any metric rather than just cost.
export function dailyMetric(rows: UsageRow[], metric: Metric, movingAverageWindow: number | null): DayPoint[] {
  const byDate = new Map<string, number>();
  for (const r of rows) {
    byDate.set(r.date, (byDate.get(r.date) ?? 0) + metricValue(r, metric));
  }
  const points = Array.from(byDate.entries())
    .map(([date, value]) => ({ date, value: round(value) }))
    .sort((a, b) => a.date.localeCompare(b.date));

  if (!movingAverageWindow || movingAverageWindow < 1) {
    return points.map((p) => ({ ...p, movingAvg: null }));
  }
  return points.map((point, i) => {
    if (i + 1 < movingAverageWindow) return { ...point, movingAvg: null };
    const window = points.slice(i - movingAverageWindow + 1, i + 1);
    const avg = window.reduce((sum, p) => sum + p.value, 0) / movingAverageWindow;
    return { ...point, movingAvg: round(avg) };
  });
}

export type GroupPoint = { label: string; value: number };

export function groupedMetric(
  rows: UsageRow[],
  metric: Metric,
  groupBy: "model" | "provider",
): GroupPoint[] {
  const byLabel = new Map<string, number>();
  for (const r of rows) {
    const label = groupBy === "model" ? r.model : (r.api_connections?.provider ?? "unknown");
    byLabel.set(label, (byLabel.get(label) ?? 0) + metricValue(r, metric));
  }
  return Array.from(byLabel.entries())
    .map(([label, value]) => ({ label, value: round(value) }))
    .sort((a, b) => b.value - a.value);
}

// Indexes a day-series to its own first non-zero value = 100, so metrics on
// completely different scales (dollars vs. raw token counts) can share one
// axis on a comparison chart without a misleading dual-axis overlay.
export function indexToBase(points: DayPoint[]): (number | null)[] {
  const base = points.find((p) => p.value > 0)?.value;
  if (!base) return points.map(() => null);
  return points.map((p) => round((p.value / base) * 100));
}
