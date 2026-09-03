import Link from "next/link";
import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { SummaryCards } from "./SummaryCards";
import { OverviewTabs } from "./OverviewTabs";
import { OverviewLayout } from "./OverviewLayout";
import { ForecastedSpendChart } from "./ForecastedSpendChart";
import { SpendByModelChart } from "./charts/SpendByModelChart";
import { SpendByProviderChart } from "./charts/SpendByProviderChart";
import { Card } from "@/components/ui/Card";
import { buttonVariants } from "@/components/ui/Button";
import {
  computeSummary,
  dailySpend,
  spendByModel,
  weeklySpendByProvider,
  type UsageRow,
} from "@/lib/dashboard/aggregate";
import { detectAnomalies } from "@/lib/dashboard/anomaly";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ connection?: string }>;
}) {
  const { connection: connectionParam } = await searchParams;
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

  let usageQuery = supabase
    .from("usage_records")
    .select("date, model, cost_usd, input_tokens, output_tokens, api_connections(provider)")
    .order("date", { ascending: true });
  if (selectedConnectionId) {
    usageQuery = usageQuery.eq("connection_id", selectedConnectionId);
  }
  const { data: usageRows } = await usageQuery.returns<UsageRow[]>();

  const rows = usageRows ?? [];
  const hasConnections = (connections?.length ?? 0) > 0;
  const hasUsage = rows.length > 0;
  const daily = dailySpend(rows);
  const spendWithAnomalies = detectAnomalies(daily);

  return (
    <div>
      <h1 className="text-2xl font-semibold text-foreground">Overview</h1>

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
            No usage data yet. Sync a connection to populate your dashboard.
          </p>
          <Link href="/dashboard/connections" className={buttonVariants({ className: "mt-3" })}>
            Go sync a connection
          </Link>
        </Card>
      ) : (
        <div className="mt-6">
          <OverviewLayout spendWithAnomalies={spendWithAnomalies}>
            <SummaryCards summary={computeSummary(rows)} />

            <section>
              <Suspense
                fallback={
                  <>
                    <h2 className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
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
                <h2 className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  Spend by model
                </h2>
                <Card className="mt-2">
                  <SpendByModelChart data={spendByModel(rows)} />
                </Card>
              </section>

              <section>
                <h2 className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  Spend by provider
                </h2>
                <Card className="mt-2">
                  {(() => {
                    const { data, providers } = weeklySpendByProvider(rows);
                    return <SpendByProviderChart data={data} providers={providers} />;
                  })()}
                </Card>
              </section>
            </div>
          </OverviewLayout>
        </div>
      )}
    </div>
  );
}
