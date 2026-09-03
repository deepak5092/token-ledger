// Manually maintained $/million-token pricing, keyed by the exact model
// string each provider's usage API reports. Not live-fetched: update by
// hand as providers change pricing. Sourced from each provider's own
// pricing page, verified 2026-08-31:
//   - Anthropic: https://www.anthropic.com/pricing (current first-party models only)
//   - OpenAI: https://developers.openai.com/api/docs/pricing
// A model not in this table (retired, or too new) has no cost estimate
// available; callers should treat that as "unknown", not $0.

export type ModelPricing = {
  model: string;
  provider: "anthropic" | "openai";
  label: string;
  inCost: number; // $ per million input tokens
  outCost: number; // $ per million output tokens
};

export const PRICING_TABLE: ModelPricing[] = [
  // Anthropic
  { model: "claude-opus-5", provider: "anthropic", label: "Claude Opus 5", inCost: 5, outCost: 25 },
  { model: "claude-opus-4-8", provider: "anthropic", label: "Claude Opus 4.8", inCost: 5, outCost: 25 },
  { model: "claude-opus-4-7", provider: "anthropic", label: "Claude Opus 4.7", inCost: 5, outCost: 25 },
  { model: "claude-opus-4-6", provider: "anthropic", label: "Claude Opus 4.6", inCost: 5, outCost: 25 },
  { model: "claude-sonnet-5", provider: "anthropic", label: "Claude Sonnet 5", inCost: 2, outCost: 10 },
  { model: "claude-sonnet-4-6", provider: "anthropic", label: "Claude Sonnet 4.6", inCost: 3, outCost: 15 },
  { model: "claude-haiku-4-5", provider: "anthropic", label: "Claude Haiku 4.5", inCost: 1, outCost: 5 },

  // OpenAI
  { model: "gpt-5.6-sol", provider: "openai", label: "GPT-5.6 Sol", inCost: 4, outCost: 20 },
  { model: "gpt-5.6-terra", provider: "openai", label: "GPT-5.6 Terra", inCost: 2, outCost: 12 },
  { model: "gpt-5.6-luna", provider: "openai", label: "GPT-5.6 Luna", inCost: 0.2, outCost: 1.2 },
  { model: "gpt-5.5", provider: "openai", label: "GPT-5.5", inCost: 5, outCost: 30 },
  { model: "gpt-5.4", provider: "openai", label: "GPT-5.4", inCost: 2.5, outCost: 15 },
  { model: "gpt-5.4-mini", provider: "openai", label: "GPT-5.4 Mini", inCost: 0.75, outCost: 4.5 },
  { model: "gpt-4o", provider: "openai", label: "GPT-4o", inCost: 2.5, outCost: 10 },
  { model: "gpt-4o-mini", provider: "openai", label: "GPT-4o Mini", inCost: 0.15, outCost: 0.6 },
  { model: "gpt-3.5-turbo", provider: "openai", label: "GPT-3.5 Turbo", inCost: 0.5, outCost: 1.5 },
  { model: "o3-mini", provider: "openai", label: "o3-mini", inCost: 1.1, outCost: 4.4 },
  { model: "o1", provider: "openai", label: "o1", inCost: 15, outCost: 60 },
];

const byModel = new Map(PRICING_TABLE.map((p) => [p.model, p]));

export function findPricing(model: string): ModelPricing | undefined {
  return byModel.get(model);
}

/** Returns null when the model isn't in the pricing table (unknown/retired model). */
export function estimateCost(
  model: string,
  inputTokens: number,
  outputTokens: number,
): number | null {
  const pricing = findPricing(model);
  if (!pricing) return null;
  const cost = (inputTokens / 1_000_000) * pricing.inCost + (outputTokens / 1_000_000) * pricing.outCost;
  return Math.round(cost * 10000) / 10000;
}

export type SwitchComparison = {
  currentCost: number;
  projectedCost: number;
  deltaPerMonth: number; // positive = savings, negative = costs more
  pctChange: number | null;
};

/** Compares the same token volume priced under `currentModel` vs. `targetModel`. Null if either model is unpriced. */
export function compareModels(
  inputTokens: number,
  outputTokens: number,
  currentModel: string,
  targetModel: string,
): SwitchComparison | null {
  const currentCost = estimateCost(currentModel, inputTokens, outputTokens);
  const projectedCost = estimateCost(targetModel, inputTokens, outputTokens);
  if (currentCost === null || projectedCost === null) return null;
  const deltaPerMonth = Math.round((currentCost - projectedCost) * 100) / 100;
  const pctChange =
    currentCost > 0 ? Math.round(((currentCost - projectedCost) / currentCost) * 1000) / 10 : null;
  return { currentCost, projectedCost, deltaPerMonth, pctChange };
}
