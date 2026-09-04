"use client";

import { useState } from "react";
import { streamAgent, type ChatMessage } from "./stream-client";

export type AgentAction =
  | { mode: "chat"; question: string }
  | { mode: "briefing"; label: string }
  | { mode: "anomaly"; date: string; label: string };

// Shared chat state + streaming logic between the full Ask-agent page
// (ChatPanel) and Overview's unified assistant panel (AgentPanel) -- each
// renders it differently, but the streaming loop and history bookkeeping
// is identical. `run` covers all three backend modes and always appends
// to the same message thread; briefing/anomaly turns have no real user
// "question" for that mode, so they carry a synthetic label (e.g.
// "Generate my weekly briefing") to show as the user-side bubble, keeping
// the thread readable as a normal back-and-forth. `submit` is a thin
// wrapper over `run` for plain typed questions.
export function useAgentChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [draft, setDraft] = useState("");
  const [draftFile, setDraftFile] = useState<{ url: string; label: string } | null>(null);

  const run = async (action: AgentAction) => {
    if (pending) return;
    const question = action.mode === "chat" ? action.question.trim() : "";
    if (action.mode === "chat" && !question) return;

    const label = action.mode === "chat" ? question : action.label;

    setError(null);
    setDraft("");
    setDraftFile(null);
    setPending(true);
    const history = messages;
    setMessages([...history, { role: "user", content: label }]);

    let text = "";
    let file: { url: string; label: string } | null = null;
    await streamAgent(
      action.mode === "chat"
        ? { mode: "chat", question, history }
        : action.mode === "briefing"
          ? { mode: "briefing" }
          : { mode: "anomaly", date: action.date },
      {
        onText: (chunk) => {
          text += chunk;
          setDraft(text);
        },
        onFile: (f) => {
          file = f;
          setDraftFile(f);
        },
        onError: setError,
      },
    );

    setPending(false);
    setDraft("");
    setDraftFile(null);
    if (text || file) {
      setMessages((m) => [...m, { role: "assistant", content: text, file: file ?? undefined }]);
    }
  };

  const submit = (question: string) => run({ mode: "chat", question });

  return { messages, error, pending, draft, draftFile, submit, run };
}
