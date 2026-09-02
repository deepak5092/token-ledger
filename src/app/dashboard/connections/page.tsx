import { createClient } from "@/lib/supabase/server";
import { PROVIDERS } from "@/lib/providers/types";
import { ConnectionForm } from "./ConnectionForm";
import { removeConnection } from "./actions";
import { syncConnection } from "./sync-actions";
import { SyncButton } from "./SyncButton";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ProviderBadge } from "@/components/dashboard/ProviderBadge";

export default async function ConnectionsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; synced?: string }>;
}) {
  const { error, synced } = await searchParams;
  const supabase = await createClient();

  const { data: connections } = await supabase
    .from("api_connections")
    .select("id, provider, label, created_at, last_synced_at")
    .order("created_at", { ascending: false });

  const providerLabel = (value: string) =>
    PROVIDERS.find((p) => p.value === value)?.label ?? value;

  return (
    <div>
      <h1 className="text-2xl font-semibold text-foreground">Connections</h1>

      <p className="mt-2 max-w-2xl text-sm text-zinc-600 dark:text-zinc-400">
        This is a demo project, not a security-audited product. Keys are
        encrypted via Supabase Vault and only ever decrypted server-side at
        sync time; never sent to your browser. Use a scoped, rotatable,
        low-spend key wherever your provider supports it.
      </p>

      {error && (
        <Alert variant="error" className="mt-4 max-w-2xl">
          {error}
        </Alert>
      )}

      {synced !== undefined && (
        <Alert variant="success" className="mt-4 max-w-2xl">
          Synced {synced} usage record{synced === "1" ? "" : "s"}.
        </Alert>
      )}

      <div className="mt-6 max-w-md">
        <ConnectionForm />
      </div>

      <div className="mt-8 max-w-2xl space-y-3">
        {connections?.length ? (
          connections.map((c) => (
            <Card key={c.id} className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <ProviderBadge provider={c.provider} />
                <div>
                  <p className="font-medium text-foreground">
                    {providerLabel(c.provider)}
                    {c.label ? ` (${c.label})` : ""}
                  </p>
                  <p className="text-xs text-zinc-500">
                    {c.last_synced_at
                      ? `Last synced ${new Date(c.last_synced_at).toLocaleString()}`
                      : "Never synced"}
                  </p>
                </div>
              </div>
              <div className="flex shrink-0 gap-2">
                <form action={syncConnection}>
                  <input type="hidden" name="connectionId" value={c.id} />
                  <SyncButton />
                </form>
                <form action={removeConnection}>
                  <input type="hidden" name="connectionId" value={c.id} />
                  <Button type="submit" variant="destructive" size="sm">
                    Remove
                  </Button>
                </form>
              </div>
            </Card>
          ))
        ) : (
          <p className="text-sm text-zinc-500">No connections yet.</p>
        )}
      </div>
    </div>
  );
}
