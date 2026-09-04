import { createAdminClient } from "@/lib/supabase/admin";

export type RateLimitConfig = { maxRequests: number; windowSeconds: number };

// Fixed-window counter backed by the check_rate_limit() Postgres function
// (supabase/rate_limit_functions.sql): shared across serverless instances,
// unlike an in-memory counter, and atomic under concurrent requests.
export async function checkRateLimit(key: string, config: RateLimitConfig): Promise<boolean> {
  const admin = createAdminClient();
  const { data, error } = await admin.rpc("check_rate_limit", {
    p_key: key,
    p_max_requests: config.maxRequests,
    p_window_seconds: config.windowSeconds,
  });

  if (error) {
    // Fail open: a broken limiter shouldn't take the app down. The
    // provider console spend cap is the real backstop against runaway
    // cost; this is a secondary guard against casual misuse.
    console.error("[rate-limit] check failed, allowing request:", error.message);
    return true;
  }

  return data === true;
}

// Per-user thresholds for the endpoints that spend real money (provider
// API calls or the developer's own Anthropic key). Not per-IP: every
// caller here is already authenticated (behind /dashboard), so the user
// id is a meaningful rate-limit key.
export const RATE_LIMITS = {
  keyValidation: { maxRequests: 5, windowSeconds: 600 }, // 5 per 10 min
  agent: { maxRequests: 15, windowSeconds: 3600 }, // 15 per hour, hits the dev's own Anthropic key
  report: { maxRequests: 30, windowSeconds: 3600 }, // 30 per hour: no Anthropic call, just DB + PDF render
} as const;
