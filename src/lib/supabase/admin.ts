import { createClient as createSupabaseClient } from "@supabase/supabase-js";

// Service-role client that bypasses Row Level Security entirely.
// Server-only: import this in Route Handlers / Server Actions that need
// to decrypt Vault secrets or write across users (e.g. the sync pipeline).
// Never import this from a Client Component or expose the resulting
// client to the browser.
export function createAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}
