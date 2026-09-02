import Link from "next/link";
import { buttonVariants } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

export function Hero() {
  return (
    <section className="mx-auto max-w-6xl px-6 py-12 sm:py-20">
      <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-2">
        <div>
          <h1 className="text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
            Where did your AI budget actually go?
          </h1>
          <p className="mt-4 max-w-md text-lg text-zinc-600 dark:text-zinc-400">
            Token Ledger pulls real usage from Anthropic, OpenAI, and AWS
            Bedrock into one cached dashboard, forecasts what&apos;s next,
            flags the days that break the pattern, and lets an agent explain
            any of it back to you in plain language.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/signup" className={buttonVariants({ size: "lg" })}>
              Get started
            </Link>
            <Link href="/login" className={buttonVariants({ variant: "outline", size: "lg" })}>
              Log in
            </Link>
          </div>
        </div>

        {/* Illustrative preview of the dashboard: a stylized design element, not a screenshot or real data */}
        <Card className="!p-6" aria-hidden>
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-lg bg-zinc-50 p-3 dark:bg-zinc-900">
              <p className="text-xs text-zinc-500">Spend, 30d</p>
              <p className="mt-1 text-lg font-semibold text-foreground">$1,284</p>
            </div>
            <div className="rounded-lg bg-zinc-50 p-3 dark:bg-zinc-900">
              <p className="text-xs text-zinc-500">Vs. prior</p>
              <p className="mt-1 text-lg font-semibold text-green-600 dark:text-green-400">
                -8.2%
              </p>
            </div>
            <div className="rounded-lg bg-zinc-50 p-3 dark:bg-zinc-900">
              <p className="text-xs text-zinc-500">Top model</p>
              <p className="mt-1 truncate text-lg font-semibold text-foreground">Sonnet 5</p>
            </div>
          </div>
          <svg viewBox="0 0 320 100" className="mt-4 w-full">
            <polyline
              points="0,80 40,65 80,70 120,45 160,55 200,30 240,38 280,15 320,25 320,100 0,100"
              fill="var(--chart-series-1)"
              fillOpacity="0.08"
              stroke="none"
            />
            <polyline
              points="0,80 40,65 80,70 120,45 160,55 200,30 240,38 280,15 320,25"
              fill="none"
              stroke="var(--chart-series-1)"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </Card>
      </div>
    </section>
  );
}
