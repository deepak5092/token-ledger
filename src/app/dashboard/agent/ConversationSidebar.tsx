"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import { Plus, Trash2, MessageSquare, X } from "lucide-react";
import type { ConversationSummary } from "@/lib/agent/conversations";
import { cn } from "@/lib/cn";

// ChatGPT-style conversation list: "New chat" up top, past conversations
// below ordered most-recently-active first (agent_messages_touch_conversation
// keeps updated_at current server-side). `refreshKey` is bumped by the
// parent whenever a conversation is created or a turn completes, since
// this component has no other way to know its list is stale.
//
// Rendered twice, same as SidebarNav's own desktop/mobile split: an
// always-visible inline column at lg+ (identical markup/classes to before
// this had a mobile variant at all, so desktop is untouched), and a
// backdrop + slide-over drawer below lg, opened via the toggle button
// ChatPanel renders next to ThemeToggle -- a fixed 16rem inline column
// left barely any room for the chat itself on a phone-width screen.
export function ConversationSidebar({
  activeId,
  refreshKey,
  onSelect,
  onNew,
  mobileOpen,
  onMobileClose,
}: {
  activeId: string | null;
  refreshKey: number;
  onSelect: (id: string) => void;
  onNew: () => void;
  mobileOpen: boolean;
  onMobileClose: () => void;
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

  useEffect(() => {
    if (!mobileOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onMobileClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [mobileOpen, onMobileClose]);

  const remove = async (id: string) => {
    setConversations((cs) => cs.filter((c) => c.id !== id));
    if (activeId === id) onNew();
    await fetch(`/api/conversations/${id}`, { method: "DELETE" });
  };

  const select = (id: string) => {
    onSelect(id);
    onMobileClose();
  };

  const newChat = () => {
    onNew();
    onMobileClose();
  };

  const content = (): ReactNode => (
    <>
      <div className="p-3">
        <button
          type="button"
          onClick={newChat}
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
            onClick={() => select(c.id)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === "Enter" && select(c.id)}
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
    </>
  );

  return (
    <>
      {/* Desktop: identical to the pre-mobile-support markup, just gated
          behind lg: instead of being unconditional. */}
      <div className="hidden h-full w-64 shrink-0 flex-col border-r border-zinc-200 lg:flex dark:border-zinc-800">
        {content()}
      </div>

      {/* Mobile: backdrop + slide-over drawer, matching SidebarNav's own. */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="fixed inset-0 bg-black/40" onClick={onMobileClose} aria-hidden />
          <div className="fixed inset-y-0 left-0 flex w-64 flex-col bg-white shadow-lg dark:bg-black">
            <div className="flex items-center justify-between px-3 pt-3">
              <span className="text-sm font-medium text-foreground">Chat history</span>
              <button
                type="button"
                onClick={onMobileClose}
                aria-label="Close chat history"
                className="flex h-7 w-7 items-center justify-center rounded-md text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-900"
              >
                <X className="h-4 w-4" aria-hidden />
              </button>
            </div>
            {content()}
          </div>
        </div>
      )}
    </>
  );
}
