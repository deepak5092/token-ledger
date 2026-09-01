"use client";

import { useState, useTransition } from "react";
import { generateBriefing } from "./agent/actions";

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
    <div className="rounded border border-zinc-200 p-4 dark:border-zinc-800">
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Weekly briefing
        </h2>
        <button
          type="button"
          onClick={onGenerate}
          disabled={pending}
          className="shrink-0 rounded bg-black px-3 py-1.5 text-xs text-white disabled:opacity-50 dark:bg-white dark:text-black"
        >
          {pending ? "Thinking…" : text ? "Regenerate" : "Generate"}
        </button>
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
          Live Claude tool calls over your synced usage data — nothing is
          precomputed.
        </p>
      )}
    </div>
  );
}
