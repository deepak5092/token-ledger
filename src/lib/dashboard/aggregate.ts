export type UsageRow = {
  date: string;
  model: string;
  cost_usd: number;
  input_tokens: number;
  output_tokens: number;
  api_connections: { provider: string } | null;
};

export type DailySpendPoint = { date: string; cost: number };
export type ModelSpendPoint = { model: string; cost: number };
export type ProviderWeekPoint = { week: string; [provider: string]: number | string };

const round = (n: number) => Math.round(n * 10000) / 10000;

export function dailySpend(rows: UsageRow[]): DailySpendPoint[] {
  const byDate = new Map<string, number>();
  for (const r of rows) {
    byDate.set(r.date, (byDate.get(r.date) ?? 0) + r.cost_usd);
  }
  return Array.from(byDate.entries())
    .map(([date, cost]) => ({ date, cost: round(cost) }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

export function spendByModel(rows: UsageRow[]): ModelSpendPoint[] {
  const byModel = new Map<string, number>();
  for (const r of rows) {
    byModel.set(r.model, (byModel.get(r.model) ?? 0) + r.cost_usd);
  }
  return Array.from(byModel.entries())
    .map(([model, cost]) => ({ model, cost: round(cost) }))
    .sort((a, b) => b.cost - a.cost);
}

export type ProviderSpendPoint = { provider: string; cost: number };

export function spendByProvider(rows: UsageRow[]): ProviderSpendPoint[] {
  const byProvider = new Map<string, number>();
  for (const r of rows) {
    const provider = r.api_connections?.provider ?? "unknown";
    byProvider.set(provider, (byProvider.get(provider) ?? 0) + r.cost_usd);
  }
  return Array.from(byProvider.entries())
    .map(([provider, cost]) => ({ provider, cost: round(cost) }))
    .sort((a, b) => b.cost - a.cost);
}

function startOfIsoWeek(dateStr: string): string {
  const d = new Date(`${dateStr}T00:00:00Z`);
  const day = d.getUTCDay();
  const diff = d.getUTCDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(d);
  monday.setUTCDate(diff);
  return monday.toISOString().slice(0, 10);
}

export function weeklySpendByProvider(rows: UsageRow[]): {
  data: ProviderWeekPoint[];
  providers: string[];
} {
  const providersSet = new Set<string>();
  const byWeek = new Map<string, Record<string, number>>();

  for (const r of rows) {
    const provider = r.api_connections?.provider ?? "unknown";
    providersSet.add(provider);
    const week = startOfIsoWeek(r.date);
    const entry = byWeek.get(week) ?? {};
    entry[provider] = (entry[provider] ?? 0) + r.cost_usd;
    byWeek.set(week, entry);
  }

  const providers = Array.from(providersSet).sort();
  const data = Array.from(byWeek.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([week, values]) => {
      const point: ProviderWeekPoint = { week };
      for (const p of providers) point[p] = round(values[p] ?? 0);
      return point;
    });

  return { data, providers };
}

export type SummaryStats = {
  totalThisPeriod: number;
  totalPreviousPeriod: number;
  pctChange: number | null;
  mostExpensiveModel: string | null;
  totalTokens: number;
  tokensPctChange: number | null;
  avgCostPerDay: number;
};

function pctChangeOf(current: number, previous: number): number | null {
  if (previous <= 0) return null;
  return Math.round(((current - previous) / previous) * 1000) / 10;
}

export function computeSummary(rows: UsageRow[], periodDays = 30): SummaryStats {
  const today = new Date();
  const cutoff = new Date(today);
  cutoff.setUTCDate(cutoff.getUTCDate() - periodDays);
  const prevCutoff = new Date(cutoff);
  prevCutoff.setUTCDate(prevCutoff.getUTCDate() - periodDays);

  let totalThisPeriod = 0;
  let totalPreviousPeriod = 0;
  let tokensThisPeriod = 0;
  let tokensPreviousPeriod = 0;

  for (const r of rows) {
    const d = new Date(`${r.date}T00:00:00Z`);
    const tokens = (r.input_tokens ?? 0) + (r.output_tokens ?? 0);
    if (d >= cutoff) {
      totalThisPeriod += r.cost_usd;
      tokensThisPeriod += tokens;
    } else if (d >= prevCutoff) {
      totalPreviousPeriod += r.cost_usd;
      tokensPreviousPeriod += tokens;
    }
  }

  const pctChange = pctChangeOf(totalThisPeriod, totalPreviousPeriod);
  const modelTotals = spendByModel(rows);

  return {
    totalThisPeriod: Math.round(totalThisPeriod * 100) / 100,
    totalPreviousPeriod: Math.round(totalPreviousPeriod * 100) / 100,
    pctChange,
    mostExpensiveModel: modelTotals[0]?.model ?? null,
    totalTokens: tokensThisPeriod,
    tokensPctChange: pctChangeOf(tokensThisPeriod, tokensPreviousPeriod),
    // Same numerator/denominator ratio as pctChange (both totals divided by
    // the same periodDays), so it shares that delta rather than computing
    // its own.
    avgCostPerDay: Math.round((totalThisPeriod / periodDays) * 100) / 100,
  };
}
