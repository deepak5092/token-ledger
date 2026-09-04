"use client";

import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { Bot, ArrowUp, FileDown } from "lucide-react";
import { useAgentChat } from "@/lib/agent/useAgentChat";

function ReportLink({ file }: { file: { url: string; label: string } }) {
  return (
    <a
      href={file.url}
      download
      className="mt-2 inline-flex items-center gap-1.5 rounded-lg border border-zinc-300 px-3 py-1.5 text-sm text-zinc-700 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-900"
    >
      <FileDown className="h-3.5 w-3.5" aria-hidden />
      {file.label}
    </a>
  );
}

const SUGGESTIONS = [
  "Which model cost the most last month?",
  "How does this week compare to last week?",
  "Any anomalies I should know about?",
];

export function ChatPanel() {
  const { messages, error, pending, draft, draftFile, submit: submitQuestion } = useAgentChat();
  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, draft]);

  const submit = (question: string) => {
    setInput("");
    if (textareaRef.current) textareaRef.current.style.height = "auto";
    submitQuestion(question);
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    submit(input);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submit(input);
    }
  };

  const onChangeInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    e.target.style.height = "auto";
    e.target.style.height = `${Math.min(e.target.scrollHeight, 160)}px`;
  };

  const hasMessages = messages.length > 0 || pending;

  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto flex min-h-full w-full max-w-3xl flex-col px-4">
          {!hasMessages ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-6 py-12 text-center">
              <div>
                <h1 className="text-2xl font-semibold text-foreground">Ask about your spend</h1>
                <p className="mt-2 max-w-md text-sm text-zinc-600 dark:text-zinc-400">
                  A tool-using Claude agent answers questions grounded in your
                  own synced usage data — it queries{" "}
                  <code className="font-mono">usage_records</code> for every
                  answer rather than guessing.
                </p>
              </div>
              <div className="flex flex-wrap justify-center gap-2">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => submit(s)}
                    className="rounded-full border border-zinc-300 px-3 py-1.5 text-sm text-zinc-700 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-900"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex-1 space-y-6 py-6">
              {messages.map((m, i) =>
                m.role === "user" ? (
                  <div key={i} className="flex justify-end">
                    <div className="max-w-[80%] rounded-2xl bg-accent px-4 py-2 text-sm whitespace-pre-wrap text-accent-foreground">
                      {m.content}
                    </div>
                  </div>
                ) : (
                  <div key={i} className="flex gap-3">
                    <span
                      className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-zinc-200 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"
                      aria-hidden
                    >
                      <Bot className="h-3.5 w-3.5" />
                    </span>
                    <div className="flex-1">
                      <p className="whitespace-pre-wrap pt-0.5 text-sm text-zinc-800 dark:text-zinc-200">
                        {m.content}
                      </p>
                      {m.file && <ReportLink file={m.file} />}
                    </div>
                  </div>
                ),
              )}
              {pending && (
                <div className="flex gap-3">
                  <span
                    className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-zinc-200 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"
                    aria-hidden
                  >
                    <Bot className="h-3.5 w-3.5" />
                  </span>
                  <div className="flex-1">
                    <p className="whitespace-pre-wrap pt-0.5 text-sm text-zinc-800 dark:text-zinc-200">
                      {draft ? (
                        <>
                          {draft}
                          <span className="ml-0.5 inline-block h-3.5 w-1.5 animate-pulse bg-zinc-400 align-middle dark:bg-zinc-500" />
                        </>
                      ) : (
                        <span className="text-zinc-500">Thinking…</span>
                      )}
                    </p>
                    {draftFile && <ReportLink file={draftFile} />}
                  </div>
                </div>
              )}
              {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
              <div ref={bottomRef} />
            </div>
          )}
        </div>
      </div>

      <div className="mx-auto w-full max-w-3xl px-4 pb-4 pt-2">
        <form
          onSubmit={onSubmit}
          className="flex items-end gap-2 rounded-2xl border border-zinc-300 bg-white p-2 shadow-sm dark:border-zinc-700 dark:bg-zinc-950"
        >
          <textarea
            ref={textareaRef}
            value={input}
            onChange={onChangeInput}
            onKeyDown={onKeyDown}
            placeholder="Ask about your spend…"
            disabled={pending}
            rows={1}
            className="max-h-40 flex-1 resize-none bg-transparent px-2 py-1.5 text-sm text-foreground placeholder:text-zinc-500 focus:outline-none"
          />
          <button
            type="submit"
            disabled={pending || !input.trim()}
            aria-label="Send"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent text-accent-foreground transition-opacity disabled:opacity-40"
          >
            <ArrowUp className="h-4 w-4" aria-hidden />
          </button>
        </form>
      </div>
    </div>
  );
}
