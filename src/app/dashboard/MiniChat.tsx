"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Bot, Send } from "lucide-react";
import { useAgentChat } from "@/lib/agent/useAgentChat";
import { Input } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";

// Compact widget for quick questions without leaving Overview -- shares
// useAgentChat's streaming logic with the full Ask-agent page, but keeps
// its own separate conversation (not the same thread as that page).
//
// Deliberately not built on the shared Card component: it used the same
// plain white bordered look as Weekly Briefing/Anomalies and blended in.
// The accent-colored header bar here needs to bleed edge-to-edge with its
// own rounded top corners while the body below keeps normal padding --
// easier to get right with a custom two-piece wrapper than fighting
// Card's own p-4 with an overriding class (this app's cn() is a plain
// join, not a Tailwind-merge, so later classes don't reliably win).
export function MiniChat() {
  const { messages, error, pending, draft, submit } = useAgentChat();
  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [messages, draft]);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const q = input;
    setInput("");
    submit(q);
  };

  return (
    <div className="overflow-hidden rounded-lg border border-zinc-200 shadow-sm dark:border-zinc-800">
      <div className="flex items-center gap-2 bg-accent px-4 py-2.5 text-sm font-medium text-accent-foreground">
        <Bot className="h-4 w-4" aria-hidden />
        Quick question
      </div>

      <div className="bg-white p-4 dark:bg-zinc-950">
        <div className="max-h-64 space-y-2 overflow-y-auto">
          {messages.length === 0 && !pending && (
            <p className="text-sm text-zinc-500">Ask about your spend right here.</p>
          )}
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

        <form onSubmit={onSubmit} className="mt-3 flex gap-2">
          <Input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask a quick question…"
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

        <Link
          href="/dashboard/agent"
          className="mt-2 block text-center text-xs font-medium text-zinc-500 underline hover:text-foreground"
        >
          Open full chat
        </Link>
      </div>
    </div>
  );
}
