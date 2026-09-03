import { createClient } from "@/lib/supabase/server";
import { workloadsByModel, type WorkloadUsageRow } from "@/lib/dashboard/simulator";
import { SimulatorForm } from "./SimulatorForm";

export default async function SimulatorPage() {
  const supabase = await createClient();

  const { data: usageRows } = await supabase
    .from("usage_records")
    .select("model, date, input_tokens, output_tokens, cost_usd")
    .returns<WorkloadUsageRow[]>();

  const workloads = workloadsByModel(usageRows ?? []);

  return (
    <div>
      <h1 className="text-2xl font-semibold text-foreground">Savings simulator</h1>
      <p className="mt-2 max-w-2xl text-sm text-zinc-600 dark:text-zinc-400">
        See what a workload would cost on a different model. These are
        estimates based on our own pricing list, not your actual bill, so
        real numbers may vary a little.
      </p>

      <div className="mt-8">
        <SimulatorForm workloads={workloads} />
      </div>
    </div>
  );
}
