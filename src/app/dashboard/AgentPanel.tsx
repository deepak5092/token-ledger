import { BriefingCard } from "./BriefingCard";
import { AnomalyAlerts } from "./AnomalyAlerts";
import { MiniChat } from "./MiniChat";
import type { AnomalyPoint } from "@/lib/dashboard/anomaly";

// Everything AI-driven on Overview, grouped into one docked column instead
// of scattered between the charts -- same idea as Databricks/Snowflake's
// assistant rail. Forecast chart and stat tiles stay in the main column
// since they're statistical (Holt-Winters, arithmetic), not agent-driven.
export function AgentPanel({ spendWithAnomalies }: { spendWithAnomalies: AnomalyPoint[] }) {
  return (
    <div className="space-y-6">
      <h2 className="text-sm font-medium text-zinc-700 dark:text-zinc-300">AI insights</h2>

      <BriefingCard />

      <div>
        <h3 className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Anomalies</h3>
        <div className="mt-2">
          <AnomalyAlerts points={spendWithAnomalies} />
        </div>
      </div>

      <MiniChat />
    </div>
  );
}
