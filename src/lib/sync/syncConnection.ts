import type { SupabaseClient } from "@supabase/supabase-js";
import { fetchAnthropicUsage } from "@/lib/ingestion/anthropic";
import { fetchOpenAIUsage } from "@/lib/ingestion/openai";
import { fetchAnthropicKeyMetadata, fetchOpenAIKeyMetadata } from "@/lib/providers/metadata";
import type { NormalizedUsageRecord } from "@/lib/ingestion/types";

export type SyncableConnection = {
  id: string;
  provider: string;
  vault_secret_id: string | null;
};

// Core sync pipeline, shared by every place that syncs a connection --
// currently just the scheduled cron route (src/app/api/cron/sync), since
// there's no manual "Sync now" trigger anymore. Takes a service-role
// client because it decrypts Vault secrets and writes usage_records for
// connections that may not belong to the caller's own session (the cron
// route has no user session at all).
export async function syncConnection(
  admin: SupabaseClient,
  connection: SyncableConnection,
): Promise<{ recordsSynced: number }> {
  if (!connection.vault_secret_id) {
    throw new Error("No stored key for this connection.");
  }
  if (connection.provider !== "anthropic" && connection.provider !== "openai") {
    throw new Error(`Unsupported provider: ${connection.provider}`);
  }

  const { data: apiKey, error: decryptError } = await admin.rpc("decrypt_connection_secret", {
    p_vault_secret_id: connection.vault_secret_id,
  });
  if (decryptError || !apiKey) {
    throw new Error("Could not decrypt the stored key.");
  }
  const key = apiKey as string;

  const records: NormalizedUsageRecord[] =
    connection.provider === "anthropic" ? await fetchAnthropicUsage(key) : await fetchOpenAIUsage(key);

  if (records.length > 0) {
    const rows = records.map((r) => ({ ...r, connection_id: connection.id }));
    const { error: upsertError } = await admin
      .from("usage_records")
      .upsert(rows, { onConflict: "connection_id,date,model" });
    if (upsertError) {
      throw new Error("Sync fetched data but failed to save it.");
    }
  }

  // Best-effort: a failed or no-match metadata lookup shouldn't fail the
  // whole sync, since usage data (already saved above) is the primary
  // thing this pipeline exists to keep fresh.
  const metadata = await (connection.provider === "anthropic"
    ? fetchAnthropicKeyMetadata(key)
    : fetchOpenAIKeyMetadata(key)
  ).catch(() => null);

  await admin
    .from("api_connections")
    .update({
      last_synced_at: new Date().toISOString(),
      ...(metadata && {
        provider_key_hint: metadata.hint,
        provider_key_name: metadata.name,
        provider_key_status: metadata.status,
        provider_created_at: metadata.createdAt,
        provider_expires_at: metadata.expiresAt,
        provider_owner: metadata.owner,
      }),
    })
    .eq("id", connection.id);

  return { recordsSynced: records.length };
}
