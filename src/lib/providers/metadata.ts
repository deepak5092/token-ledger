// Best-effort enrichment: given the raw Admin API key a user pasted in,
// find that key's own entry in the provider's "list API keys" endpoint and
// pull its name/status/created/expiry/owner. Neither provider's list
// endpoint ever returns a key's full value (by design), so matching relies
// on the redacted hint each one does return, compared against the raw key
// we already have in hand. The redaction separator isn't consistently
// "...": Anthropic uses literal dots ("sk-ant-api03-R2D...igAA") but
// OpenAI uses a long run of asterisks ("sk-admin****...****J2cA") --
// verified against real responses, not assumed from docs -- so matching
// splits on *any* run of 2+ "." or "*" characters rather than a literal
// "...". Returns null (never throws past its own fetch) on any failure: a
// missing match, a network error, or a non-200 response -- callers treat
// this as "no metadata this time," not a sync failure.
//
// Anthropic caveat, confirmed against a real org: an Admin API key
// (sk-ant-admin01-...) is a different credential type from the regular
// API keys the list endpoint enumerates (sk-ant-api03-...) -- the admin
// key itself never appears in that list, so it can never be matched.
// fetchAnthropicKeyMetadata falls back to GET /v1/organizations/me for at
// least the organization name; name/status/createdAt/expiresAt stay null
// since there's no endpoint that describes the admin key itself.

export type ProviderKeyMetadata = {
  hint: string | null;
  name: string | null;
  status: string | null;
  createdAt: string | null; // ISO 8601
  expiresAt: string | null; // ISO 8601, Anthropic only
  owner: string | null; // workspace id (Anthropic) or owner name (OpenAI)
};

function splitHint(hint: string): [prefix: string, suffix: string] | null {
  const parts = hint.split(/[.*]{2,}/);
  if (parts.length < 2) return null;
  const prefix = parts[0];
  const suffix = parts[parts.length - 1];
  return prefix.length > 0 && suffix.length > 0 ? [prefix, suffix] : null;
}

function hintMatches(rawKey: string, hint: string): boolean {
  const split = splitHint(hint);
  return !!split && rawKey.startsWith(split[0]) && rawKey.endsWith(split[1]);
}

// Anthropic's own hint is already a short "prefix...suffix" -- fine to
// store as-is. OpenAI's redacted_value instead pads the middle out to the
// original key's full length with a wall of asterisks (100+ chars), which
// blew out the Connections table horizontally when rendered raw. Store
// the compact "prefix...suffix" form for both, not whatever the provider
// happened to send.
function compactHint(hint: string): string {
  const split = splitHint(hint);
  return split ? `${split[0]}...${split[1]}` : hint;
}

async function fetchAnthropicOrgName(apiKey: string): Promise<string | null> {
  try {
    const res = await fetch("https://api.anthropic.com/v1/organizations/me", {
      headers: { "x-api-key": apiKey, "anthropic-version": "2023-06-01" },
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.name ?? null;
  } catch {
    return null;
  }
}

// GET /v1/organizations/api_keys -- Admin API, paginated via after_id/last_id.
// https://platform.claude.com/docs/en/api/admin-api/apikeys/list-api-keys
export async function fetchAnthropicKeyMetadata(apiKey: string): Promise<ProviderKeyMetadata | null> {
  let afterId: string | undefined;

  for (let page = 0; page < 10; page++) {
    const url = new URL("https://api.anthropic.com/v1/organizations/api_keys");
    url.searchParams.set("limit", "1000");
    if (afterId) url.searchParams.set("after_id", afterId);

    const res = await fetch(url, {
      headers: { "x-api-key": apiKey, "anthropic-version": "2023-06-01" },
    });
    if (!res.ok) break;

    const data = await res.json();
    for (const key of data.data ?? []) {
      if (key.partial_key_hint && hintMatches(apiKey, key.partial_key_hint)) {
        return {
          hint: compactHint(key.partial_key_hint),
          name: key.name ?? null,
          status: key.status ?? null,
          createdAt: key.created_at ?? null,
          expiresAt: key.expires_at ?? null,
          owner: key.scope?.type === "workspace" ? key.scope.workspace_id : (key.scope?.type ?? null),
        };
      }
    }

    if (!data.has_more || !data.last_id) break;
    afterId = data.last_id;
  }

  // Admin keys never show up in the list above -- see module comment.
  // Org name is the closest thing to "owner" available for one.
  const orgName = await fetchAnthropicOrgName(apiKey);
  if (!orgName) return null;
  return { hint: null, name: null, status: null, createdAt: null, expiresAt: null, owner: orgName };
}

// GET /v1/organization/admin_api_keys -- Admin API, paginated via after/last_id.
export async function fetchOpenAIKeyMetadata(apiKey: string): Promise<ProviderKeyMetadata | null> {
  let after: string | undefined;

  for (let page = 0; page < 10; page++) {
    const url = new URL("https://api.openai.com/v1/organization/admin_api_keys");
    url.searchParams.set("limit", "100");
    if (after) url.searchParams.set("after", after);

    const res = await fetch(url, { headers: { Authorization: `Bearer ${apiKey}` } });
    if (!res.ok) return null;

    const data = await res.json();
    for (const key of data.data ?? []) {
      if (key.redacted_value && hintMatches(apiKey, key.redacted_value)) {
        return {
          hint: compactHint(key.redacted_value),
          name: key.name ?? null,
          status: null, // not exposed on this endpoint
          createdAt: typeof key.created_at === "number" ? new Date(key.created_at * 1000).toISOString() : null,
          expiresAt: null, // OpenAI admin keys don't expose an expiry here
          owner: key.owner?.name ?? key.owner?.type ?? null,
        };
      }
    }

    if (!data.has_more || !data.last_id) return null;
    after = data.last_id;
  }

  return null;
}
