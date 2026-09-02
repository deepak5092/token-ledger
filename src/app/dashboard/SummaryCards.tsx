import { DollarSign, TrendingUp, TrendingDown, Minus, Cpu, Coins, CalendarDays } from "lucide-react";
import { Card } from "@/components/ui/Card";
import type { SummaryStats } from "@/lib/dashboard/aggregate";

const currency = (n: number) =>
  n.toLocaleString(undefined, { style: "currency", currency: "USD" });

const compactNumber = (n: number) =>
  Intl.NumberFormat(undefined, { notation: "compact", maximumFractionDigits: 1 }).format(n);

const truncate = (s: string, max = 32) => (s.length > max ? `${s.slice(0, max - 1)}…` : s);

function Delta({ pctChange }: { pctChange: number | null }) {
  const Icon = pctChange === null ? Minus : pctChange > 0 ? TrendingUp : TrendingDown;
  return (
    <p
      className={`mt-1 flex items-center gap-1 text-sm font-medium ${
        pctChange === null
          ? "text-zinc-500"
          : pctChange > 0
            ? "text-red-600 dark:text-red-400"
            : "text-green-600 dark:text-green-400"
      }`}
    >
      <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden />
      {pctChange === null ? "-" : `${pctChange > 0 ? "+" : ""}${pctChange}%`}
      <span className="font-normal text-zinc-500">vs prior 30 days</span>
    </p>
  );
}

export function SummaryCards({ summary }: { summary: SummaryStats }) {
  const { totalThisPeriod, pctChange, mostExpensiveModel, totalTokens, tokensPctChange, avgCostPerDay } =
    summary;

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <Card>
        <div className="flex items-center gap-2 text-xs text-zinc-500">
          <DollarSign className="h-3.5 w-3.5" aria-hidden />
          Total spend, last 30 days
        </div>
        <p className="mt-1 text-2xl font-semibold text-foreground">{currency(totalThisPeriod)}</p>
        <Delta pctChange={pctChange} />
      </Card>

      <Card>
        <div className="flex items-center gap-2 text-xs text-zinc-500">
          <Coins className="h-3.5 w-3.5" aria-hidden />
          Total token usage
        </div>
        <p className="mt-1 text-2xl font-semibold text-foreground">{compactNumber(totalTokens)}</p>
        <Delta pctChange={tokensPctChange} />
      </Card>

      <Card>
        <div className="flex items-center gap-2 text-xs text-zinc-500">
          <CalendarDays className="h-3.5 w-3.5" aria-hidden />
          Average cost per day
        </div>
        <p className="mt-1 text-2xl font-semibold text-foreground">{currency(avgCostPerDay)}</p>
        <Delta pctChange={pctChange} />
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
