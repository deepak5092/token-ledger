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

export type TokenPoint = { date: string; input: number; output: number };

export function tokensOverTime(rows: UsageRow[]): TokenPoint[] {
  const byDate = new Map<string, { input: number; output: number }>();
  for (const r of rows) {
    const entry = byDate.get(r.date) ?? { input: 0, output: 0 };
    entry.input += r.input_tokens ?? 0;
    entry.output += r.output_tokens ?? 0;
    byDate.set(r.date, entry);
  }
  return Array.from(byDate.entries())
    .map(([date, { input, output }]) => ({ date, input, output }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

export type IndexedPoint = {
  date: string;
  cost: number;
  tokens: number;
  spendIndex: number | null;
  tokensIndex: number | null;
};

// Indexes both series to their own first non-zero day = 100 instead of a
// dual-axis overlay (misleading: arbitrary axis scaling can invent a
// correlation that isn't there) -- one shared axis, so the reader sees
// which of the two is actually growing faster. The tooltip still carries
// the real $ and token values, since an index number alone isn't
// meaningful on its own.
export function indexedSpendVsTokens(rows: UsageRow[]): IndexedPoint[] {
  const byDate = new Map<string, { cost: number; tokens: number }>();
  for (const r of rows) {
    const entry = byDate.get(r.date) ?? { cost: 0, tokens: 0 };
    entry.cost += r.cost_usd;
    entry.tokens += (r.input_tokens ?? 0) + (r.output_tokens ?? 0);
    byDate.set(r.date, entry);
  }
  const sorted = Array.from(byDate.entries()).sort(([a], [b]) => a.localeCompare(b));
  const costBase = sorted.find(([, v]) => v.cost > 0)?.[1].cost;
  const tokensBase = sorted.find(([, v]) => v.tokens > 0)?.[1].tokens;

  return sorted.map(([date, { cost, tokens }]) => ({
    date,
    cost: round(cost),
    tokens,
    spendIndex: costBase ? round((cost / costBase) * 100) : null,
    tokensIndex: tokensBase ? round((tokens / tokensBase) * 100) : null,
  }));
}

export type CumulativePoint = { date: string; cumulative: number };

export function cumulativeSpend(rows: UsageRow[]): CumulativePoint[] {
  let running = 0;
  return dailySpend(rows).map((d) => {
    running += d.cost;
    return { date: d.date, cumulative: round(running) };
  });
}

export function cumulativeTokens(rows: UsageRow[]): CumulativePoint[] {
  const byDate = new Map<string, number>();
  for (const r of rows) {
    byDate.set(r.date, (byDate.get(r.date) ?? 0) + (r.input_tokens ?? 0) + (r.output_tokens ?? 0));
  }
  const sorted = Array.from(byDate.entries()).sort(([a], [b]) => a.localeCompare(b));
  let running = 0;
  return sorted.map(([date, tokens]) => {
    running += tokens;
    return { date, cumulative: running };
  });
}

export type TokenSplit = { input: number; output: number };

export function tokenSplit(rows: UsageRow[]): TokenSplit {
  let input = 0;
  let output = 0;
  for (const r of rows) {
    input += r.input_tokens ?? 0;
    output += r.output_tokens ?? 0;
  }
  return { input, output };
}

const WEEKDAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export type DayOfWeekPoint = { day: string; cost: number };

export function spendByDayOfWeek(rows: UsageRow[]): DayOfWeekPoint[] {
  const totals = new Array(7).fill(0);
  for (const r of rows) {
    const idx = (new Date(`${r.date}T00:00:00Z`).getUTCDay() + 6) % 7; // Mon=0 .. Sun=6
    totals[idx] += r.cost_usd;
  }
  return WEEKDAY_LABELS.map((day, i) => ({ day, cost: round(totals[i]) }));
}

export type DonutSlice = { label: string; cost: number };

// Caps pie/donut slices at a legible count by folding everything past
// `topN` into a single neutral "Other" bucket, rather than generating a
// color per long-tail entry (a 9th+ hue is indistinguishable from an
// existing one under color-vision deficiency).
export function foldOthers(points: ModelSpendPoint[], topN: number): DonutSlice[] {
  const top = points.slice(0, topN).map((p) => ({ label: p.model, cost: p.cost }));
  const rest = points.slice(topN);
  if (rest.length === 0) return top;
  const otherCost = round(rest.reduce((sum, p) => sum + p.cost, 0));
  return [...top, { label: "Other", cost: otherCost }];
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

// `range` is inclusive on both ends. The "vs prior period" comparison is
// always the same number of days immediately before `start` -- a 7-day
// range compares against the 7 days before it, a custom 42-day range
// against the 42 days before that, etc. -- so `rows` needs to cover both
// windows (the caller is responsible for fetching that wider span).
export function computeSummary(
  rows: UsageRow[],
  range: { start: Date; end: Date },
): SummaryStats {
  const { start, end } = range;
  const periodDays = Math.round((end.getTime() - start.getTime()) / 86_400_000) + 1;
  const priorStart = new Date(start);
  priorStart.setUTCDate(priorStart.getUTCDate() - periodDays);
  const priorEnd = new Date(start);
  priorEnd.setUTCDate(priorEnd.getUTCDate() - 1);

  let totalThisPeriod = 0;
  let totalPreviousPeriod = 0;
  let tokensThisPeriod = 0;
  let tokensPreviousPeriod = 0;
  const modelTotalsThisPeriod = new Map<string, number>();

  for (const r of rows) {
    const d = new Date(`${r.date}T00:00:00Z`);
    const tokens = (r.input_tokens ?? 0) + (r.output_tokens ?? 0);
    if (d >= start && d <= end) {
      totalThisPeriod += r.cost_usd;
      tokensThisPeriod += tokens;
      modelTotalsThisPeriod.set(r.model, (modelTotalsThisPeriod.get(r.model) ?? 0) + r.cost_usd);
    } else if (d >= priorStart && d <= priorEnd) {
      totalPreviousPeriod += r.cost_usd;
      tokensPreviousPeriod += tokens;
    }
  }

  const pctChange = pctChangeOf(totalThisPeriod, totalPreviousPeriod);
  let mostExpensiveModel: string | null = null;
  let mostExpensiveModelCost = -Infinity;
  for (const [model, cost] of modelTotalsThisPeriod) {
    if (cost > mostExpensiveModelCost) {
      mostExpensiveModel = model;
      mostExpensiveModelCost = cost;
    }
  }

  return {
    totalThisPeriod: Math.round(totalThisPeriod * 100) / 100,
    totalPreviousPeriod: Math.round(totalPreviousPeriod * 100) / 100,
    pctChange,
    mostExpensiveModel,
    totalTokens: tokensThisPeriod,
    tokensPctChange: pctChangeOf(tokensThisPeriod, tokensPreviousPeriod),
    // Same numerator/denominator ratio as pctChange (both totals divided by
    // the same periodDays), so it shares that delta rather than computing
    // its own.
    avgCostPerDay: Math.round((totalThisPeriod / periodDays) * 100) / 100,
  };
}
