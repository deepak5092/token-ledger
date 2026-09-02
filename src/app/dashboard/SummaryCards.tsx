import { DollarSign, TrendingUp, TrendingDown, Minus, Cpu } from "lucide-react";
import { Card } from "@/components/ui/Card";
import type { SummaryStats } from "@/lib/dashboard/aggregate";

const currency = (n: number) =>
  n.toLocaleString(undefined, { style: "currency", currency: "USD" });

const truncate = (s: string, max = 32) => (s.length > max ? `${s.slice(0, max - 1)}…` : s);

export function SummaryCards({ summary }: { summary: SummaryStats }) {
  const { totalThisPeriod, pctChange, mostExpensiveModel } = summary;

  const TrendIcon = pctChange === null ? Minus : pctChange > 0 ? TrendingUp : TrendingDown;

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      <Card>
        <div className="flex items-center gap-2 text-xs text-zinc-500">
          <DollarSign className="h-3.5 w-3.5" aria-hidden />
          Spend, last 30 days
        </div>
        <p className="mt-1 text-2xl font-semibold text-foreground">{currency(totalThisPeriod)}</p>
      </Card>
      <Card>
        <p className="text-xs text-zinc-500">Vs. previous 30 days</p>
        <p
          className={`mt-1 flex items-center gap-1 text-2xl font-semibold ${
            pctChange === null
              ? "text-foreground"
              : pctChange > 0
                ? "text-red-600 dark:text-red-400"
                : "text-green-600 dark:text-green-400"
          }`}
        >
          <TrendIcon className="h-5 w-5 shrink-0" aria-hidden />
          {pctChange === null ? "-" : `${pctChange > 0 ? "+" : ""}${pctChange}%`}
        </p>
      </Card>
      <Card>
        <div className="flex items-center gap-2 text-xs text-zinc-500">
          <Cpu className="h-3.5 w-3.5" aria-hidden />
          Most expensive model
        </div>
        <p
          className="mt-1 truncate text-lg font-semibold text-foreground"
          title={mostExpensiveModel ?? undefined}
        >
          {mostExpensiveModel ? truncate(mostExpensiveModel) : "-"}
        </p>
      </Card>
    </div>
  );
}
