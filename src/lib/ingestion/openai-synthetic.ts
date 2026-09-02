import type { NormalizedUsageRecord } from "./types";
import { generateSyntheticUsage, type SyntheticModelProfile } from "./synthetic";
import { findPricing } from "@/lib/pricing/models";

// Demo-account-only synthetic data. NOT wired into the general "connect a
// provider" flow -- a real user still needs a real Admin-level OpenAI key;
// addConnection()/validateProviderKey() never call this. Exists solely so
// the shared demo account (scripts/seed-demo-account.mjs) can show a
// populated OpenAI connection without a real key. Costs are computed from
// the real pricing table, not invented, so they stay consistent with what
// the simulator and agent report for the same models.
const DEMO_MODEL_BASE_TOKENS: Record<string, number> = {
  "gpt-5.4": 350_000,
  "gpt-4o-mini": 800_000,
  "o3-mini": 40_000,
};

function demoModels(): SyntheticModelProfile[] {
  return Object.entries(DEMO_MODEL_BASE_TOKENS).map(([name, baseTokens]) => {
    const pricing = findPricing(name);
    if (!pricing) {
      throw new Error(`openai-synthetic: no pricing entry for demo model "${name}"`);
    }
    return { name, baseTokens, inCost: pricing.inCost, outCost: pricing.outCost };
  });
}

export function generateSyntheticOpenAIUsage(
  connectionId: string,
  days = 60,
): NormalizedUsageRecord[] {
  return generateSyntheticUsage(connectionId, demoModels(), days);
}
