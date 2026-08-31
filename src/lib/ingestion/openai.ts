import type { NormalizedUsageRecord } from "./types";

// UNVERIFIED: built against OpenAI's documented organization Usage API
// shape, but never exercised against a live Admin key. If a real sync fails
// or returns unexpected data, the response body is included in the thrown
// error to make it easy to fix the field mapping below.
export async function fetchOpenAIUsage(
  apiKey: string,
  days = 30,
): Promise<NormalizedUsageRecord[]> {
  const startTime = Math.floor(Date.now() / 1000) - days * 24 * 60 * 60;

  const records: NormalizedUsageRecord[] = [];
  let page: string | undefined;

  do {
    const url = new URL("https://api.openai.com/v1/organization/usage/completions");
    url.searchParams.set("start_time", String(startTime));
    url.searchParams.set("bucket_width", "1d");
    url.searchParams.set("group_by", "model");
    url.searchParams.set("limit", "31");
    if (page) url.searchParams.set("page", page);

    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });

    if (!res.ok) {
      const body = await res.text();
      throw new Error(
        `OpenAI usage API error (${res.status}): ${body.slice(0, 300)}`,
      );
    }

    const data = await res.json();

    for (const bucket of data.data ?? []) {
      const date = new Date(bucket.start_time * 1000).toISOString().slice(0, 10);
      for (const result of bucket.results ?? []) {
        records.push({
          date,
          model: result.model ?? "unknown",
          input_tokens: result.input_tokens ?? 0,
          output_tokens: result.output_tokens ?? 0,
          // OpenAI's dollar cost comes from a separate Costs API, not this
          // one. Left at 0 until Phase 8's pricing table backfills it.
          cost_usd: 0,
        });
      }
    }

    page = data.has_more ? data.next_page : undefined;
  } while (page);

  return records;
}
