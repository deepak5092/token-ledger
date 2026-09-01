import { cn } from "@/lib/cn";

export function Logo({
  size = 24,
  showWordmark = true,
  className,
}: {
  size?: number;
  showWordmark?: boolean;
  className?: string;
}) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden>
        <rect width="24" height="24" rx="6" className="fill-accent" />
        <rect x="6" y="13" width="3" height="6" rx="1" className="fill-accent-foreground" />
        <rect x="10.5" y="9" width="3" height="10" rx="1" className="fill-accent-foreground" />
        <rect x="15" y="5" width="3" height="14" rx="1" className="fill-accent-foreground" />
      </svg>
      {showWordmark && (
        <span className="text-base font-semibold tracking-tight text-foreground">
          Token Ledger
        </span>
      )}
    </span>
  );
}
