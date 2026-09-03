"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { fetchAnthropicUsage } from "@/lib/ingestion/anthropic";
import { fetchOpenAIUsage } from "@/lib/ingestion/openai";
import type { NormalizedUsageRecord } from "@/lib/ingestion/types";
import { checkRateLimit, RATE_LIMITS } from "@/lib/rate-limit";

export async function syncConnection(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const withinLimit = await checkRateLimit(`sync:${user.id}`, RATE_LIMITS.sync);
  if (!withinLimit) {
    redirect(
      `/dashboard/connections?error=${encodeURIComponent("Too many syncs in a short window. Wait a minute and try again.")}`,
    );
  }

  const connectionId = formData.get("connectionId") as string;

  // RLS scopes this to the caller's own connections.
  const { data: connection, error: fetchError } = await supabase
    .from("api_connections")
    .select("id, provider, vault_secret_id")
    .eq("id", connectionId)
    .single();

  if (fetchError || !connection) {
    redirect(
      `/dashboard/connections?error=${encodeURIComponent("Connection not found.")}`,
    );
  }

  const admin = createAdminClient();
  let records: NormalizedUsageRecord[] = [];

  try {
    if (!connection.vault_secret_id) {
      throw new Error("No stored key for this connection.");
    }

    const { data: apiKey, error: decryptError } = await admin.rpc("decrypt_connection_secret", {
      p_vault_secret_id: connection.vault_secret_id,
    });

    if (decryptError || !apiKey) {
      throw new Error("Could not decrypt the stored key.");
    }

    records =
      connection.provider === "anthropic"
        ? await fetchAnthropicUsage(apiKey as string)
        : await fetchOpenAIUsage(apiKey as string);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Sync failed.";
    redirect(`/dashboard/connections?error=${encodeURIComponent(message)}`);
  }

  if (records.length > 0) {
    const rows = records.map((r) => ({ ...r, connection_id: connection.id }));
    const { error: upsertError } = await admin
      .from("usage_records")
      .upsert(rows, { onConflict: "connection_id,date,model" });

    if (upsertError) {
      redirect(
        `/dashboard/connections?error=${encodeURIComponent("Sync fetched data but failed to save it.")}`,
      );
    }
  }

  await admin
    .from("api_connections")
    .update({ last_synced_at: new Date().toISOString() })
    .eq("id", connection.id);

  redirect(`/dashboard/connections?synced=${records.length}`);
}
