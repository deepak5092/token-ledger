import { createClient } from "@/lib/supabase/server";
import { checkRateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import { runAgentLoopStream } from "@/lib/agent/claude";
import { briefingPrompt, anomalyPrompt, chatPrompt, type ChatMessage } from "@/lib/agent/prompts";

type AgentRequest =
  | { mode: "chat"; question: string; history: ChatMessage[] }
  | { mode: "briefing" }
  | { mode: "anomaly"; date: string };

type StreamEvent = { type: "text"; text: string } | { type: "error"; message: string };

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

  let prompt: { system: string; messages: Parameters<typeof runAgentLoopStream>[2] };
  if (body.mode === "chat") {
    const question = body.question?.trim();
    if (!question) return Response.json({ error: "Ask a question first." }, { status: 400 });
    prompt = chatPrompt(question, body.history ?? []);
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
      try {
        for await (const chunk of runAgentLoopStream(supabase, prompt.system, prompt.messages)) {
          controller.enqueue(encoder.encode(sse({ type: "text", text: chunk })));
        }
      } catch (err) {
        controller.enqueue(
          encoder.encode(
            sse({
              type: "error",
              message: err instanceof Error ? err.message : "The agent failed to respond.",
            }),
          ),
        );
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
