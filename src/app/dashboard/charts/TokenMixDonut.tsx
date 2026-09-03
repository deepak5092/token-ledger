"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import type { TokenSplit } from "@/lib/dashboard/aggregate";

const compact = (n: number) =>
  Intl.NumberFormat(undefined, { notation: "compact", maximumFractionDigits: 1 }).format(n);

const COLORS = { Input: "var(--chart-series-3)", Output: "var(--chart-series-4)" } as const;

// A 2-slice donut with no other readout is a well-known anti-pattern (it's
// really a single ratio, better served by a number). This adds that
// number, bold, in the ring's own center -- a meter wearing a donut shape
// rather than a bare comparison pie.
export function TokenMixDonut({ split }: { split: TokenSplit }) {
  const total = split.input + split.output;
  const outputPct = total > 0 ? Math.round((split.output / total) * 100) : 0;
  const data = [
    { label: "Input", value: split.input },
    { label: "Output", value: split.output },
  ];

  return (
    <div className="relative">
      <ResponsiveContainer width="100%" height={260}>
        <PieChart margin={{ top: 8, right: 8, bottom: 8, left: 8 }}>
          <Pie
            data={data}
            dataKey="value"
            nameKey="label"
            innerRadius={70}
            outerRadius={100}
            paddingAngle={2}
            startAngle={90}
            endAngle={-270}
            isAnimationActive={false}
          >
            {data.map((d) => (
              <Cell key={d.label} fill={COLORS[d.label as keyof typeof COLORS]} stroke="var(--chart-surface)" strokeWidth={2} />
            ))}
          </Pie>
          <Tooltip
            formatter={(value: unknown, _name, item) => [compact(Number(value ?? 0)), item.payload.label]}
            contentStyle={{
              background: "var(--chart-surface)",
              border: "1px solid var(--chart-grid)",
              borderRadius: 6,
              fontSize: 12,
            }}
          />
        </PieChart>
      </ResponsiveContainer>

      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-semibold text-foreground">{outputPct}%</span>
        <span className="text-xs text-zinc-500 dark:text-zinc-400">output</span>
      </div>

      <div className="mt-1 flex justify-center gap-4 text-xs">
        <span className="flex items-center gap-1.5 text-zinc-600 dark:text-zinc-400">
          <span className="h-2.5 w-2.5 rounded-full" style={{ background: COLORS.Input }} aria-hidden />
          Input · {compact(split.input)}
        </span>
        <span className="flex items-center gap-1.5 text-zinc-600 dark:text-zinc-400">
          <span className="h-2.5 w-2.5 rounded-full" style={{ background: COLORS.Output }} aria-hidden />
          Output · {compact(split.output)}
        </span>
      </div>
    </div>
  );
}
