import { FeatureGrid } from "@/components/marketing/FeatureGrid";
import { UpcomingFeatures } from "@/components/marketing/UpcomingFeatures";
import { ThemeToggle } from "@/components/ThemeToggle";

// Same feature list as the signed-out home page, reused verbatim (not
// re-described) so it can never drift out of sync with what that page
// says Token Ledger does -- this is just a way back to it for someone
// who's already signed in and forgets what's available.
export default function LearnMorePage() {
  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold text-foreground">Learn more</h1>
        <ThemeToggle />
      </div>
      <p className="mt-2 max-w-2xl text-sm text-zinc-600 dark:text-zinc-400">
        Everything Token Ledger does today, and what&apos;s coming next.
      </p>

      <div className="-mx-6 lg:-mx-8">
        <FeatureGrid />
        <UpcomingFeatures />
      </div>
    </div>
  );
}
