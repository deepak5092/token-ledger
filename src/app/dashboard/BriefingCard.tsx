"use client";

import { useState, useTransition } from "react";
import { Sparkles } from "lucide-react";
import { generateBriefing } from "./agent/actions";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

export function BriefingCard() {
  const [text, setText] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const onGenerate = () => {
    setError(null);
    startTransition(async () => {
      const result = await generateBriefing();
      if (result.ok) {
        setText(result.text);
      } else {
        setError(result.error);
      }
    });
  };

  return (
    <Card>
      <div className="flex items-center justify-between gap-4">
        <h2 className="flex items-center gap-2 text-sm font-medium text-zinc-700 dark:text-zinc-300">
          <Sparkles className="h-4 w-4" aria-hidden />
          Weekly briefing
        </h2>
        <Button
          type="button"
          variant="primary"
          size="sm"
          onClick={onGenerate}
          disabled={pending}
          className="shrink-0"
        >
          {pending ? "Thinking…" : text ? "Regenerate" : "Generate"}
        </Button>
      </div>
      {error && (
        <p className="mt-2 text-sm text-red-600 dark:text-red-400">{error}</p>
      )}
      {text && (
        <p className="mt-2 whitespace-pre-wrap text-sm text-zinc-700 dark:text-zinc-300">
          {text}
        </p>
      )}
      {!text && !error && !pending && (
        <p className="mt-2 text-sm text-zinc-500">
          Live Claude tool calls over your synced usage data. Nothing is
          precomputed.
        </p>
      )}
    </Card>
  );
}
