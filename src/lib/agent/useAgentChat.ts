"use client";

import { useState } from "react";
import { streamAgent, type ChatMessage } from "./stream-client";
import type { ConversationSummary } from "./conversations";

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
//
// Persisted chat history (ChatGPT-style conversation list) is opt-in via
// `conversationId`/`onConversationCreated`: AgentPanel calls this hook
// without them and keeps behaving exactly as before (nothing sent to
// /api/conversations, nothing persisted). ChatPanel passes both, so the
// first message of a fresh session lazily creates a conversation row
// before the chat request goes out, the same way ChatGPT doesn't show a
// "New chat" in its sidebar until you've actually sent something.
export function useAgentChat(options?: {
  conversationId?: string | null;
  onConversationCreated?: (conversation: ConversationSummary) => void;
  onTurnComplete?: () => void;
}) {
  const conversationId = options?.conversationId ?? null;
  const onConversationCreated = options?.onConversationCreated;
  const onTurnComplete = options?.onTurnComplete;

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

    let activeConversationId = conversationId;
    if (action.mode === "chat" && onConversationCreated && !activeConversationId) {
      try {
        const res = await fetch("/api/conversations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: question }),
        });
        if (res.ok) {
          const { conversation } = (await res.json()) as { conversation: ConversationSummary };
          activeConversationId = conversation.id;
          onConversationCreated(conversation);
        }
      } catch {
        // A conversation row is just where the turn gets saved -- if this
        // fails, the chat itself should still work, just without history.
      }
    }

    let text = "";
    let file: { url: string; label: string } | null = null;
    await streamAgent(
      action.mode === "chat"
        ? { mode: "chat", question, history, conversation_id: activeConversationId ?? undefined }
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
    onTurnComplete?.();
  };

  const submit = (question: string) => run({ mode: "chat", question });

  return { messages, error, pending, draft, draftFile, submit, run, setMessages };
}
