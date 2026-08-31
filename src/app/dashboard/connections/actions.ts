"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isProvider } from "@/lib/providers/types";
import { validateProviderKey } from "@/lib/providers/validate";

export async function addConnection(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const providerRaw = formData.get("provider") as string;
  const label = ((formData.get("label") as string) || "").trim() || null;
  const apiKey = ((formData.get("apiKey") as string) || "").trim();

  if (!isProvider(providerRaw)) {
    redirect(
      `/dashboard/connections?error=${encodeURIComponent("Invalid provider.")}`,
    );
  }
  const provider = providerRaw;

  if (provider !== "bedrock_synthetic" && !apiKey) {
    redirect(
      `/dashboard/connections?error=${encodeURIComponent("API key is required for this provider.")}`,
    );
  }

  const validation = await validateProviderKey(provider, apiKey);
  if (!validation.ok) {
    redirect(`/dashboard/connections?error=${encodeURIComponent(validation.error)}`);
  }

  let vaultSecretId: string | null = null;
  if (provider !== "bedrock_synthetic") {
    const { data: secretId, error: vaultError } = await supabase.rpc(
      "create_connection_secret",
      { p_secret: apiKey, p_name: `${user.id}:${provider}:${Date.now()}` },
    );

    if (vaultError || !secretId) {
      redirect(
        `/dashboard/connections?error=${encodeURIComponent("Could not securely store the key. Please try again.")}`,
      );
    }
    vaultSecretId = secretId as string;
  }

  const { error: insertError } = await supabase.from("api_connections").insert({
    user_id: user.id,
    provider,
    label,
    vault_secret_id: vaultSecretId,
  });

  if (insertError) {
    // Don't leave an orphaned Vault secret behind if the row insert failed.
    if (vaultSecretId) {
      const admin = createAdminClient();
      await admin.rpc("delete_connection_secret", {
        p_vault_secret_id: vaultSecretId,
      });
    }
    redirect(
      `/dashboard/connections?error=${encodeURIComponent("Could not save the connection. Please try again.")}`,
    );
  }

  redirect("/dashboard/connections");
}

export async function removeConnection(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const connectionId = formData.get("connectionId") as string;

  // RLS scopes this select to the caller's own rows, so a mismatched id
  // (someone else's connection) simply won't be found here.
  const { data: connection, error: fetchError } = await supabase
    .from("api_connections")
    .select("id, vault_secret_id")
    .eq("id", connectionId)
    .single();

  if (fetchError || !connection) {
    redirect(
      `/dashboard/connections?error=${encodeURIComponent("Connection not found.")}`,
    );
  }

  if (connection.vault_secret_id) {
    const admin = createAdminClient();
    await admin.rpc("delete_connection_secret", {
      p_vault_secret_id: connection.vault_secret_id,
    });
  }

  // Cascades to usage_records via the foreign key.
  const { error: deleteError } = await supabase
    .from("api_connections")
    .delete()
    .eq("id", connectionId);

  if (deleteError) {
    redirect(
      `/dashboard/connections?error=${encodeURIComponent("Could not remove the connection.")}`,
    );
  }

  redirect("/dashboard/connections");
}
