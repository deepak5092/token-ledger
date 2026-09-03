"use client";

import { useEffect, useRef, useState, type ComponentType } from "react";
import { Sparkles, AlertTriangle, HelpCircle, Send, Bot } from "lucide-react";
import { useAgentChat, type AgentAction } from "@/lib/agent/useAgentChat";
import { Input } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import type { AnomalyPoint } from "@/lib/dashboard/anomaly";

const formatDate = (dateStr: string) =>
  new Date(`${dateStr}T00:00:00Z`).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });

function timeGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

type Suggestion = { icon: ComponentType<{ className?: string }>; label: string; action: AgentAction };

// Anomalies are real detected data (specific flagged dates), not example
// text -- surfaced as suggestions built from spendWithAnomalies so the
// unified pane doesn't lose the "here's what got flagged" visibility the
// old separate Anomalies card had, even though there's no dedicated list
// anymore.
function buildSuggestions(spendWithAnomalies: AnomalyPoint[]): Suggestion[] {
  const suggestions: Suggestion[] = [
    {
      icon: Sparkles,
      label: "Generate my weekly briefing",
      action: { mode: "briefing", label: "Generate my weekly briefing" },
    },
  ];

  const recentAnomalies = spendWithAnomalies
    .filter((p) => p.isAnomaly)
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 2);

  for (const a of recentAnomalies) {
    const label = `Explain why spend was ${a.ratio}x average on ${formatDate(a.date)}`;
    suggestions.push({ icon: AlertTriangle, label, action: { mode: "anomaly", date: a.date, label } });
  }

  suggestions.push({
    icon: HelpCircle,
    label: "Which model cost the most this month?",
    action: { mode: "chat", question: "Which model cost the most this month?" },
  });

  return suggestions;
}

// Unified assistant pane (greeting + suggested prompts + one input),
// replacing the previous three separate cards (Weekly Briefing, Anomalies,
// Quick question) -- same idea as Samsara's/most platforms' AI assistant
// panel: one conversation, suggestions that disappear once it starts.
export function AgentPanel({ spendWithAnomalies }: { spendWithAnomalies: AnomalyPoint[] }) {
  const { messages, error, pending, draft, run } = useAgentChat();
  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [messages, draft]);

  const suggestions = buildSuggestions(spendWithAnomalies);
  const hasConversation = messages.length > 0 || pending;

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const q = input;
    setInput("");
    run({ mode: "chat", question: q });
  };

  return (
    <div className="overflow-hidden rounded-lg border border-zinc-200 shadow-sm dark:border-zinc-800">
      <div className="flex items-center gap-2 bg-accent px-4 py-2.5 text-sm font-medium text-accent-foreground">
        <Bot className="h-4 w-4" aria-hidden />
        Assistant
      </div>

      <div className="bg-white dark:bg-zinc-950">
        <div className="max-h-[26rem] overflow-y-auto p-4">
          {!hasConversation ? (
            <>
              <h2 className="text-base font-semibold text-foreground">
                {timeGreeting()}. What needs your attention?
              </h2>

              <div className="mt-3 space-y-1">
                {suggestions.map((s) => (
                  <button
                    key={s.label}
                    type="button"
                    onClick={() => run(s.action)}
                    className="flex w-full items-start gap-2 rounded-lg px-2 py-1.5 text-left text-sm text-zinc-700 transition-colors hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-900"
                  >
                    <s.icon className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
                    {s.label}
                  </button>
                ))}
              </div>
            </>
          ) : (
            <div className="space-y-4">
              {messages.map((m, i) =>
                m.role === "user" ? (
                  <div key={i} className="flex justify-end">
                    <div className="max-w-[85%] rounded-lg bg-accent px-3 py-1.5 text-sm whitespace-pre-wrap text-accent-foreground">
                      {m.content}
                    </div>
                  </div>
                ) : (
                  <p key={i} className="text-sm whitespace-pre-wrap text-zinc-800 dark:text-zinc-200">
                    {m.content}
                  </p>
                ),
              )}
              {pending && (
                <p className="text-sm whitespace-pre-wrap text-zinc-800 dark:text-zinc-200">
                  {draft ? (
                    <>
                      {draft}
                      <span className="ml-0.5 inline-block h-3 w-1 animate-pulse bg-zinc-400 align-middle dark:bg-zinc-500" />
                    </>
                  ) : (
                    <span className="text-zinc-500">Thinking…</span>
                  )}
                </p>
              )}
              {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
              <div ref={bottomRef} />
            </div>
          )}
        </div>

        <form
          onSubmit={onSubmit}
          className="flex gap-2 border-t border-zinc-200 p-3 dark:border-zinc-800"
        >
          <Input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about your spend…"
            disabled={pending}
            className="!mt-0 flex-1"
          />
          <Button
            type="submit"
            variant="primary"
            size="sm"
            disabled={pending || !input.trim()}
            aria-label="Send"
          >
            <Send className="h-4 w-4" aria-hidden />
          </Button>
        </form>
      </div>
    </div>
  );
}
