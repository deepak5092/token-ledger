import { createClient } from "@/lib/supabase/server";
import { ConnectionForm } from "./ConnectionForm";
import { removeConnection } from "./actions";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { ProviderBadge } from "@/components/dashboard/ProviderBadge";
import { PROVIDER_LABEL } from "@/lib/providers/colors";
import { cn } from "@/lib/cn";

type ConnectionRow = {
  id: string;
  provider: string;
  label: string | null;
  created_at: string;
  last_synced_at: string | null;
  provider_key_hint: string | null;
  provider_key_name: string | null;
  provider_key_status: string | null;
  provider_created_at: string | null;
  provider_owner: string | null;
};

const formatDate = (iso: string | null) =>
  iso
    ? new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })
    : "—";

// Anthropic's own vocabulary (active/archived/expired/inactive); OpenAI's
// admin key listing doesn't expose a status at all, so its connections
// never populate this and fall through to the "—" / "Not yet synced" cases
// in the table below.
const STATUS_CLASSES: Record<string, string> = {
  active: "bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300",
  archived: "bg-zinc-100 text-zinc-600 dark:bg-zinc-900 dark:text-zinc-400",
  expired: "bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300",
  inactive: "bg-zinc-100 text-zinc-600 dark:bg-zinc-900 dark:text-zinc-400",
};

export default async function ConnectionsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const supabase = await createClient();

  const { data: connections } = await supabase
    .from("api_connections")
    .select(
      "id, provider, label, created_at, last_synced_at, provider_key_hint, provider_key_name, provider_key_status, provider_created_at, provider_owner",
    )
    .order("created_at", { ascending: false })
    .returns<ConnectionRow[]>();

  return (
    <div>
      <h1 className="text-2xl font-semibold text-foreground">Connections</h1>

      <p className="mt-2 max-w-2xl text-sm text-zinc-600 dark:text-zinc-400">
        This is a demo project, not a security-audited product. Keys are
        encrypted via Supabase Vault and only ever decrypted server-side;
        never sent to your browser. Usage data and key details (name,
        status, owner) refresh automatically in the background on a
        schedule — there&apos;s no manual sync button. Use a scoped,
        rotatable, low-spend key wherever your provider supports it.
      </p>

      {error && (
        <Alert variant="error" className="mt-4 max-w-2xl">
          {error}
        </Alert>
      )}

      <div className="mt-6 max-w-md">
        <ConnectionForm />
      </div>

      <div className="mt-8 overflow-x-auto">
        {connections?.length ? (
          <table className="w-full min-w-[760px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-zinc-200 text-left text-xs text-zinc-500 dark:border-zinc-800">
                <th className="py-2 pr-4 font-medium">Key</th>
                <th className="py-2 pr-4 font-medium">Status</th>
                <th className="py-2 pr-4 font-medium">Owner</th>
                <th className="py-2 pr-4 font-medium">Created</th>
                <th className="py-2 pr-4 font-medium">Last synced</th>
                <th className="py-2 pr-0" />
              </tr>
            </thead>
            <tbody>
              {connections.map((c) => (
                <tr key={c.id} className="border-b border-zinc-100 dark:border-zinc-900">
                  <td className="py-3 pr-4">
                    <div className="flex items-center gap-3">
                      <ProviderBadge provider={c.provider} />
                      <div>
                        <p className="font-medium text-foreground">
                          {c.provider_key_name || c.label || PROVIDER_LABEL[c.provider] || c.provider}
                        </p>
                        {c.provider_key_hint && (
                          <p className="font-mono text-xs text-zinc-500">{c.provider_key_hint}</p>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="py-3 pr-4">
                    {c.provider_key_status ? (
                      <span
                        className={cn(
                          "rounded-full px-2 py-0.5 text-xs font-medium capitalize",
                          STATUS_CLASSES[c.provider_key_status] ?? STATUS_CLASSES.inactive,
                        )}
                      >
                        {c.provider_key_status}
                      </span>
                    ) : c.last_synced_at ? (
                      <span className="text-xs text-zinc-500">—</span>
                    ) : (
                      <span className="text-xs text-zinc-500">Not yet synced</span>
                    )}
                  </td>
                  <td className="py-3 pr-4 text-zinc-600 dark:text-zinc-400">
                    {c.provider_owner ?? "—"}
                  </td>
                  <td className="py-3 pr-4 text-zinc-600 dark:text-zinc-400">
                    {formatDate(c.provider_created_at ?? c.created_at)}
                  </td>
                  <td className="py-3 pr-4 text-zinc-600 dark:text-zinc-400">
                    {c.last_synced_at ? new Date(c.last_synced_at).toLocaleString() : "Not yet synced"}
                  </td>
                  <td className="py-3 pr-0 text-right">
                    <form action={removeConnection}>
                      <input type="hidden" name="connectionId" value={c.id} />
                      <Button type="submit" variant="destructive" size="sm">
                        Remove
                      </Button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="text-sm text-zinc-500">No connections yet.</p>
        )}
      </div>
    </div>
  );
}
