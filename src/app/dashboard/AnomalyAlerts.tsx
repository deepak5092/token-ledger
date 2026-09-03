"use client";

import { useState } from "react";
import { AlertTriangle } from "lucide-react";
import type { AnomalyPoint } from "@/lib/dashboard/anomaly";
import { streamAgent } from "@/lib/agent/stream-client";
import { Button } from "@/components/ui/Button";

const formatDate = (dateStr: string) =>
  new Date(`${dateStr}T00:00:00Z`).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });

export function AnomalyAlerts({ points }: { points: AnomalyPoint[] }) {
  const anomalies = points
    .filter((p) => p.isAnomaly)
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 5);

  const [explanations, setExplanations] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pendingDate, setPendingDate] = useState<string | null>(null);

  const onExplain = async (date: string) => {
    setPendingDate(date);
    setErrors((e) => ({ ...e, [date]: "" }));
    setExplanations((ex) => ({ ...ex, [date]: "" }));

    let text = "";
    await streamAgent(
      { mode: "anomaly", date },
      {
        onText: (chunk) => {
          text += chunk;
          setExplanations((ex) => ({ ...ex, [date]: text }));
        },
        onError: (message) => setErrors((e) => ({ ...e, [date]: message })),
      },
    );

    setPendingDate(null);
  };

  if (anomalies.length === 0) {
    return (
      <p className="text-sm text-zinc-500">No spend anomalies detected.</p>
    );
  }

  return (
    <ul className="space-y-2">
      {anomalies.map((a) => (
        <li
          key={a.date}
          className="rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-950 dark:bg-red-950/40 dark:text-red-300"
        >
          <div className="flex flex-col items-start gap-2">
            <span className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden />
              {formatDate(a.date)}: spend was {a.ratio}x your 7-day average
            </span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onExplain(a.date)}
              disabled={pendingDate === a.date}
            >
              {pendingDate === a.date
                ? "Thinking…"
                : explanations[a.date]
                  ? "Re-explain"
                  : "Explain"}
            </Button>
          </div>
          {errors[a.date] && (
            <p className="mt-1 text-xs">{errors[a.date]}</p>
          )}
          {pendingDate === a.date && !explanations[a.date] && (
            <p className="mt-1 text-xs text-red-700 dark:text-red-300">Thinking…</p>
          )}
          {explanations[a.date] && (
            <p className="mt-1 text-xs text-red-700 dark:text-red-300">
              {explanations[a.date]}
              {pendingDate === a.date && (
                <span className="ml-0.5 inline-block h-3 w-1 animate-pulse bg-red-700 align-middle dark:bg-red-300" />
              )}
            </p>
          )}
        </li>
      ))}
    </ul>
  );
}
