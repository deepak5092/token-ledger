import { createClient } from "@/lib/supabase/server";
import { checkRateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import { runAgentLoopStream, AgentUnavailableError } from "@/lib/agent/claude";
import {
  briefingPrompt,
  anomalyPrompt,
  chatPrompt,
  isObviouslyOffTopic,
  OFF_TOPIC_REPLY,
  type ChatMessage,
} from "@/lib/agent/prompts";
import { insertMessage } from "@/lib/agent/conversations";

const FALLBACK_MESSAGE =
  "I'm having trouble reaching the model right now, please try again in a moment.";

type AgentRequest =
  | { mode: "chat"; question: string; history: ChatMessage[]; conversation_id?: string }
  | { mode: "briefing" }
  | { mode: "anomaly"; date: string };

type StreamEvent =
  | { type: "text"; text: string }
  | { type: "file"; url: string; label: string }
  | { type: "error"; message: string };

function sse(event: StreamEvent): string {
  return `data: ${JSON.stringify(event)}\n\n`;
}

// Streams the agent's answer as Server-Sent Events instead of buffering the
// whole Claude response before replying, so the UI can render text as it's
// generated (previously a "use server" action returned one blocking result).
export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return Response.json({ error: "Not signed in." }, { status: 401 });
  }

  const withinLimit = await checkRateLimit(`agent:${user.id}`, RATE_LIMITS.agent);
  if (!withinLimit) {
    return Response.json(
      { error: "You've hit the hourly limit for agent requests. Try again later." },
      { status: 429 },
    );
  }

  let body: AgentRequest;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid request." }, { status: 400 });
  }

  // Only mode:"chat" carries a conversation_id (AgentPanel's briefing/
  // anomaly turns and its own ad hoc questions never pass one, so this is
  // strictly additive -- everything below is a no-op without it).
  const conversationId = body.mode === "chat" ? body.conversation_id : undefined;

  let prompt: { system: string; messages: Parameters<typeof runAgentLoopStream>[2] } | null = null;
  if (body.mode === "chat") {
    const question = body.question?.trim();
    if (!question) return Response.json({ error: "Ask a question first." }, { status: 400 });
    if (conversationId) await insertMessage(supabase, conversationId, "user", question);
    // Skip the tool-use loop (and the model call) entirely for questions
    // that are unambiguously unrelated to spend/usage; SCOPE_GUARD in the
    // system prompt is what actually enforces scope for everything else.
    if (isObviouslyOffTopic(question)) {
      prompt = null;
    } else {
      prompt = chatPrompt(question, body.history ?? []);
    }
  } else if (body.mode === "briefing") {
    prompt = briefingPrompt();
  } else if (body.mode === "anomaly") {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(body.date ?? "")) {
      return Response.json({ error: "Invalid date." }, { status: 400 });
    }
    prompt = anomalyPrompt(body.date);
  } else {
    return Response.json({ error: "Invalid mode." }, { status: 400 });
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      if (!prompt) {
        controller.enqueue(encoder.encode(sse({ type: "text", text: OFF_TOPIC_REPLY })));
        if (conversationId) await insertMessage(supabase, conversationId, "assistant", OFF_TOPIC_REPLY);
        controller.close();
        return;
      }
      // Mirrors what the client actually renders, so a persisted turn reads
      // back exactly like the one the user saw -- not a re-derivation of it.
      let assistantText = "";
      let assistantFile: { url: string; label: string } | undefined;
      try {
        for await (const chunk of runAgentLoopStream(supabase, prompt.system, prompt.messages)) {
          controller.enqueue(encoder.encode(sse(chunk)));
          if (chunk.type === "text") assistantText += chunk.text;
          else if (chunk.type === "file") assistantFile = { url: chunk.url, label: chunk.label };
        }
        if (conversationId && (assistantText || assistantFile)) {
          await insertMessage(supabase, conversationId, "assistant", assistantText, assistantFile);
        }
      } catch (err) {
        // AgentUnavailableError's message is already safe to show verbatim;
        // anything else is logged here and never forwarded to the client,
        // since it could be a raw Anthropic.APIError (request_id, error
        // type) or another exception carrying implementation detail.
        console.error("[agent] request failed:", err);
        const message = err instanceof AgentUnavailableError ? err.message : FALLBACK_MESSAGE;
        controller.enqueue(encoder.encode(sse({ type: "error", message })));
        // The error itself is a transient client-side toast, never part of
        // the message list (see useAgentChat's `if (text || file)` guard) --
        // only persist whatever partial answer actually streamed before it,
        // and only if there was one, to match what the client keeps.
        if (conversationId && (assistantText || assistantFile)) {
          await insertMessage(supabase, conversationId, "assistant", assistantText, assistantFile);
        }
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      "X-Content-Type-Options": "nosniff",
      "X-Accel-Buffering": "no",
    },
  });
}
