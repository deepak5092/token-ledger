import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { logout } from "./actions";
import { SummaryCards } from "./SummaryCards";
import { AnomalyAlerts } from "./AnomalyAlerts";
import { SpendOverTimeChart } from "./charts/SpendOverTimeChart";
import { SpendByModelChart } from "./charts/SpendByModelChart";
import { SpendByProviderChart } from "./charts/SpendByProviderChart";
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
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: connections } = await supabase.from("api_connections").select("id");

  const { data: usageRows } = await supabase
    .from("usage_records")
    .select("date, model, cost_usd, api_connections(provider)")
    .order("date", { ascending: true })
    .returns<UsageRow[]>();

  const rows = usageRows ?? [];
  const hasConnections = (connections?.length ?? 0) > 0;
  const hasUsage = rows.length > 0;
  const spendWithAnomalies = detectAnomalies(dailySpend(rows));

  return (
    <div className="min-h-screen bg-zinc-50 p-8 dark:bg-black">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-black dark:text-zinc-50">
          Dashboard
        </h1>
        <div className="flex items-center gap-4">
          <Link
            href="/dashboard/connections"
            className="text-sm font-medium underline"
          >
            Manage connections
          </Link>
          <form action={logout}>
            <button
              type="submit"
              className="rounded border border-zinc-300 px-3 py-1.5 text-sm text-zinc-700 dark:border-zinc-700 dark:text-zinc-300"
            >
              Log out
            </button>
          </form>
        </div>
      </div>
      <p className="mt-1 text-sm text-zinc-500">Signed in as {user?.email}</p>

      {!hasConnections ? (
        <div className="mt-12 max-w-md rounded border border-zinc-200 p-6 text-center dark:border-zinc-800">
          <p className="text-zinc-700 dark:text-zinc-300">
            No provider connections yet.
          </p>
          <Link
            href="/dashboard/connections"
            className="mt-3 inline-block rounded bg-black px-4 py-2 text-sm text-white dark:bg-white dark:text-black"
          >
            Connect a provider
          </Link>
        </div>
      ) : !hasUsage ? (
        <div className="mt-12 max-w-md rounded border border-zinc-200 p-6 text-center dark:border-zinc-800">
          <p className="text-zinc-700 dark:text-zinc-300">
            No usage data yet — sync a connection to populate your dashboard.
          </p>
          <Link
            href="/dashboard/connections"
            className="mt-3 inline-block rounded bg-black px-4 py-2 text-sm text-white dark:bg-white dark:text-black"
          >
            Go sync a connection
          </Link>
        </div>
      ) : (
        <div className="mt-8 space-y-8">
          <SummaryCards summary={computeSummary(rows)} />

          <section>
            <h2 className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Spend over time
            </h2>
            <div className="mt-2 rounded border border-zinc-200 p-4 dark:border-zinc-800">
              <SpendOverTimeChart data={spendWithAnomalies} />
            </div>
          </section>

          <section>
            <h2 className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Anomalies
            </h2>
            <div className="mt-2">
              <AnomalyAlerts points={spendWithAnomalies} />
            </div>
          </section>

          <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
            <section>
              <h2 className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Spend by model
              </h2>
              <div className="mt-2 rounded border border-zinc-200 p-4 dark:border-zinc-800">
                <SpendByModelChart data={spendByModel(rows)} />
              </div>
            </section>

            <section>
              <h2 className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Spend by provider
              </h2>
              <div className="mt-2 rounded border border-zinc-200 p-4 dark:border-zinc-800">
                {(() => {
                  const { data, providers } = weeklySpendByProvider(rows);
                  return <SpendByProviderChart data={data} providers={providers} />;
                })()}
              </div>
            </section>
          </div>
        </div>
      )}
    </div>
  );
}
