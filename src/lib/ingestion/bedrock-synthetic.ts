import type { NormalizedUsageRecord } from "./types";
import { generateSyntheticUsage } from "./synthetic";

// Per-model baseline daily token volume and $/million-token pricing, used
// only to shape realistic-looking synthetic data, not real Bedrock prices.
const BEDROCK_MODELS = [
  { name: "amazon.nova-micro-v1:0", baseTokens: 200_000, inCost: 0.035, outCost: 0.14 },
  { name: "amazon.nova-pro-v1:0", baseTokens: 80_000, inCost: 0.8, outCost: 3.2 },
  { name: "anthropic.claude-3-5-sonnet-20241022-v2:0", baseTokens: 50_000, inCost: 3, outCost: 15 },
  { name: "anthropic.claude-3-5-haiku-20241022-v1:0", baseTokens: 120_000, inCost: 0.8, outCost: 4 },
];

export function generateSyntheticBedrockUsage(
  connectionId: string,
  days = 60,
): NormalizedUsageRecord[] {
  return generateSyntheticUsage(connectionId, BEDROCK_MODELS, days);
}
