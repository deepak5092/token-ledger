"use client";

import { useState, useTransition } from "react";
import { Bot, User, Send } from "lucide-react";
import { askAgent, type ChatMessage } from "./actions";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";

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
      <Card className="min-h-[200px] space-y-3">
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
            className={`flex items-start gap-2 ${m.role === "user" ? "flex-row-reverse" : ""}`}
          >
            <span
              className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${
                m.role === "user"
                  ? "bg-accent text-accent-foreground"
                  : "bg-zinc-200 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"
              }`}
              aria-hidden
            >
              {m.role === "user" ? <User className="h-3.5 w-3.5" /> : <Bot className="h-3.5 w-3.5" />}
            </span>
            <div
              className={`max-w-[80%] rounded-lg px-3 py-2 text-sm whitespace-pre-wrap ${
                m.role === "user"
                  ? "bg-accent text-accent-foreground"
                  : "bg-zinc-100 text-zinc-800 dark:bg-zinc-900 dark:text-zinc-200"
              }`}
            >
              {m.content}
            </div>
          </div>
        ))}
        {pending && (
          <div className="flex items-start gap-2">
            <span
              className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-zinc-200 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"
              aria-hidden
            >
              <Bot className="h-3.5 w-3.5" />
            </span>
            <div className="rounded-lg bg-zinc-100 px-3 py-2 text-sm text-zinc-500 dark:bg-zinc-900">
              Thinking…
            </div>
          </div>
        )}
        {error && (
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        )}
      </Card>

      <form onSubmit={onSubmit} className="flex gap-2">
        <Input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask about your spend…"
          disabled={pending}
          className="!mt-0 flex-1"
        />
        <Button type="submit" variant="primary" disabled={pending || !input.trim()}>
          <Send className="h-4 w-4" aria-hidden />
          Ask
        </Button>
      </form>
    </div>
  );
}
