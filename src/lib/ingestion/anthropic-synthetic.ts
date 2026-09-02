import type { NormalizedUsageRecord } from "./types";
import { generateSyntheticUsage, type SyntheticModelProfile } from "./synthetic";
import { findPricing } from "@/lib/pricing/models";

// Demo-account-only synthetic data. NOT wired into the general "connect a
// provider" flow -- a real user still needs a real Admin-level Anthropic
// key; addConnection()/validateProviderKey() never call this. Exists
// solely so the shared demo account (scripts/seed-demo-account.mjs) can
// show a populated Anthropic connection without a real key. Costs are
// computed from the real pricing table, not invented, so they stay
// consistent with what the simulator and agent report for the same models.
const DEMO_MODEL_BASE_TOKENS: Record<string, number> = {
  "claude-sonnet-5": 400_000,
  "claude-haiku-4-5": 900_000,
  "claude-opus-5": 60_000,
};

function demoModels(): SyntheticModelProfile[] {
  return Object.entries(DEMO_MODEL_BASE_TOKENS).map(([name, baseTokens]) => {
    const pricing = findPricing(name);
    if (!pricing) {
      throw new Error(`anthropic-synthetic: no pricing entry for demo model "${name}"`);
    }
    return { name, baseTokens, inCost: pricing.inCost, outCost: pricing.outCost };
  });
}

export function generateSyntheticAnthropicUsage(
  connectionId: string,
  days = 60,
): NormalizedUsageRecord[] {
  return generateSyntheticUsage(connectionId, demoModels(), days);
}
