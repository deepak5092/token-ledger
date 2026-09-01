"use server";

import { createClient } from "@/lib/supabase/server";
import { runAgentLoop } from "@/lib/agent/claude";
import type { SupabaseServerClient } from "@/lib/agent/tools";

export type AgentResult = { ok: true; text: string } | { ok: false; error: string };

async function requireUser(): Promise<SupabaseServerClient | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user ? supabase : null;
}

const NO_MARKDOWN = "Plain text only — no markdown headers, bold, or bullet characters.";

export async function generateBriefing(): Promise<AgentResult> {
  const supabase = await requireUser();
  if (!supabase) return { ok: false, error: "Not signed in." };

  try {
    const text = await runAgentLoop(
      supabase,
      `You are Token Ledger's spend analyst. You have tools to query the signed-in user's real AI usage data — always call a tool before stating any dollar amount, token count, or model name; never estimate or invent one. Write a short spend briefing covering: total spend, the trend vs. the prior period, and the model or provider driving the bill. 3-5 sentences. ${NO_MARKDOWN}`,
      [{ role: "user", content: "Give me a spend briefing for the last 30 days." }],
    );
    return { ok: true, text };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "The briefing agent failed." };
  }
}

export async function explainAnomaly(date: string): Promise<AgentResult> {
  const supabase = await requireUser();
  if (!supabase) return { ok: false, error: "Not signed in." };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return { ok: false, error: "Invalid date." };

  try {
    const text = await runAgentLoop(
      supabase,
      `You are Token Ledger's spend analyst investigating one flagged spending anomaly. Use the tools to find which model and connection drove the spike on the given date, and check nearby days to say whether it looks like a one-off or the start of a trend. 2-3 sentences. ${NO_MARKDOWN}`,
      [{ role: "user", content: `Explain the spend anomaly on ${date}.` }],
    );
    return { ok: true, text };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "The anomaly explainer failed." };
  }
}

export type ChatMessage = { role: "user" | "assistant"; content: string };

export async function askAgent(question: string, history: ChatMessage[]): Promise<AgentResult> {
  const supabase = await requireUser();
  if (!supabase) return { ok: false, error: "Not signed in." };
  if (!question.trim()) return { ok: false, error: "Ask a question first." };

  try {
    const messages: ChatMessage[] = [...history.slice(-10), { role: "user", content: question }];
    const text = await runAgentLoop(
      supabase,
      `You are Token Ledger's spend analyst. Answer the user's question about their own AI usage and spend using the tools — always call a tool before stating any dollar amount, token count, model name, or date; never estimate or invent one. Be concise. ${NO_MARKDOWN}`,
      messages,
    );
    return { ok: true, text };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "The agent failed to respond." };
  }
}
