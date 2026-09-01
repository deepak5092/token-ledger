"use client";

import { useState, useTransition } from "react";
import { askAgent, type ChatMessage } from "./actions";

export function ChatPanel() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const question = input.trim();
    if (!question || pending) return;

    setError(null);
    setInput("");
    const history = messages;
    setMessages([...history, { role: "user", content: question }]);

    startTransition(async () => {
      const result = await askAgent(question, history);
      if (result.ok) {
        setMessages((m) => [...m, { role: "assistant", content: result.text }]);
      } else {
        setError(result.error);
      }
    });
  };

  return (
    <div className="flex max-w-2xl flex-col gap-4">
      <div className="min-h-[200px] space-y-3 rounded border border-zinc-200 p-4 dark:border-zinc-800">
        {messages.length === 0 && !pending && (
          <p className="text-sm text-zinc-500">
            Ask about your spend — e.g. &quot;which model cost the most last
            month?&quot; or &quot;how does this week compare to last
            week?&quot;
          </p>
        )}
        {messages.map((m, i) => (
          <div
            key={i}
            className={`rounded px-3 py-2 text-sm whitespace-pre-wrap ${
              m.role === "user"
                ? "ml-auto max-w-[85%] bg-black text-white dark:bg-white dark:text-black"
                : "mr-auto max-w-[85%] bg-zinc-100 text-zinc-800 dark:bg-zinc-900 dark:text-zinc-200"
            }`}
          >
            {m.content}
          </div>
        ))}
        {pending && (
          <div className="mr-auto max-w-[85%] rounded bg-zinc-100 px-3 py-2 text-sm text-zinc-500 dark:bg-zinc-900">
            Thinking…
          </div>
        )}
        {error && (
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        )}
      </div>

      <form onSubmit={onSubmit} className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask about your spend…"
          disabled={pending}
          className="flex-1 rounded border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
        />
        <button
          type="submit"
          disabled={pending || !input.trim()}
          className="rounded bg-black px-4 py-2 text-sm text-white disabled:opacity-50 dark:bg-white dark:text-black"
        >
          Ask
        </button>
      </form>
    </div>
  );
}
