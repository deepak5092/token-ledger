import type { NormalizedUsageRecord } from "./types";

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
        records.push({
          date,
          model: result.model ?? "unknown",
          input_tokens:
            (result.uncached_input_tokens ?? 0) +
            (result.cache_creation_input_tokens ?? 0),
          output_tokens: result.output_tokens ?? 0,
          // Anthropic's dollar cost comes from a separate Cost Report
          // endpoint, not this one. Left at 0 until Phase 8's pricing
          // table backfills it from token counts.
          cost_usd: 0,
        });
      }
    }

    page = data.has_more ? data.next_page : undefined;
  } while (page);

  return records;
}
