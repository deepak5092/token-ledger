import type { SupabaseServerClient } from "./tools";
import type { ChatMessage } from "./prompts";

export type ConversationSummary = {
  id: string;
  title: string;
  updated_at: string;
};

const TITLE_MAX_LENGTH = 60;

export function titleFromQuestion(question: string): string {
  const trimmed = question.trim().replace(/\s+/g, " ");
  if (trimmed.length <= TITLE_MAX_LENGTH) return trimmed;
  return `${trimmed.slice(0, TITLE_MAX_LENGTH - 1)}…`;
}

export async function listConversations(
  supabase: SupabaseServerClient,
): Promise<ConversationSummary[]> {
  const { data } = await supabase
    .from("agent_conversations")
    .select("id, title, updated_at")
    .order("updated_at", { ascending: false });
  return data ?? [];
}

export async function createConversation(
  supabase: SupabaseServerClient,
  userId: string,
  title: string,
): Promise<ConversationSummary | null> {
  const { data } = await supabase
    .from("agent_conversations")
    .insert({ user_id: userId, title })
    .select("id, title, updated_at")
    .single();
  return data ?? null;
}

export async function deleteConversation(
  supabase: SupabaseServerClient,
  id: string,
): Promise<void> {
  await supabase.from("agent_conversations").delete().eq("id", id);
}

type MessageRow = {
  role: "user" | "assistant";
  content: string;
  file_url: string | null;
  file_label: string | null;
};

export async function getMessages(
  supabase: SupabaseServerClient,
  conversationId: string,
): Promise<ChatMessage[]> {
  const { data } = await supabase
    .from("agent_messages")
    .select("role, content, file_url, file_label")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true })
    .returns<MessageRow[]>();

  return (data ?? []).map((row) => ({
    role: row.role,
    content: row.content,
    file: row.file_url && row.file_label ? { url: row.file_url, label: row.file_label } : undefined,
  }));
}

export async function insertMessage(
  supabase: SupabaseServerClient,
  conversationId: string,
  role: "user" | "assistant",
  content: string,
  file?: { url: string; label: string } | null,
): Promise<void> {
  await supabase.from("agent_messages").insert({
    conversation_id: conversationId,
    role,
    content,
    file_url: file?.url ?? null,
    file_label: file?.label ?? null,
  });
}
