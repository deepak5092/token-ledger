import type { SummaryStats } from "@/lib/dashboard/aggregate";

const currency = (n: number) =>
  n.toLocaleString(undefined, { style: "currency", currency: "USD" });

const truncate = (s: string, max = 32) => (s.length > max ? `${s.slice(0, max - 1)}…` : s);

export function SummaryCards({ summary }: { summary: SummaryStats }) {
  const { totalThisPeriod, pctChange, mostExpensiveModel } = summary;

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      <div className="rounded border border-zinc-200 p-4 dark:border-zinc-800">
        <p className="text-xs text-zinc-500">Spend, last 30 days</p>
        <p className="mt-1 text-2xl font-semibold text-black dark:text-zinc-50">
          {currency(totalThisPeriod)}
        </p>
      </div>
      <div className="rounded border border-zinc-200 p-4 dark:border-zinc-800">
        <p className="text-xs text-zinc-500">Vs. previous 30 days</p>
        <p
          className={`mt-1 text-2xl font-semibold ${
            pctChange === null
              ? "text-black dark:text-zinc-50"
              : pctChange > 0
                ? "text-red-600 dark:text-red-400"
                : "text-green-600 dark:text-green-400"
          }`}
        >
          {pctChange === null ? "—" : `${pctChange > 0 ? "+" : ""}${pctChange}%`}
        </p>
      </div>
      <div className="rounded border border-zinc-200 p-4 dark:border-zinc-800">
        <p className="text-xs text-zinc-500">Most expensive model</p>
        <p
          className="mt-1 text-lg font-semibold text-black dark:text-zinc-50"
          title={mostExpensiveModel ?? undefined}
        >
          {mostExpensiveModel ? truncate(mostExpensiveModel) : "—"}
        </p>
      </div>
    </div>
  );
}
