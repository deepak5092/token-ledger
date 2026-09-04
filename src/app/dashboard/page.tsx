import Link from "next/link";
import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { SummaryCards } from "./SummaryCards";
import { OverviewTabs } from "./OverviewTabs";
import { DateRangePicker } from "./DateRangePicker";
import { OverviewLayout } from "./OverviewLayout";
import { ForecastedSpendChart } from "./ForecastedSpendChart";
import { SpendByModelChart } from "./charts/SpendByModelChart";
import { SpendByProviderChart } from "./charts/SpendByProviderChart";
import { TokensOverTimeChart } from "./charts/TokensOverTimeChart";
import { SpendVsTokensIndexChart } from "./charts/SpendVsTokensIndexChart";
import { CumulativeSpendChart } from "./charts/CumulativeSpendChart";
import { CumulativeTokensChart } from "./charts/CumulativeTokensChart";
import { SpendByModelDonut } from "./charts/SpendByModelDonut";
import { TokenMixDonut } from "./charts/TokenMixDonut";
import { SpendByDayOfWeekChart } from "./charts/SpendByDayOfWeekChart";
import { Card } from "@/components/ui/Card";
import { buttonVariants } from "@/components/ui/Button";
import {
  computeSummary,
  dailySpend,
  spendByModel,
  weeklySpendByProvider,
  tokensOverTime,
  indexedSpendVsTokens,
  cumulativeSpend,
  cumulativeTokens,
  tokenSplit,
  spendByDayOfWeek,
  foldOthers,
  type UsageRow,
} from "@/lib/dashboard/aggregate";
import { detectAnomalies } from "@/lib/dashboard/anomaly";

const PRESET_DAYS = new Set(["7", "30", "90"]);
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

const toISODate = (d: Date) => d.toISOString().slice(0, 10);

