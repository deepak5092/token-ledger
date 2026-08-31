export type WorkloadUsageRow = {
  model: string;
  date: string;
  input_tokens: number;
  output_tokens: number;
  cost_usd: number;
};

export type Workload = {
  model: string;
  monthlyInputTokens: number;
  monthlyOutputTokens: number;
  monthlyCost: number;
};

/**
 * Groups usage rows by model and scales each model's totals to a 30-day
 * month based on the actual span of dates observed for that model, so a
 * workload picked from a partial sync window still reads as "per month".
 */
export function workloadsByModel(rows: WorkloadUsageRow[]): Workload[] {
  type Acc = { input: number; output: number; cost: number; minDate: string; maxDate: string };
  const byModel = new Map<string, Acc>();

  for (const r of rows) {
    const entry = byModel.get(r.model) ?? {
      input: 0,
      output: 0,
      cost: 0,
      minDate: r.date,
      maxDate: r.date,
    };
    entry.input += r.input_tokens;
    entry.output += r.output_tokens;
    entry.cost += r.cost_usd;
    if (r.date < entry.minDate) entry.minDate = r.date;
    if (r.date > entry.maxDate) entry.maxDate = r.date;
    byModel.set(r.model, entry);
  }

  return Array.from(byModel.entries())
    .map(([model, e]) => {
      const spanDays =
        Math.round(
          (new Date(`${e.maxDate}T00:00:00Z`).getTime() -
            new Date(`${e.minDate}T00:00:00Z`).getTime()) /
            86_400_000,
        ) + 1;
      const scale = 30 / Math.max(1, spanDays);
      return {
        model,
        monthlyInputTokens: Math.round(e.input * scale),
        monthlyOutputTokens: Math.round(e.output * scale),
        monthlyCost: Math.round(e.cost * scale * 100) / 100,
      };
    })
    .sort((a, b) => b.monthlyCost - a.monthlyCost);
}
