"use client";

import { useCallback, useEffect, useState } from "react";
import { Plus, Trash2, MessageSquare } from "lucide-react";
import type { ConversationSummary } from "@/lib/agent/conversations";
import { cn } from "@/lib/cn";

// ChatGPT-style conversation list: "New chat" up top, past conversations
// below ordered most-recently-active first (agent_messages_touch_conversation
// keeps updated_at current server-side). `refreshKey` is bumped by the
// parent whenever a conversation is created or a turn completes, since
// this component has no other way to know its list is stale.
export function ConversationSidebar({
  activeId,
  refreshKey,
  onSelect,
  onNew,
}: {
  activeId: string | null;
  refreshKey: number;
  onSelect: (id: string) => void;
  onNew: () => void;
}) {
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [loaded, setLoaded] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/conversations");
      if (res.ok) {
        const body = (await res.json()) as { conversations: ConversationSummary[] };
        setConversations(body.conversations);
      }
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh, refreshKey]);

  const remove = async (id: string) => {
    setConversations((cs) => cs.filter((c) => c.id !== id));
    if (activeId === id) onNew();
    await fetch(`/api/conversations/${id}`, { method: "DELETE" });
  };

  return (
    <div className="flex h-full w-64 shrink-0 flex-col border-r border-zinc-200 dark:border-zinc-800">
      <div className="p-3">
        <button
          type="button"
          onClick={onNew}
          className="flex w-full items-center gap-2 rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-700 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-900"
        >
          <Plus className="h-4 w-4" aria-hidden />
          New chat
        </button>
      </div>
      <div className="min-h-0 flex-1 space-y-0.5 overflow-y-auto px-2 pb-3">
        {loaded && conversations.length === 0 && (
          <p className="px-2 py-4 text-center text-xs text-zinc-500">No conversations yet.</p>
        )}
        {conversations.map((c) => (
          <div
            key={c.id}
            onClick={() => onSelect(c.id)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === "Enter" && onSelect(c.id)}
            className={cn(
              "group flex w-full cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors",
              c.id === activeId
                ? "bg-accent text-accent-foreground"
                : "text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-900",
            )}
          >
            <MessageSquare className="h-3.5 w-3.5 shrink-0 opacity-70" aria-hidden />
            <span className="flex-1 truncate">{c.title}</span>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                remove(c.id);
              }}
              aria-label="Delete conversation"
              className="shrink-0 rounded p-0.5 opacity-0 hover:bg-black/10 group-hover:opacity-100 dark:hover:bg-white/10"
            >
              <Trash2 className="h-3.5 w-3.5" aria-hidden />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