function resolveRange(rangeParam?: string, startParam?: string, endParam?: string) {
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  if (
    rangeParam === "custom" &&
    startParam &&
    endParam &&
    ISO_DATE.test(startParam) &&
    ISO_DATE.test(endParam)
  ) {
    let start = new Date(`${startParam}T00:00:00Z`);
    let end = new Date(`${endParam}T00:00:00Z`);
    if (!Number.isNaN(start.getTime()) && !Number.isNaN(end.getTime())) {
      if (start > end) [start, end] = [end, start];
      if (end > today) end = today;
      return { range: "custom" as const, start, end };
    }
  }

  const days = rangeParam && PRESET_DAYS.has(rangeParam) ? Number(rangeParam) : 30;
  const end = today;
  const start = new Date(today);
  start.setUTCDate(start.getUTCDate() - (days - 1));
  return { range: String(days) as "7" | "30" | "90", start, end };
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ connection?: string; range?: string; start?: string; end?: string }>;
}) {
  const { connection: connectionParam, range: rangeParam, start: startParam, end: endParam } =
    await searchParams;
  const supabase = await createClient();

  const { data: connections } = await supabase
    .from("api_connections")
    .select("id, provider, label");

  // Only trust the query param as a filter if it names a connection this
  // user actually owns (RLS would return zero rows for someone else's id
  // anyway, but this keeps an invalid/stale id from silently producing an
  // "Overview" that's actually filtered to nothing).
  const selectedConnectionId = connections?.some((c) => c.id === connectionParam)
    ? connectionParam
    : undefined;

  const { range, start: rangeStart, end: rangeEnd } = resolveRange(
    rangeParam,
    startParam,
    endParam,
  );
  const periodDays = Math.round((rangeEnd.getTime() - rangeStart.getTime()) / 86_400_000) + 1;
  const priorStart = new Date(rangeStart);
  priorStart.setUTCDate(priorStart.getUTCDate() - periodDays);
  const periodLabel = range === "custom" ? "vs prior period" : `vs prior ${range} days`;

  // Fetch the selected range plus an equal-length lookback so
  // computeSummary can still compare against the prior period; charts get
  // just the selected-range slice of this (see chartRows below).
  let usageQuery = supabase
    .from("usage_records")
    .select("date, model, cost_usd, input_tokens, output_tokens, api_connections(provider)")
    .gte("date", toISODate(priorStart))
    .lte("date", toISODate(rangeEnd))
    .order("date", { ascending: true });
  if (selectedConnectionId) {
    usageQuery = usageQuery.eq("connection_id", selectedConnectionId);
  }
  const { data: usageRows } = await usageQuery.returns<UsageRow[]>();

  const rows = usageRows ?? [];
  const rangeStartStr = toISODate(rangeStart);
  const rangeEndStr = toISODate(rangeEnd);
  const chartRows = rows.filter((r) => r.date >= rangeStartStr && r.date <= rangeEndStr);

  const hasConnections = (connections?.length ?? 0) > 0;
  const hasUsage = chartRows.length > 0;
  const daily = dailySpend(chartRows);
  const spendWithAnomalies = detectAnomalies(daily);

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl leading-none font-semibold text-foreground">AI Analytics</h1>
        {hasConnections && (
          <DateRangePicker
            key={`${range}-${rangeStartStr}-${rangeEndStr}`}
            range={range}
            start={range === "custom" ? rangeStartStr : undefined}
            end={range === "custom" ? rangeEndStr : undefined}
            connectionId={selectedConnectionId}
          />
        )}
      </div>

      {hasConnections && (
        <div className="mt-4">
          <OverviewTabs connections={connections ?? []} selectedId={selectedConnectionId} />
        </div>
      )}

      {!hasConnections ? (
        <Card className="mt-8 max-w-md text-center">
          <p className="text-zinc-700 dark:text-zinc-300">No provider connections yet.</p>
          <Link href="/dashboard/connections" className={buttonVariants({ className: "mt-3" })}>
            Connect a provider
          </Link>
        </Card>
      ) : !hasUsage ? (
        <Card className="mt-8 max-w-md text-center">
          <p className="text-zinc-700 dark:text-zinc-300">
            No usage data in this range. Try a wider range or sync a connection.
          </p>
          <Link href="/dashboard/connections" className={buttonVariants({ className: "mt-3" })}>
            Go sync a connection
          </Link>
        </Card>
      ) : (
        <div className="mt-6">
          <OverviewLayout spendWithAnomalies={spendWithAnomalies}>
            <SummaryCards
              summary={computeSummary(rows, { start: rangeStart, end: rangeEnd })}
              periodLabel={periodLabel}
            />

            <section>
              <Suspense
                fallback={
                  <>
                    <h2 className="text-base font-bold uppercase tracking-wide text-foreground">
                      Spend over time
                    </h2>
                    <Card className="mt-2 h-[260px] animate-pulse bg-zinc-100 dark:bg-zinc-900" />
                  </>
                }
              >
                <ForecastedSpendChart spendWithAnomalies={spendWithAnomalies} />
              </Suspense>
            </section>

            <div className="grid grid-cols-1 gap-8 sm:grid-cols-2">
              <section>
                <h2 className="text-base font-bold uppercase tracking-wide text-foreground">
                  Spend by model
                </h2>
                <Card className="mt-2">
                  <SpendByModelChart data={spendByModel(chartRows)} />
                </Card>
              </section>

              <section>
                <h2 className="text-base font-bold uppercase tracking-wide text-foreground">
                  Spend by provider
                </h2>
                <Card className="mt-2">
                  {(() => {
                    const { data, providers } = weeklySpendByProvider(chartRows);
                    return <SpendByProviderChart data={data} providers={providers} />;
                  })()}
                </Card>
              </section>
            </div>

            <section>
              <h2 className="text-base font-bold uppercase tracking-wide text-foreground">
                Tokens over time
              </h2>
              <Card className="mt-2">
                <TokensOverTimeChart data={tokensOverTime(chartRows)} />
              </Card>
            </section>

            <section>
              <h2 className="text-base font-bold uppercase tracking-wide text-foreground">
                Spend vs. tokens
                <span className="ml-2 text-xs font-normal normal-case tracking-normal text-zinc-400">
                  (indexed, day 1 = 100)
                </span>
              </h2>
              <Card className="mt-2">
                <SpendVsTokensIndexChart data={indexedSpendVsTokens(chartRows)} />
              </Card>
            </section>

            <div className="grid grid-cols-1 gap-8 sm:grid-cols-2">
              <section>
                <h2 className="text-base font-bold uppercase tracking-wide text-foreground">
                  Cumulative spend
                </h2>
                <Card className="mt-2">
                  <CumulativeSpendChart data={cumulativeSpend(chartRows)} />
                </Card>
              </section>

              <section>
                <h2 className="text-base font-bold uppercase tracking-wide text-foreground">
                  Cumulative tokens
                </h2>
                <Card className="mt-2">
                  <CumulativeTokensChart data={cumulativeTokens(chartRows)} />
                </Card>
              </section>
            </div>

            <div className="grid grid-cols-1 gap-8 sm:grid-cols-2">
              <section>
                <h2 className="text-base font-bold uppercase tracking-wide text-foreground">
                  Spend by model
                </h2>
                <Card className="mt-2">
                  <SpendByModelDonut data={foldOthers(spendByModel(chartRows), 5)} />
                </Card>
              </section>

              <section>
                <h2 className="text-base font-bold uppercase tracking-wide text-foreground">
                  Token mix
                </h2>
                <Card className="mt-2">
                  <TokenMixDonut split={tokenSplit(chartRows)} />
                </Card>
              </section>
            </div>

            <section>
              <h2 className="text-base font-bold uppercase tracking-wide text-foreground">
                Spend by day of week
              </h2>
              <Card className="mt-2">
                <SpendByDayOfWeekChart data={spendByDayOfWeek(chartRows)} />
              </Card>
            </section>
          </OverviewLayout>
        </div>
      )}
    </div>
  );
}
