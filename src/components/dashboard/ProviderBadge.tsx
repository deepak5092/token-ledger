import { PROVIDER_COLOR, PROVIDER_LABEL } from "@/lib/providers/colors";
import { cn } from "@/lib/cn";

export function ProviderBadge({ provider, className }: { provider: string; className?: string }) {
  const label = PROVIDER_LABEL[provider] ?? provider;
  const color = PROVIDER_COLOR[provider] ?? "var(--chart-series-8)";

  return (
    <span
      className={cn(
        "flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-medium text-white",
        className,
      )}
      style={{ background: color }}
      aria-hidden
      title={label}
    >
      {label.charAt(0)}
    </span>
  );
}
