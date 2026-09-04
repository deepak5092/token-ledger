import { Plug, TrendingUp, AlertTriangle, Calculator, MessagesSquare, FileSpreadsheet } from "lucide-react";
import { Card } from "@/components/ui/Card";

const FEATURES = [
  {
    icon: Plug,
    title: "Connect real usage",
    description:
      "Anthropic and OpenAI usage-reporting keys, encrypted at rest and decrypted only server-side.",
  },
  {
    icon: TrendingUp,
    title: "See what's coming",
    description:
      "A Holt-Winters model projects the next stretch of spend with a confidence band, layered right onto your history.",
  },
  {
    icon: AlertTriangle,
    title: "Catch the anomalies",
    description:
      "Any day that jumps well past your rolling average gets flagged on its own, and you can ask the agent to dig into why.",
  },
  {
    icon: Calculator,
    title: "Run the model-switch math",
    description:
      "Take a real workload or type in token counts, point it at a different model, and see the monthly difference right away.",
  },
  {
    icon: MessagesSquare,
    title: "Ask instead of digging",
    description:
      "A Claude agent with real tool access answers questions about your usage data directly. It queries the data; it doesn't guess.",
  },
  {
    icon: FileSpreadsheet,
    title: "Export exactly what you ask for",
    description:
      "Ask for a PDF or Excel file on any metric, grouped by day, model, or provider. Built live for that request, not a fixed template.",
  },
];

export function FeatureGrid() {
  return (
    <section className="mx-auto max-w-6xl px-6 py-12">
      <h2 className="text-2xl font-semibold tracking-tight text-foreground">
        What&apos;s inside
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
