import { createClient } from "@/lib/supabase/server";
import { PROVIDERS } from "@/lib/providers/types";
import { ConnectionForm } from "./ConnectionForm";
import { removeConnection } from "./actions";
import { syncConnection } from "./sync-actions";
import { SyncButton } from "./SyncButton";

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
    <div className="min-h-screen bg-zinc-50 p-8 dark:bg-black">
      <h1 className="text-2xl font-semibold text-black dark:text-zinc-50">
        Connections
      </h1>

      <p className="mt-2 max-w-2xl text-sm text-zinc-600 dark:text-zinc-400">
        This is a demo project, not a security-audited product. Keys are
        encrypted via Supabase Vault and only ever decrypted server-side at
        sync time — never sent to your browser. Use a scoped, rotatable,
        low-spend key wherever your provider supports it.
      </p>

      {error && (
        <p className="mt-4 max-w-2xl rounded bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
          {error}
        </p>
      )}

      {synced !== undefined && (
        <p className="mt-4 max-w-2xl rounded bg-green-50 px-3 py-2 text-sm text-green-700 dark:bg-green-950 dark:text-green-300">
          Synced {synced} usage record{synced === "1" ? "" : "s"}.
        </p>
      )}

      <div className="mt-6 max-w-md">
        <ConnectionForm />
      </div>

      <div className="mt-8 max-w-2xl space-y-3">
        {connections?.length ? (
          connections.map((c) => (
            <div
              key={c.id}
              className="flex items-center justify-between rounded border border-zinc-200 px-4 py-3 dark:border-zinc-800"
            >
              <div>
                <p className="font-medium text-black dark:text-zinc-50">
                  {providerLabel(c.provider)}
                  {c.label ? ` — ${c.label}` : ""}
                </p>
                <p className="text-xs text-zinc-500">
                  {c.last_synced_at
                    ? `Last synced ${new Date(c.last_synced_at).toLocaleString()}`
                    : "Never synced"}
                </p>
              </div>
              <div className="flex gap-2">
                <form action={syncConnection}>
                  <input type="hidden" name="connectionId" value={c.id} />
                  <SyncButton />
                </form>
                <form action={removeConnection}>
                  <input type="hidden" name="connectionId" value={c.id} />
                  <button
                    type="submit"
                    className="rounded border border-zinc-300 px-3 py-1.5 text-sm text-red-700 dark:border-zinc-700 dark:text-red-400"
                  >
                    Remove
                  </button>
                </form>
              </div>
            </div>
          ))
        ) : (
          <p className="text-sm text-zinc-500">No connections yet.</p>
        )}
      </div>
    </div>
  );
}
