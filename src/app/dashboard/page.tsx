import Link from "next/link";
import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { SummaryCards } from "./SummaryCards";
import { AnomalyAlerts } from "./AnomalyAlerts";
import { BriefingCard } from "./BriefingCard";
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

export default async function DashboardPage() {
  const supabase = await createClient();

  const { data: connections } = await supabase.from("api_connections").select("id");

  const { data: usageRows } = await supabase
    .from("usage_records")
    .select("date, model, cost_usd, input_tokens, output_tokens, api_connections(provider)")
    .order("date", { ascending: true })
    .returns<UsageRow[]>();

  const rows = usageRows ?? [];
  const hasConnections = (connections?.length ?? 0) > 0;
  const hasUsage = rows.length > 0;
  const daily = dailySpend(rows);
  const spendWithAnomalies = detectAnomalies(daily);

  return (
    <div>
      <h1 className="text-2xl font-semibold text-foreground">Overview</h1>

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
        <div className="mt-6 space-y-8">
          <SummaryCards summary={computeSummary(rows)} />

          <BriefingCard />

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

          <section>
            <h2 className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Anomalies</h2>
            <div className="mt-2">
              <AnomalyAlerts points={spendWithAnomalies} />
            </div>
          </section>

          <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
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
        </div>
      )}
    </div>
  );
}
