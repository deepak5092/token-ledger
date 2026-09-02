import type { NormalizedUsageRecord } from "./types";

// Per-model baseline daily token volume and $/million-token pricing, used
// only to shape realistic-looking synthetic data, not real Bedrock prices.
const BEDROCK_MODELS = [
  { name: "amazon.nova-micro-v1:0", baseTokens: 200_000, inCost: 0.035, outCost: 0.14 },
  { name: "amazon.nova-pro-v1:0", baseTokens: 80_000, inCost: 0.8, outCost: 3.2 },
  { name: "anthropic.claude-3-5-sonnet-20241022-v2:0", baseTokens: 50_000, inCost: 3, outCost: 15 },
  { name: "anthropic.claude-3-5-haiku-20241022-v1:0", baseTokens: 120_000, inCost: 0.8, outCost: 4 },
];

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

export function generateSyntheticBedrockUsage(
  connectionId: string,
  days = 60,
): NormalizedUsageRecord[] {
  const records: NormalizedUsageRecord[] = [];
  const today = new Date();

  for (const model of BEDROCK_MODELS) {
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
