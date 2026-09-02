"use server";

import { createClient } from "@/lib/supabase/server";
import { runAgentLoop } from "@/lib/agent/claude";
import type { SupabaseServerClient } from "@/lib/agent/tools";
import { checkRateLimit, RATE_LIMITS } from "@/lib/rate-limit";

export type AgentResult = { ok: true; text: string } | { ok: false; error: string };

async function requireUser(): Promise<{ supabase: SupabaseServerClient; userId: string } | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user ? { supabase, userId: user.id } : null;
}

// Every agent call hits the developer's own ANTHROPIC_API_KEY, not the end
// user's; this is the app-side backstop against runaway cost, on top of
// (not instead of) the spend cap set in the Anthropic console.
async function checkAgentRateLimit(userId: string): Promise<string | null> {
  const withinLimit = await checkRateLimit(`agent:${userId}`, RATE_LIMITS.agent);
  return withinLimit
    ? null
    : "You've hit the hourly limit for agent requests. Try again later.";
}

const NO_MARKDOWN =
  "Plain text only, no markdown headers, bold, or bullet characters. Never use em dashes in your response; use a comma, period, or plain hyphen instead.";

export async function generateBriefing(): Promise<AgentResult> {
  const session = await requireUser();
  if (!session) return { ok: false, error: "Not signed in." };
  const limitError = await checkAgentRateLimit(session.userId);
  if (limitError) return { ok: false, error: limitError };

  try {
    const text = await runAgentLoop(
      session.supabase,
      `You are Token Ledger's spend analyst. You have tools to query the signed-in user's real AI usage data. Always call a tool before stating any dollar amount, token count, or model name; never estimate or invent one. Write a short spend briefing covering: total spend, the trend vs. the prior period, and the model or provider driving the bill. 3-5 sentences. ${NO_MARKDOWN}`,
      [{ role: "user", content: "Give me a spend briefing for the last 30 days." }],
    );
    return { ok: true, text };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "The briefing agent failed." };
  }
}

export async function explainAnomaly(date: string): Promise<AgentResult> {
  const session = await requireUser();
  if (!session) return { ok: false, error: "Not signed in." };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return { ok: false, error: "Invalid date." };
  const limitError = await checkAgentRateLimit(session.userId);
  if (limitError) return { ok: false, error: limitError };

  try {
    const text = await runAgentLoop(
      session.supabase,
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
  const session = await requireUser();
  if (!session) return { ok: false, error: "Not signed in." };
  if (!question.trim()) return { ok: false, error: "Ask a question first." };
  const limitError = await checkAgentRateLimit(session.userId);
  if (limitError) return { ok: false, error: limitError };

  try {
    const messages: ChatMessage[] = [...history.slice(-10), { role: "user", content: question }];
    const text = await runAgentLoop(
      session.supabase,
      `You are Token Ledger's spend analyst. Answer the user's question about their own AI usage and spend using the tools. Always call a tool before stating any dollar amount, token count, model name, or date; never estimate or invent one. Be concise. ${NO_MARKDOWN}`,
      messages,
    );
    return { ok: true, text };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "The agent failed to respond." };
  }
}
