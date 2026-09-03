"use client";

import { useState } from "react";
import { streamAgent, type ChatMessage } from "./stream-client";

// Shared chat state + submit logic between the full Ask-agent page
// (ChatPanel) and the compact widget embedded in the Overview page's AI
// panel (MiniChat) -- each renders it differently, but the streaming loop
// and history bookkeeping is identical.
export function useAgentChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [draft, setDraft] = useState("");

  const submit = async (question: string) => {
    const q = question.trim();
    if (!q || pending) return;

    setError(null);
    setDraft("");
    setPending(true);
    const history = messages;
    setMessages([...history, { role: "user", content: q }]);

    let text = "";
    await streamAgent(
      { mode: "chat", question: q, history },
      {
        onText: (chunk) => {
          text += chunk;
          setDraft(text);
        },
        onError: setError,
      },
    );

    setPending(false);
    setDraft("");
    if (text) setMessages((m) => [...m, { role: "assistant", content: text }]);
  };

  return { messages, error, pending, draft, submit };
}
