import { SpendOverTimeChart } from "./charts/SpendOverTimeChart";
import { Card } from "@/components/ui/Card";
import { mergeForecast } from "@/lib/dashboard/forecast-chart";
import { fetchForecast } from "@/lib/forecast/client";
import type { AnomalyPoint } from "@/lib/dashboard/anomaly";

// Isolated behind its own Suspense boundary in dashboard/page.tsx: the
// forecast call hits a Python function (numpy/pandas/statsmodels) that can
// have a multi-second cold start, and there's no reason that should block
// the rest of the dashboard (summary cards, other charts) from painting.
export async function ForecastedSpendChart({
  spendWithAnomalies,
}: {
  spendWithAnomalies: AnomalyPoint[];
}) {
  const forecast = await fetchForecast(
    spendWithAnomalies.map(({ date, cost }) => ({ date, cost })),
  );
  const chartData = mergeForecast(spendWithAnomalies, forecast);

  return (
    <>
      <h2 className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
        Spend over time
        {!forecast && (
          <span className="ml-2 text-xs font-normal text-zinc-400">
            (forecast unavailable)
          </span>
        )}
      </h2>
      <Card className="mt-2">
        <SpendOverTimeChart data={chartData} />
      </Card>
    </>
  );
}
