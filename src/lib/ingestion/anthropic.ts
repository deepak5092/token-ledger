import type { NormalizedUsageRecord } from "./types";
import { estimateCost } from "@/lib/pricing/models";

// UNVERIFIED: built against Anthropic's documented Usage & Cost Admin API
// shape, but never exercised against a live Admin key. If a real sync fails
// or returns unexpected data, the response body is included in the thrown
// error to make it easy to fix the field mapping below.
export async function fetchAnthropicUsage(
  apiKey: string,
  days = 30,
): Promise<NormalizedUsageRecord[]> {
  const startingAt = new Date();
  startingAt.setUTCDate(startingAt.getUTCDate() - days);
  startingAt.setUTCHours(0, 0, 0, 0);

  const records: NormalizedUsageRecord[] = [];
  let page: string | undefined;

  do {
    const url = new URL(
      "https://api.anthropic.com/v1/organizations/usage_report/messages",
    );
    url.searchParams.set("starting_at", startingAt.toISOString());
    url.searchParams.set("bucket_width", "1d");
    url.searchParams.append("group_by[]", "model");
    if (page) url.searchParams.set("page", page);

    const res = await fetch(url, {
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
    });

    if (!res.ok) {
      const body = await res.text();
      throw new Error(
        `Anthropic usage API error (${res.status}): ${body.slice(0, 300)}`,
      );
    }

    const data = await res.json();

    for (const bucket of data.data ?? []) {
      const date = bucket.starting_at?.slice(0, 10);
      for (const result of bucket.results ?? []) {
        const model = result.model ?? "unknown";
        const inputTokens =
          (result.uncached_input_tokens ?? 0) + (result.cache_creation_input_tokens ?? 0);
        const outputTokens = result.output_tokens ?? 0;
        records.push({
          date,
          model,
          input_tokens: inputTokens,
          output_tokens: outputTokens,
          // Anthropic's dollar cost comes from a separate Cost Report
          // endpoint, not this one. Estimate from the pricing table
          // instead. Falls back to 0 for a model the table doesn't cover.
          cost_usd: estimateCost(model, inputTokens, outputTokens) ?? 0,
        });
      }
    }

    page = data.has_more ? data.next_page : undefined;
  } while (page);

  return records;
}
