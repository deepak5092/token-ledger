import type { Provider } from "./types";

export type ValidationResult = { ok: true } | { ok: false; error: string };

// Validates against the actual usage-reporting endpoint rather than a cheap
// completions call, so we catch "wrong key type" at connect-time instead of
// at sync-time; both providers require an org/admin-level key for usage
// data, not a regular per-project API key.
export async function validateProviderKey(
  provider: Provider,
  apiKey: string,
): Promise<ValidationResult> {
  switch (provider) {
    case "bedrock_synthetic":
      return { ok: true };
    case "anthropic":
      return validateAnthropicKey(apiKey);
    case "openai":
      return validateOpenAIKey(apiKey);
  }
}

async function validateAnthropicKey(apiKey: string): Promise<ValidationResult> {
  const today = new Date().toISOString().slice(0, 10);

  try {
    const res = await fetch(
      `https://api.anthropic.com/v1/organizations/usage_report/messages?starting_at=${today}T00:00:00Z&limit=1`,
      {
        headers: {
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
        },
      },
    );

    if (res.ok) return { ok: true };

    if (res.status === 401 || res.status === 403) {
      return {
        ok: false,
        error:
          "Anthropic rejected this key. Usage reporting requires an Admin API key (Console → Settings → Admin keys), not a regular API key.",
      };
    }

    const body = await res.text();
    return {
      ok: false,
      error: `Anthropic error (${res.status}): ${body.slice(0, 200)}`,
    };
  } catch {
    return {
      ok: false,
      error: "Could not reach Anthropic's API. Check your network and try again.",
    };
  }
}

async function validateOpenAIKey(apiKey: string): Promise<ValidationResult> {
  const startTime = Math.floor(Date.now() / 1000) - 24 * 60 * 60;

  try {
    const res = await fetch(
      `https://api.openai.com/v1/organization/usage/completions?start_time=${startTime}&limit=1`,
      {
        headers: { Authorization: `Bearer ${apiKey}` },
      },
    );

    if (res.ok) return { ok: true };

    if (res.status === 401 || res.status === 403) {
      return {
        ok: false,
        error:
          "OpenAI rejected this key. Usage reporting requires an organization Admin key (platform.openai.com → Settings → Admin keys), not a regular project key.",
      };
    }

    const body = await res.text();
    return {
      ok: false,
      error: `OpenAI error (${res.status}): ${body.slice(0, 200)}`,
    };
  } catch {
    return {
      ok: false,
      error: "Could not reach OpenAI's API. Check your network and try again.",
    };
  }
}
