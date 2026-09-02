import Anthropic from "@anthropic-ai/sdk";
import { AGENT_TOOLS, executeAgentTool, type SupabaseServerClient } from "./tools";

// Server-only: every agent call is billed to the developer's own
// ANTHROPIC_API_KEY (per docs/architecture.md), never a value the end user
// provides. Rate limiting these endpoints is Phase 10's job, not this file's.
const MODEL = "claude-opus-5";
const MAX_TOOL_ROUNDS = 6;

let client: Anthropic | null = null;
function getClient(): Anthropic {
  if (!client) client = new Anthropic();
  return client;
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
): AsyncGenerator<string> {
  const anthropic = getClient();
  const conversation: Anthropic.MessageParam[] = [...messages];

  for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
    const stream = anthropic.messages.stream({
      model: MODEL,
      max_tokens: 4096,
      system,
      thinking: { type: "adaptive" },
      output_config: { effort: "low" },
      tools: AGENT_TOOLS,
      messages: conversation,
    });

    let roundHadText = false;
    for await (const event of stream) {
      if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
        roundHadText = true;
        yield event.delta.text;
      }
    }

    const response = await stream.finalMessage();

    if (response.stop_reason !== "tool_use") {
      return;
    }

    // A round can emit text (e.g. "I'll check that.") before calling a
    // tool; separate it from the next round's text so they don't run
    // together mid-sentence once concatenated on the client.
    if (roundHadText) yield "\n\n";

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

  yield "I ran out of tool-call turns before finishing. Try a narrower question.";
}
