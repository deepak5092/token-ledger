import type { NormalizedUsageRecord } from "./types";

export type SyntheticModelProfile = {
  name: string;
  baseTokens: number;
  inCost: number; // $ per million input tokens
  outCost: number; // $ per million output tokens
};

// Deterministic PRNG (mulberry32) seeded from the connection id, so
// re-syncing the same synthetic connection produces a stable-looking series
// rather than a different random dataset every time.
function seededRandom(seed: number) {
  let t = seed;
  return function () {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r;
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

function seedFromString(value: string): number {
  let seed = 0;
  for (const char of value) seed = (seed * 31 + char.charCodeAt(0)) | 0;
  return seed;
}

// Random-walk-plus-weekly-seasonality generator shared by the demo-account-
// only Anthropic/OpenAI synthetic connectors, so they both produce the same
// realistic shape of data from one tested implementation instead of
// drifting copies.
export function generateSyntheticUsage(
  connectionId: string,
  models: SyntheticModelProfile[],
  days = 60,
): NormalizedUsageRecord[] {
  const records: NormalizedUsageRecord[] = [];
  const today = new Date();

  for (const model of models) {
    const rand = seededRandom(seedFromString(connectionId + model.name));
    let level = model.baseTokens;

    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const isWeekend = date.getDay() === 0 || date.getDay() === 6;

      // Random walk with mean reversion, plus weekly seasonality.
      level *= 1 + (rand() - 0.48) * 0.15;
      level = Math.max(model.baseTokens * 0.2, level);

      const weekendFactor = isWeekend ? 0.4 : 1;
      const inputTokens = Math.round(level * weekendFactor * (0.85 + rand() * 0.3));
      const outputTokens = Math.round(inputTokens * (0.3 + rand() * 0.2));

      if (inputTokens < 100) continue;

      const cost =
        (inputTokens / 1_000_000) * model.inCost + (outputTokens / 1_000_000) * model.outCost;

      records.push({
        date: date.toISOString().slice(0, 10),
        model: model.name,
        input_tokens: inputTokens,
        output_tokens: outputTokens,
        cost_usd: Math.round(cost * 10000) / 10000,
      });
    }
  }

  return records;
}
