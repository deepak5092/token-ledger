import Link from "next/link";
import { Plus } from "lucide-react";
import { ProviderBadge } from "@/components/dashboard/ProviderBadge";
import { PROVIDER_LABEL } from "@/lib/providers/colors";
import { cn } from "@/lib/cn";

export type TabConnection = { id: string; provider: string; label: string | null };

// One tab per connection (not per provider) so two same-provider connections
// with different labels -- e.g. two Anthropic keys for different teams --
// stay distinguishable, matching how the Connections page already lists
// them individually.
export function OverviewTabs({
  connections,
  selectedId,
}: {
  connections: TabConnection[];
  selectedId?: string;
}) {
  const tabClass = (active: boolean) =>
    cn(
      "flex items-center gap-2 border-b-2 px-1 pb-3 text-sm font-medium whitespace-nowrap transition-colors",
      active
        ? "border-foreground text-foreground"
        : "border-transparent text-zinc-500 hover:text-foreground",
    );

  return (
    <div className="flex items-center gap-6 overflow-x-auto border-b border-zinc-200 dark:border-zinc-800">
      <Link href="/dashboard" className={tabClass(!selectedId)}>
        Overview
      </Link>
      {connections.map((c) => (
        <Link
          key={c.id}
          href={`/dashboard?connection=${c.id}`}
          className={tabClass(selectedId === c.id)}
        >
          <ProviderBadge provider={c.provider} />
          {c.label || PROVIDER_LABEL[c.provider] || c.provider}
        </Link>
      ))}
      <Link
        href="/dashboard/connections"
        className="flex shrink-0 items-center gap-1 pb-3 text-sm font-medium text-zinc-500 hover:text-foreground"
      >
        <Plus className="h-4 w-4" aria-hidden />
        Add provider
      </Link>
    </div>
  );
}
