import { Plug, TrendingUp, AlertTriangle, Calculator, MessagesSquare } from "lucide-react";
import { Card } from "@/components/ui/Card";

const FEATURES = [
  {
    icon: Plug,
    title: "Multi-provider tracking",
    description:
      "Connect Anthropic and OpenAI usage-reporting keys, or add a synthetic AWS Bedrock connection to try it with no key at all.",
  },
  {
    icon: TrendingUp,
    title: "Forecasting",
    description:
      "A Holt-Winters model projects the next 7–30 days of spend, with a confidence band, right on your spend chart.",
  },
  {
    icon: AlertTriangle,
    title: "Anomaly detection",
    description:
      "Days where spend jumps well past your rolling average get flagged automatically — and you can ask the agent why.",
  },
  {
    icon: Calculator,
    title: "Savings simulator",
    description:
      "Pick a real workload or enter token counts by hand, compare it against another model, and see the monthly delta.",
  },
  {
    icon: MessagesSquare,
    title: "Ask the agent",
    description:
      "A Claude tool-use agent queries your real usage data to answer questions and generate briefings — never guesses.",
  },
];

export function FeatureGrid() {
  return (
    <section className="mx-auto max-w-6xl px-6 py-12">
      <h2 className="text-2xl font-semibold tracking-tight text-foreground">
        Everything you need to track AI spend
      </h2>
      <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {FEATURES.map((f) => (
          <Card key={f.title}>
            <f.icon className="h-5 w-5 text-accent" aria-hidden />
            <h3 className="mt-3 font-medium text-foreground">{f.title}</h3>
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">{f.description}</p>
          </Card>
        ))}
      </div>
    </section>
  );
}
