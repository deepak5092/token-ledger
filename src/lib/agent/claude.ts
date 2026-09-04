import Anthropic, { APIError } from "@anthropic-ai/sdk";
import { AGENT_TOOLS, executeAgentTool, type SupabaseServerClient } from "./tools";

// Server-only: every agent call is billed to the developer's own
// ANTHROPIC_API_KEY (per docs/architecture.md), never a value the end user
// provides. Rate limiting these endpoints is Phase 10's job, not this file's.
const MODEL = "claude-opus-5";
const MAX_TOOL_ROUNDS = 6;

// overloaded_error and rate_limit_error are transient; everything else
// (bad request, auth, a genuinely too-large prompt) won't succeed on retry.
const RETRYABLE_ERROR_TYPES = new Set(["overloaded_error", "rate_limit_error"]);
const MAX_ATTEMPTS = 3;
const RETRY_BASE_DELAY_MS = 1000;

// Thrown only with a message that's already safe to show verbatim in the
// chat UI — never wrap a raw APIError in this, since its .message
// is the raw API error body (see error.ts's makeMessage).
export class AgentUnavailableError extends Error {}

// Almost every round only ever produces text; "file" is the one exception,
// emitted when the model calls generate_spend_report, so the UI can render
// an actual download link instead of the model having to spell out a raw
// URL in prose (which SCOPE_GUARD-style plain-text replies can't format).
export type AgentStreamChunk =
  | { type: "text"; text: string }
  | { type: "file"; url: string; label: string };

let client: Anthropic | null = null;
function getClient(): Anthropic {
  if (!client) client = new Anthropic();
  return client;
}

function isRetryableApiError(err: unknown): err is APIError {
  return err instanceof APIError && !!err.type && RETRYABLE_ERROR_TYPES.has(err.type);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Standard tool-use loop, streamed: send the prompt + tools, yield text
// deltas as the model produces them, execute any tool_use blocks once a
// round finishes, feed results back, repeat until it stops calling tools.
// Effort is deliberately low: this is bounded lookup-then-summarize work,
// not long-horizon reasoning.
export async function* runAgentLoopStream(
  supabase: SupabaseServerClient,
  system: string,
  messages: Anthropic.MessageParam[],
): AsyncGenerator<AgentStreamChunk> {
  const anthropic = getClient();
  const conversation: Anthropic.MessageParam[] = [...messages];

  for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
    let response: Anthropic.Message | undefined;
    let roundHadText = false;

    for (let attempt = 1; ; attempt++) {
      try {
        const stream = anthropic.messages.stream({
          model: MODEL,
          max_tokens: 4096,
          system,
          thinking: { type: "adaptive" },
          output_config: { effort: "low" },
          tools: AGENT_TOOLS,
          messages: conversation,
        });

        for await (const event of stream) {
          if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
            roundHadText = true;
            yield { type: "text", text: event.delta.text };
          }
        }

        response = await stream.finalMessage();
        break;
      } catch (err) {
        // Full detail server-side only: request_id, error type, status. The
        // client only ever sees AgentUnavailableError's fixed message (see
        // route.ts's catch), so nothing here reaches the end user.
        console.error("[agent] Anthropic API call failed", {
          attempt,
          round,
          type: err instanceof APIError ? err.type : undefined,
          status: err instanceof APIError ? err.status : undefined,
          requestID: err instanceof APIError ? err.requestID : undefined,
          err,
        });

        // Once we've already streamed partial text to the client for this
        // round, we can't retry cleanly without duplicating output, so a
        // later failure just surfaces the fallback instead of retrying.
        if (roundHadText || attempt >= MAX_ATTEMPTS || !isRetryableApiError(err)) {
          throw new AgentUnavailableError(
            "I'm having trouble reaching the model right now, please try again in a moment.",
          );
        }

        await sleep(RETRY_BASE_DELAY_MS * 2 ** (attempt - 1));
      }
    }

    if (response.stop_reason !== "tool_use") {
      return;
    }

    // A round can emit text (e.g. "I'll check that.") before calling a
    // tool; separate it from the next round's text so they don't run
    // together mid-sentence once concatenated on the client.
    if (roundHadText) yield { type: "text", text: "\n\n" };

    conversation.push({ role: "assistant", content: response.content });

    const toolResults: Anthropic.ToolResultBlockParam[] = [];
    for (const block of response.content) {
      if (block.type !== "tool_use") continue;
      try {
        const result = await executeAgentTool(
          supabase,
          block.name,
          block.input as Record<string, unknown>,
        );
        // Every file-producing tool (generate_spend_report, generate_spend_export,
        // ...) returns this same { report_url, label } shape, so the file
        // event doesn't need to special-case tool names.
        if (result && typeof result === "object" && "report_url" in result && "label" in result) {
          const { report_url, label } = result as { report_url: string; label: string };
          yield { type: "file", url: report_url, label };
        }
        toolResults.push({
          type: "tool_result",
          tool_use_id: block.id,
          content: JSON.stringify(result),
        });
      } catch (err) {
        toolResults.push({
          type: "tool_result",
          tool_use_id: block.id,
          content: err instanceof Error ? err.message : "Tool execution failed.",
          is_error: true,
        });
      }
    }

    conversation.push({ role: "user", content: toolResults });
  }

  yield {
    type: "text",
    text: "I ran out of tool-call turns before finishing. Try a narrower question.",
  };
}
