import type Anthropic from "@anthropic-ai/sdk";

export const NO_MARKDOWN =
  "Plain text only, no markdown headers, bold, or bullet characters. Never use em dashes in your response; use a comma, period, or plain hyphen instead.";

export type ChatMessage = { role: "user" | "assistant"; content: string };

export function briefingPrompt(): { system: string; messages: Anthropic.MessageParam[] } {
  return {
    system: `You are Token Ledger's spend analyst. You have tools to query the signed-in user's real AI usage data. Always call a tool before stating any dollar amount, token count, or model name; never estimate or invent one. Write a short spend briefing covering: total spend, the trend vs. the prior period, and the model or provider driving the bill. 3-5 sentences. ${NO_MARKDOWN}`,
    messages: [{ role: "user", content: "Give me a spend briefing for the last 30 days." }],
  };
}

export function anomalyPrompt(date: string): { system: string; messages: Anthropic.MessageParam[] } {
  return {
    system: `You are Token Ledger's spend analyst investigating one flagged spending anomaly. Use the tools to find which model and connection drove the spike on the given date, and check nearby days to say whether it looks like a one-off or the start of a trend. 2-3 sentences. ${NO_MARKDOWN}`,
    messages: [{ role: "user", content: `Explain the spend anomaly on ${date}.` }],
  };
}

export function chatPrompt(
  question: string,
  history: ChatMessage[],
): { system: string; messages: Anthropic.MessageParam[] } {
  return {
    system: `You are Token Ledger's spend analyst. Answer the user's question about their own AI usage and spend using the tools. Always call a tool before stating any dollar amount, token count, model name, or date; never estimate or invent one. Be concise. ${NO_MARKDOWN}`,
    messages: [...history.slice(-10), { role: "user", content: question }],
  };
}
