import type { ChatMessage } from "./prompts";

export type { ChatMessage };

export type AgentStreamPayload =
  | { mode: "chat"; question: string; history: ChatMessage[] }
  | { mode: "briefing" }
  | { mode: "anomaly"; date: string };

// Reads the SSE stream from /api/agent and calls back with each text delta
// as it arrives, instead of waiting for the full response like the old
// server-action + single setState pattern did.
export async function streamAgent(
  payload: AgentStreamPayload,
  handlers: {
    onText: (chunk: string) => void;
    onFile: (file: { url: string; label: string }) => void;
    onError: (message: string) => void;
  },
): Promise<void> {
  let res: Response;
  try {
    res = await fetch("/api/agent", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  } catch {
    handlers.onError("Couldn't reach the agent. Check your connection and try again.");
    return;
  }

  if (!res.ok || !res.body) {
    const body = await res.json().catch(() => null);
    handlers.onError(body?.error ?? "The agent failed to respond.");
    return;
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    let sepIndex: number;
    while ((sepIndex = buffer.indexOf("\n\n")) !== -1) {
      const frame = buffer.slice(0, sepIndex);
      buffer = buffer.slice(sepIndex + 2);
      const dataLine = frame.split("\n").find((line) => line.startsWith("data: "));
      if (!dataLine) continue;

      const event = JSON.parse(dataLine.slice("data: ".length)) as
        | { type: "text"; text: string }
        | { type: "file"; url: string; label: string }
        | { type: "error"; message: string };

      if (event.type === "text") handlers.onText(event.text);
      else if (event.type === "file") handlers.onFile({ url: event.url, label: event.label });
      else handlers.onError(event.message);
    }
  }
}
